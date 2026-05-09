import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../auth.types';
import { AuthSessionSettings } from '../auth-session-settings.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    sessionSettings: AuthSessionSettings,
  ) {
    const accessCookieName = sessionSettings.accessCookieName;
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const cookies = request.cookies as
            | Record<string, unknown>
            | undefined;
          const raw = cookies?.[accessCookieName];
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
      organizationType: payload.organizationType ?? 'MAIN',
      organizationSlug: payload.organizationSlug ?? '',
      role: payload.role,
      firstLogin: payload.firstLogin ?? false,
    };
  }
}
