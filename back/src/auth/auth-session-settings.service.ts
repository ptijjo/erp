import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Noms de cookies et préfixe Redis pour les sessions : lus depuis l’environnement
 * avec les mêmes valeurs par défaut qu’auparavant (`auth.constants.ts`).
 */
@Injectable()
export class AuthSessionSettings {
  constructor(private readonly config: ConfigService) {}

  get accessCookieName(): string {
    const v = this.config.get<string>('JWT_ACCESS_COOKIE_NAME')?.trim();
    return v && v.length > 0 ? v : 'token';
  }

  get refreshCookieName(): string {
    const v = this.config.get<string>('REFRESH_TOKEN_COOKIE_NAME')?.trim();
    return v && v.length > 0 ? v : 'refresh_token';
  }

  /** Clé Redis pour un jeton de refresh opaque (ex. `refresh:` + token). */
  refreshRedisKey(refreshToken: string): string {
    let prefix =
      this.config.get<string>('REFRESH_SESSION_REDIS_PREFIX')?.trim() || 'refresh:';
    if (!prefix.endsWith(':')) {
      prefix = `${prefix}:`;
    }
    return `${prefix}${refreshToken}`;
  }
}
