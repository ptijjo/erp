import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { AccessTokenPayload, AuthenticatedUser } from '../auth.types';
import { AuthSessionSettings } from '../auth-session-settings.service';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    sessionSettings: AuthSessionSettings,
    private readonly authService: AuthService,
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

  /** Charge l’utilisateur en base : le JWT ne contient que `sub`. */
  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub?.trim()) {
      throw new UnauthorizedException();
    }
    return this.authService.resolveAuthenticatedUser(payload.sub);
  }
}
