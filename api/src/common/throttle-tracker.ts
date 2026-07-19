/**
 * Clé de rate-limit : utilisateur authentifié si possible, sinon IP.
 * Évite qu’un SPA chatty (dashboard) tombe en 429 à ~120 req/min.
 */

export function resolveThrottleTracker(input: {
  userSub?: string;
  ip?: string;
}): string {
  const sub = input.userSub?.trim();
  if (sub) {
    return `user:${sub}`;
  }
  const ip = input.ip?.trim();
  return `ip:${ip && ip.length > 0 ? ip : 'unknown'}`;
}

/**
 * Lecture non vérifiée du `sub` JWT (uniquement pour bucket rate-limit).
 * La vérif crypto reste au JwtAuthGuard.
 */
export function readJwtSubFromAccessCookie(
  cookieHeader: string | undefined,
  accessCookieName: string,
): string | undefined {
  if (!cookieHeader || !accessCookieName) {
    return undefined;
  }
  const parts = cookieHeader.split(';');
  let raw: string | undefined;
  for (const part of parts) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    if (name !== accessCookieName) continue;
    raw = trimmed.slice(eq + 1).trim();
    break;
  }
  if (!raw) {
    return undefined;
  }
  const segments = raw.split('.');
  if (segments.length < 2) {
    return undefined;
  }
  try {
    const json = Buffer.from(segments[1]!, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as { sub?: unknown };
    return typeof payload.sub === 'string' && payload.sub.length > 0
      ? payload.sub
      : undefined;
  } catch {
    return undefined;
  }
}
