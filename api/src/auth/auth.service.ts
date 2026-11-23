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
  SafeUserForSession,
} from './auth.types';
import { toAuthenticatedUser } from './auth.types';
import { UserService } from '../user/user.service';
import type { UserWithRoleAndOrg } from '../user/user.types';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'node:crypto';
import { AuthSessionSettings } from './auth-session-settings.service';
import { subsidiaryHasAssignedSalesCatalog } from '../product/product-subsidiary-scope.util';
import { isFullAccessRoleName, authUserCacheKey } from '../casl/define-ability';
import { AppCacheService } from '../cache/app-cache.service';
import { passwordMatches } from './auth-password';

const AUTH_USER_CACHE_TTL_SECONDS = 300;

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
const FAIL_COUNTER_TTL_SECONDS = envPositiveInt(
  'FAIL_COUNTER_TTL_SECONDS',
  900,
);

function parseRefreshSessionValue(raw: string): {
  userId: string;
  familyId: string | null;
} {
  const sep = raw.indexOf('|');
  if (sep <= 0 || sep >= raw.length - 1) {
    return { userId: raw, familyId: null };
  }
  return { userId: raw.slice(0, sep), familyId: raw.slice(sep + 1) };
}

function formatRefreshSessionValue(userId: string, familyId: string): string {
  return `${userId}|${familyId}`;
}

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
    private readonly cache: AppCacheService,
  ) {}

  private failKey(ip: string) {
    return `login:fail:${ip}`;
  }

  private blockKey(ip: string) {
    return `login:block:${ip}`;
  }

  /** Durée de vie du JWT d’accès (secondes). `JWT_ACCESS_EXPIRES_SECONDS`, défaut 3600 (1 h). */
  private accessExpiresSeconds(): number {
    const raw = this.config.get<string>('JWT_ACCESS_EXPIRES_SECONDS')?.trim();
    const n = raw ? Number.parseInt(raw, 10) : NaN;
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
    return 60 * 60;
  }

  private refreshTtlSeconds(): number {
    const raw = this.config.get<string>('REFRESH_TOKEN_TTL_SECONDS')?.trim();
    const n = raw ? Number.parseInt(raw, 10) : NaN;
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
    return 7 * 24 * 3600;
  }

  private buildAccessPayload(user: SafeUserForSession): AccessTokenPayload {
    return { sub: user.id };
  }

  private toSessionUser(row: UserWithRoleAndOrg): SafeUserForSession {
    const { password: _p, role, organization, ...rest } = row;
    return {
      ...rest,
      organization,
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
        pole: role.pole ? { code: role.pole.code } : null,
      },
    };
  }

  /** Recharge l’utilisateur en base (rôle, pôle, organisation à jour). */
  async resolveAuthenticatedUser(userId: string): Promise<AuthenticatedUser> {
    const cacheKey = authUserCacheKey(userId);
    const cached = await this.cache.getJson<AuthenticatedUser>(cacheKey);
    if (cached) {
      return cached;
    }

    const row = await this.userService.findUserByIdWithRoleAndOrg(userId);
    if (!row?.password) {
      throw new UnauthorizedException();
    }
    const user = toAuthenticatedUser(this.toSessionUser(row));
    await this.cache.setJson(cacheKey, user, AUTH_USER_CACHE_TTL_SECONDS);
    return user;
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.cache.del(authUserCacheKey(userId));
  }

  /**
   * Login local : vérification blocage Redis, validation mot de passe,
   * journal Prisma, compteur d’échecs et blocage IP après MAX_LOGIN_FAILS.
   */
  async validateLogin(
    email: string,
    password: string,
    ctx: LoginContext,
  ): Promise<SafeUserForSession | null> {
    if (await this.redis.exists(this.blockKey(ctx.ip))) {
      throw new HttpException(
        'Too many failed login attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.userService.findUser(email);
    const passwordOk = await passwordMatches(password, user?.password);

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
      return this.toSessionUser(user);
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
  async issueSession(
    user: SafeUserForSession,
    familyId?: string,
  ): Promise<SessionTokens> {
    const payload = this.buildAccessPayload(user);
    const access_token = this.jwtService.sign(payload, {
      expiresIn: this.accessExpiresSeconds(),
    });
    const refresh_token = await this.createAndStoreRefreshToken(
      user.id,
      familyId,
    );
    const ttl = this.refreshTtlSeconds();
    return {
      access_token,
      refresh_token,
      refresh_cookie_max_age_ms: ttl * 1000,
    };
  }

  private familyKey(familyId: string): string {
    return `refresh-family:${familyId}`;
  }

  private tombKey(refreshToken: string): string {
    return `refresh-tomb:${refreshToken}`;
  }

  private async createAndStoreRefreshToken(
    userId: string,
    familyId?: string,
  ): Promise<string> {
    const family = familyId ?? randomBytes(16).toString('hex');
    const refresh_token = randomBytes(48).toString('hex');
    const ttl = this.refreshTtlSeconds();
    const key = this.sessionSettings.refreshRedisKey(refresh_token);
    await this.redis.setEx(key, ttl, formatRefreshSessionValue(userId, family));
    const familyKey = this.familyKey(family);
    await this.redis.sAdd(familyKey, refresh_token);
    await this.redis.expire(familyKey, ttl);
    return refresh_token;
  }

  /**
   * Consomme le refresh (rotation). Une réutilisation du jeton déjà consommé
   * révoque toute la famille, donc la session émise à l’autre détenteur.
   */
  async refreshWithRotation(
    refreshToken: string | undefined,
  ): Promise<SessionTokens> {
    const trimmed = typeof refreshToken === 'string' ? refreshToken.trim() : '';
    if (!trimmed) {
      throw new UnauthorizedException();
    }
    const key = this.sessionSettings.refreshRedisKey(trimmed);
    const current = await this.redis.getDel(key);
    if (!current) {
      const reusedFamily = await this.redis.get(this.tombKey(trimmed));
      if (reusedFamily) {
        await this.revokeRefreshFamily(reusedFamily);
      }
      throw new UnauthorizedException();
    }

    const parsed = parseRefreshSessionValue(current);
    const familyId = parsed.familyId ?? randomBytes(16).toString('hex');
    const ttl = this.refreshTtlSeconds();
    await this.redis.setEx(this.tombKey(trimmed), ttl, familyId);
    if (parsed.familyId) {
      await this.redis.sRem(this.familyKey(parsed.familyId), trimmed);
    }

    const row = await this.userService.findUserByIdWithRoleAndOrg(
      parsed.userId,
    );
    if (!row?.password) {
      throw new UnauthorizedException();
    }
    return this.issueSession(this.toSessionUser(row), familyId);
  }

  private async revokeRefreshFamily(familyId: string): Promise<void> {
    const tokens = await this.redis.sMembers(this.familyKey(familyId));
    for (const token of tokens) {
      await this.redis.del(this.sessionSettings.refreshRedisKey(token));
    }
    await this.redis.del(this.familyKey(familyId));
  }

  /** Révoque un refresh encore présent en Redis (ex. déconnexion). */
  async revokeRefreshToken(refreshToken: string | undefined): Promise<void> {
    const trimmed = typeof refreshToken === 'string' ? refreshToken.trim() : '';
    if (!trimmed) {
      return;
    }
    const key = this.sessionSettings.refreshRedisKey(trimmed);
    const current = await this.redis.get(key);
    await this.redis.del(key);
    if (!current) {
      return;
    }
    const { familyId } = parseRefreshSessionValue(current);
    if (familyId) {
      await this.redis.sRem(this.familyKey(familyId), trimmed);
    }
  }

  async login(user: SafeUserForSession): Promise<SessionTokens> {
    return this.issueSession(user);
  }

  /** Première connexion : nouveau mot de passe + `firstLogin` à false + cookies à jour. */
  async completeFirstLogin(
    userId: string,
    password: string,
  ): Promise<SessionTokens> {
    const row = await this.userService.findUserByIdWithRoleAndOrg(userId);
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
      include: UserService.sessionInclude,
    });
    await this.invalidateUserCache(userId);
    return this.issueSession(this.toSessionUser(updated));
  }

  /** Profil pour /auth/me : rechargé depuis la base (JWT = id uniquement). */
  async getMeProfile(userId: string): Promise<MeResponse> {
    const jwtUser = await this.resolveAuthenticatedUser(userId);
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstLogin: true,
        organization: { select: { name: true } },
      },
    });
    if (!row?.organization) {
      throw new NotFoundException('Utilisateur ou organisation introuvable');
    }
    const permissionSnapshot = await this.resolvePermissionSnapshot(jwtUser);
    const hasSalesCatalog =
      jwtUser.organizationType === 'MAIN'
        ? true
        : await subsidiaryHasAssignedSalesCatalog(
            this.prisma,
            jwtUser.organisationId,
          );
    return {
      ...jwtUser,
      firstLogin: row.firstLogin,
      organisationName: row.organization.name,
      permissionMode: permissionSnapshot.permissionMode,
      permissions: permissionSnapshot.permissions,
      hasSalesCatalog,
    };
  }

  private async resolvePermissionSnapshot(jwtUser: AuthenticatedUser): Promise<{
    permissionMode: 'FULL_ACCESS' | 'ROLE_PERMISSIONS' | 'NO_PERMISSIONS';
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

    if (permissionNames.size === 0) {
      return {
        permissionMode: 'NO_PERMISSIONS',
        permissions: [],
      };
    }

    return {
      permissionMode: 'ROLE_PERMISSIONS',
      permissions: [...permissionNames].sort((a, b) =>
        a.localeCompare(b, 'fr'),
      ),
    };
  }
}
