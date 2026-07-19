import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  readJwtSubFromAccessCookie,
  resolveThrottleTracker,
} from './throttle-tracker';

/**
 * Rate-limit par utilisateur (cookie JWT) plutôt que seulement par IP,
 * pour qu’un dashboard SPA ne bloque pas dès ~100 appels/min.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request;
    const user = request.user as { sub?: string } | undefined;
    const cookieHeader = request.headers?.cookie;
    const accessCookieName =
      process.env.JWT_ACCESS_COOKIE_NAME?.trim() || 'token';
    const userSub =
      (typeof user?.sub === 'string' ? user.sub : undefined) ??
      readJwtSubFromAccessCookie(cookieHeader, accessCookieName);
    const ip =
      (Array.isArray(request.ips) && request.ips[0]) ||
      request.ip ||
      undefined;
    return resolveThrottleTracker({ userSub, ip });
  }
}
