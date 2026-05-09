import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AccessTokenPayload,
  AuthenticatedUser,
  MeResponse,
} from './auth.types';
import type { SafeUserWithRoleAndOrg } from '../user/user.types';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'node:crypto';
import { AuthSessionSettings } from './auth-session-settings.service';
import { isFullAccessRoleName } from '../casl/define-ability';

function envPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Nombre d’échecs avant blocage IP (défaut si env absent ou invalide). */
const MAX_LOGIN_FAILS = envPositiveInt('MAX_LOGIN_FAILS', 5);
/** Durée du blocage Redis après trop d’échecs (secondes). */
const BLOCK_SECONDS = envPositiveInt('BLOCK_SECONDS', 900);
/** Fenêtre après la 1ʳᵉ erreur pour cumuler les échecs ; au-delà le compteur Redis expire. */
const FAIL_COUNTER_TTL_SECONDS = envPositiveInt('FAIL_COUNTER_TTL_SECONDS', 900);

export type LoginContext = {
  ip: string;
  userAgent: string;
};

export type SessionTokens = {
  access_token: string;
  refresh_token: string;
  /** Pour `Set-Cookie` `maxAge` (ms), aligné sur `REFRESH_TOKEN_TTL_SECONDS`. */
  refresh_cookie_max_age_ms: number;
};

