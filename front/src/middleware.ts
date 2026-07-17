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

function apiBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (!url) return null;
  return url.replace(/\/$/, "");
}

async function fetchMe(request: NextRequest): Promise<{
  me: RouteGuardMe | null;
  status: number;
}> {
  const baseUrl = apiBaseUrl();
  if (!baseUrl) {
    return { me: null, status: 500 };
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === FIRST_LOGIN_PATH || pathname === UNAUTHORIZED_PATH) {
    return NextResponse.next();
  }

  const token = request.cookies.get(accessCookieName())?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Évite un round-trip `/auth/me` sur chaque navigation : seulement si une garde existe.
  if (!routeRequiresProfileCheck(pathname)) {
    return NextResponse.next();
  }

  const { me, status } = await fetchMe(request);
  if (me === null && (status === 401 || status === 403)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (me && !isRouteAuthorized(pathname, me)) {
    return NextResponse.redirect(new URL(UNAUTHORIZED_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
