/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { User } from '../generated/prisma/client';
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
  ): Promise<Omit<User, 'password'> | null> {
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
      return result;
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

  login(user: User) {
    const payload = { email: user.email, sub: user.id };
    return { access_token: this.jwtService.sign(payload) };
  }
}
