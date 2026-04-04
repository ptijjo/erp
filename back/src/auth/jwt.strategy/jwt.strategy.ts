import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../auth.types';

/** Doit correspondre au nom utilisé dans AuthController (res.cookie / clearCookie). */
const JWT_COOKIE_NAME = 'token';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const cookies = request.cookies as
            | Record<string, unknown>
            | undefined;
          const raw = cookies?.[JWT_COOKIE_NAME];
          return typeof raw === 'string' ? raw : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /** Attache l’utilisateur sur `req.user` (ex. GET /auth/me). */
  validate(payload: AccessTokenPayload) {
    return {
      email: payload.email,
      sub: payload.sub,
      organisationId: payload.organisationId,
      role: payload.role,
      firstLogin: payload.firstLogin ?? false,
    };
  }
}
