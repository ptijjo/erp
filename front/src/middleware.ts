import { NextResponse, type NextRequest } from "next/server";

import {
  isRouteAuthorized,
  routeRequiresProfileCheck,
  type RouteGuardMe,
} from "~/lib/route-guards";

const FIRST_LOGIN_PATH = "/dashboard/first-login";
const UNAUTHORIZED_PATH = "/dashboard/unauthorized";

function accessCookieName(): string {
  const fromEnv = process.env.JWT_ACCESS_COOKIE_NAME?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : "token";
}

function refreshCookieName(): string {
  const fromEnv = process.env.REFRESH_TOKEN_COOKIE_NAME?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : "refresh_token";
}

function apiBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (!url) return null;
  return url.replace(/\/$/, "");
}

/** Recopie les Set-Cookie de la réponse API vers la réponse Next (navigateur). */
function appendSetCookies(from: Response, to: NextResponse): void {
  const getSetCookie = (
    from.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  const cookies =
    typeof getSetCookie === "function" ? getSetCookie.call(from.headers) : [];
  for (const cookie of cookies) {
    to.headers.append("Set-Cookie", cookie);
  }
  // Fallback si getSetCookie absent (ancien runtime)
  if (cookies.length === 0) {
    const single = from.headers.get("set-cookie");
    if (single) {
      to.headers.append("Set-Cookie", single);
    }
  }
}

async function fetchMe(
  baseUrl: string,
  cookieHeader: string,
): Promise<{ me: RouteGuardMe | null; status: number }> {
  try {
    const response = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        Accept: "application/json",
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) {
      return { me: null, status: response.status };
    }

    if (!response.ok) {
      return { me: null, status: response.status };
    }

    const me = (await response.json()) as RouteGuardMe;
    return { me, status: response.status };
  } catch {
    return { me: null, status: 503 };
  }
}

/**
 * Tente un refresh de session. Retourne les Set-Cookie à propager
 * et un Cookie header mis à jour pour les appels suivants dans ce middleware.
 */
async function tryRefreshSession(
  baseUrl: string,
  cookieHeader: string,
): Promise<{ ok: boolean; setCookieResponse: Response | null; cookieHeader: string }> {
  try {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, setCookieResponse: null, cookieHeader };
    }

    // Reconstruit le Cookie header à partir des Set-Cookie (access + refresh).
    const getSetCookie = (
      response.headers as Headers & { getSetCookie?: () => string[] }
    ).getSetCookie;
    const setCookies =
      typeof getSetCookie === "function"
        ? getSetCookie.call(response.headers)
        : [];

    const jar = new Map<string, string>();
    for (const part of cookieHeader.split(";")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      jar.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
    }
    for (const raw of setCookies) {
      const first = raw.split(";")[0]?.trim();
      if (!first) continue;
      const eq = first.indexOf("=");
      if (eq <= 0) continue;
      jar.set(first.slice(0, eq), first.slice(eq + 1));
    }

    const nextCookieHeader = [...jar.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");

    return {
      ok: true,
      setCookieResponse: response,
      cookieHeader: nextCookieHeader,
    };
  } catch {
    return { ok: false, setCookieResponse: null, cookieHeader };
  }
}

function redirectToLogin(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/", request.url));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === FIRST_LOGIN_PATH || pathname === UNAUTHORIZED_PATH) {
    return NextResponse.next();
  }

  const baseUrl = apiBaseUrl();
  if (!baseUrl) {
    return redirectToLogin(request);
  }

  const access = request.cookies.get(accessCookieName())?.value;
  const refresh = request.cookies.get(refreshCookieName())?.value;

  if (!access && !refresh) {
    return redirectToLogin(request);
  }

  let cookieHeader = request.headers.get("cookie") ?? "";
  let sessionRefreshResponse: Response | null = null;

  // Access absent mais refresh présent → tenter de renouveler avant toute garde.
  if (!access && refresh) {
    const refreshed = await tryRefreshSession(baseUrl, cookieHeader);
    if (!refreshed.ok) {
      return redirectToLogin(request);
    }
    sessionRefreshResponse = refreshed.setCookieResponse;
    cookieHeader = refreshed.cookieHeader;
  }

  // Pas de garde profil → laisser passer (éventuellement avec nouveaux cookies).
  if (!routeRequiresProfileCheck(pathname)) {
    const res = NextResponse.next();
    if (sessionRefreshResponse) {
      appendSetCookies(sessionRefreshResponse, res);
    }
    return res;
  }

  let { me, status } = await fetchMe(baseUrl, cookieHeader);

  // Access expiré (ou invalide) → refresh puis rejouer /me.
  if (me === null && (status === 401 || status === 403)) {
    const refreshed = await tryRefreshSession(baseUrl, cookieHeader);
    if (!refreshed.ok) {
      return redirectToLogin(request);
    }
    sessionRefreshResponse = refreshed.setCookieResponse;
    cookieHeader = refreshed.cookieHeader;
    ({ me, status } = await fetchMe(baseUrl, cookieHeader));
    if (me === null && (status === 401 || status === 403)) {
      return redirectToLogin(request);
    }
  }

  if (me && !isRouteAuthorized(pathname, me)) {
    const res = NextResponse.redirect(new URL(UNAUTHORIZED_PATH, request.url));
    if (sessionRefreshResponse) {
      appendSetCookies(sessionRefreshResponse, res);
    }
    return res;
  }

  const res = NextResponse.next();
  if (sessionRefreshResponse) {
    appendSetCookies(sessionRefreshResponse, res);
  }
  return res;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
