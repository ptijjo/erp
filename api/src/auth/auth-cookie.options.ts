import type { CookieOptions } from 'express';

/** Options cookies session : `secure` uniquement en production (Supertest / dev local en HTTP). */
export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}
