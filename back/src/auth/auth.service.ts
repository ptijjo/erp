import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AccessTokenPayload,
  AuthenticatedUser,
  MeResponse,
} from './auth.types';
import type { SafeUserWithRole } from '../user/user.types';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
const MAX_LOGIN_FAILS = Number(process.env.MAX_LOGIN_FAILS);
const BLOCK_SECONDS = Number(process.env.BLOCK_SECONDS);
/** Fenêtre après la 1ʳᵉ erreur pour cumuler les échecs ; au-delà le compteur Redis expire. */
const FAIL_COUNTER_TTL_SECONDS = Number(process.env.FAIL_COUNTER_TTL_SECONDS);

export type LoginContext = {
  ip: string;
  userAgent: string;
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
  ) {}

  private failKey(ip: string) {
    return `login:fail:${ip}`;
  }

  private blockKey(ip: string) {
    return `login:block:${ip}`;
  }

  /**
   * Login local : vérification blocage Redis, validation mot de passe,
   * journal Prisma, compteur d’échecs et blocage IP après MAX_LOGIN_FAILS.
   */
  async validateLogin(
    email: string,
    password: string,
    ctx: LoginContext,
  ): Promise<SafeUserWithRole | null> {
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
      return result satisfies SafeUserWithRole;
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

  login(user: SafeUserWithRole) {
    const payload: AccessTokenPayload = {
      email: user.email,
      sub: user.id,
      organisationId: user.organizationId,
      firstLogin: user.firstLogin,
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
      },
    };
    return { access_token: this.jwtService.sign(payload) };
  }

  /** Première connexion : nouveau mot de passe + `firstLogin` à false + cookie JWT à jour. */
  async completeFirstLogin(
    userId: string,
    password: string,
  ): Promise<{ access_token: string }> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
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
      include: { role: true },
    });
    const { password: _p, ...safe } = updated;
    return this.login(safe satisfies SafeUserWithRole);
  }

  /** Profil pour /auth/me : claims JWT + nom de l’organisation (lookup Prisma). */
  async getMeProfile(jwtUser: AuthenticatedUser): Promise<MeResponse> {
    const row = await this.prisma.user.findUnique({
      where: { id: jwtUser.sub },
      select: {
        firstLogin: true,
        organization: { select: { name: true } },
      },
    });
    if (!row?.organization) {
      throw new NotFoundException('Utilisateur ou organisation introuvable');
    }
    return {
      ...jwtUser,
      organisationName: row.organization.name,
      firstLogin: row.firstLogin,
    };
  }
}