export type {
  AccessTokenPayload,
  AuthenticatedUser,
  JwtRoleClaims,
  MeResponse,
} from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sessionSettings: AuthSessionSettings,
  ) {}

  private failKey(ip: string) {
    return `login:fail:${ip}`;
  }

  private blockKey(ip: string) {
    return `login:block:${ip}`;
  }

  /** Durée de vie du JWT d’accès (secondes). `JWT_ACCESS_EXPIRES_SECONDS`, défaut 900 (15 min). */
  private accessExpiresSeconds(): number {
    const raw = this.config.get<string>('JWT_ACCESS_EXPIRES_SECONDS')?.trim();
    const n = raw ? Number.parseInt(raw, 10) : NaN;
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
    return 15 * 60;
  }

  private refreshTtlSeconds(): number {
    const raw = this.config.get<string>('REFRESH_TOKEN_TTL_SECONDS')?.trim();
    const n = raw ? Number.parseInt(raw, 10) : NaN;
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
    return 7 * 24 * 3600;
  }

  private buildAccessPayload(user: SafeUserWithRoleAndOrg): AccessTokenPayload {
    return {
      email: user.email,
      sub: user.id,
      organisationId: user.organizationId,
      organizationType: user.organization.organizationType,
      organizationSlug: user.organization.slug,
      firstLogin: user.firstLogin,
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
      },
    };
  }

  /**
   * Login local : vérification blocage Redis, validation mot de passe,
   * journal Prisma, compteur d’échecs et blocage IP après MAX_LOGIN_FAILS.
   */
  async validateLogin(
    email: string,
    password: string,
    ctx: LoginContext,
  ): Promise<SafeUserWithRoleAndOrg | null> {
    if (await this.redis.exists(this.blockKey(ctx.ip))) {
      throw new HttpException(
        'Too many failed login attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.userService.findUser(email);
    const passwordOk =
      !!user?.password && (await bcrypt.compare(password, user.password));

    if (passwordOk && user) {
      await this.prisma.loginAttempt.create({
        data: {
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
          userId: user.id,
          success: true,
        },
      });
      await this.redis.del(this.failKey(ctx.ip));
      await this.redis.del(this.blockKey(ctx.ip));
      const { password: _p, ...result } = user;
      return result satisfies SafeUserWithRoleAndOrg;
    }

    await this.prisma.loginAttempt.create({
      data: {
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        userId: user?.id ?? null,
        success: false,
      },
    });

    const fails = await this.redis.incr(this.failKey(ctx.ip));
    if (fails === 1) {
      await this.redis.expire(this.failKey(ctx.ip), FAIL_COUNTER_TTL_SECONDS);
    }
    if (fails >= MAX_LOGIN_FAILS) {
      await this.redis.setEx(this.blockKey(ctx.ip), BLOCK_SECONDS, '1');
      await this.redis.del(this.failKey(ctx.ip));
    }

    return null;
  }

  /**
   * Émet une paire access (JWT court) + refresh (opaque, Redis avec TTL).
   */
  async issueSession(user: SafeUserWithRoleAndOrg): Promise<SessionTokens> {
    const payload = this.buildAccessPayload(user);
    const access_token = this.jwtService.sign(payload, {
      expiresIn: this.accessExpiresSeconds(),
    });
    const refresh_token = await this.createAndStoreRefreshToken(user.id);
    const ttl = this.refreshTtlSeconds();
    return {
      access_token,
      refresh_token,
      refresh_cookie_max_age_ms: ttl * 1000,
    };
  }

  private async createAndStoreRefreshToken(userId: string): Promise<string> {
    const refresh_token = randomBytes(48).toString('hex');
    const key = this.sessionSettings.refreshRedisKey(refresh_token);
    await this.redis.setEx(key, this.refreshTtlSeconds(), userId);
    return refresh_token;
  }

  /**
   * Consomme le refresh (rotation), recharge l’utilisateur en base (rôle à jour)
   * et émet une nouvelle paire de jetons.
   */
  async refreshWithRotation(
    refreshToken: string | undefined,
  ): Promise<SessionTokens> {
    const trimmed =
      typeof refreshToken === 'string' ? refreshToken.trim() : '';
    if (!trimmed) {
      throw new UnauthorizedException();
    }
    const key = this.sessionSettings.refreshRedisKey(trimmed);
    const userId = await this.redis.getDel(key);
    if (!userId) {
      throw new UnauthorizedException();
    }
    const row = await this.userService.findUserByIdWithRoleAndOrg(userId);
    if (!row?.password) {
      throw new UnauthorizedException();
    }
    const { password: _p, ...safe } = row;
    return this.issueSession(safe satisfies SafeUserWithRoleAndOrg);
  }

  /** Révoque un refresh encore présent en Redis (ex. déconnexion). */
  async revokeRefreshToken(refreshToken: string | undefined): Promise<void> {
    const trimmed =
      typeof refreshToken === 'string' ? refreshToken.trim() : '';
    if (!trimmed) {
      return;
    }
    await this.redis.del(this.sessionSettings.refreshRedisKey(trimmed));
  }

  async login(user: SafeUserWithRoleAndOrg): Promise<SessionTokens> {
    return this.issueSession(user);
  }

  /** Première connexion : nouveau mot de passe + `firstLogin` à false + cookies à jour. */
  async completeFirstLogin(
    userId: string,
    password: string,
  ): Promise<SessionTokens> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            organizationType: true,
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    if (!row.firstLogin) {
      throw new BadRequestException(
        'Votre mot de passe est déjà défini. Utilisez la connexion habituelle.',
      );
    }
    const hashed = await bcrypt.hash(
      password,
      Number(process.env.PASSWORD_ROUNDS),
    );
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, firstLogin: false },
      include: {
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            organizationType: true,
          },
        },
      },
    });
    const { password: _p, ...safe } = updated;
    return this.issueSession(safe satisfies SafeUserWithRoleAndOrg);
  }

  /** Profil pour /auth/me : claims JWT + nom de l’organisation (lookup Prisma). */
  async getMeProfile(jwtUser: AuthenticatedUser): Promise<MeResponse> {
    const row = await this.prisma.user.findUnique({
      where: { id: jwtUser.sub },
      select: {
        firstLogin: true,
        organization: {
          select: { name: true, slug: true, organizationType: true },
        },
      },
    });
    if (!row?.organization) {
      throw new NotFoundException('Utilisateur ou organisation introuvable');
    }
    const permissionSnapshot = await this.resolvePermissionSnapshot(jwtUser);
    return {
      ...jwtUser,
      organisationName: row.organization.name,
      organizationSlug: row.organization.slug,
      organizationType: row.organization.organizationType,
      firstLogin: row.firstLogin,
      permissionMode: permissionSnapshot.permissionMode,
      permissions: permissionSnapshot.permissions,
    };
  }

  private async resolvePermissionSnapshot(jwtUser: AuthenticatedUser): Promise<{
    permissionMode: 'FULL_ACCESS' | 'ROLE_PERMISSIONS' | 'FALLBACK_READ_ALL';
    permissions: string[];
  }> {
    if (isFullAccessRoleName(jwtUser.role.name)) {
      return {
        permissionMode: 'FULL_ACCESS',
        permissions: ['manage:all', 'read:AuditLog'].sort((a, b) =>
          a.localeCompare(b, 'fr'),
        ),
      };
    }

    const links = await this.prisma.permissionRole.findMany({
      where: { roleId: jwtUser.role.id },
      select: { permission: { select: { name: true } } },
    });

    const permissionNames = new Set<string>();
    for (const link of links) {
      const name = link.permission.name.trim();
      if (name) {
        permissionNames.add(name);
      }
    }

    if (jwtUser.organizationType === 'MAIN') {
      permissionNames.add('read:all');
    }

    if (permissionNames.size === 0) {
      return {
        permissionMode: 'FALLBACK_READ_ALL',
        permissions: ['read:all'],
      };
    }

    return {
      permissionMode: 'ROLE_PERMISSIONS',
      permissions: [...permissionNames].sort((a, b) => a.localeCompare(b, 'fr')),
    };
  }
}
