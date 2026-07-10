import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const SENSITIVE_KEYS = new Set([
  'password',
  'refresh_token',
  'access_token',
  'refreshToken',
  'accessToken',
]);

function stripSensitive(value: unknown): unknown {
  if (value == null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(stripSensitive);
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      continue;
    }
    out[key] = stripSensitive(val);
  }
  return out;
}

/** Retire les champs sensibles des réponses API (mot de passe, tokens). */
@Injectable()
export class SensitiveFieldsInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map((data) => stripSensitive(data)));
  }
}
