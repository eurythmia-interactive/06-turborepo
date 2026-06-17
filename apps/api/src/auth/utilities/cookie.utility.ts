import type { Response } from 'express';

export interface CookieConfig {
  secure: boolean;
  maxAge: number;
}

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const REFRESH_TOKEN_PATH = '/api/v1/auth/refresh';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function setRefreshTokenCookie(
  response: Response,
  token: string,
  config: CookieConfig,
): void {
  response.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: config.secure,
    sameSite: 'lax',
    path: REFRESH_TOKEN_PATH,
    maxAge: config.maxAge || SEVEN_DAYS_MS,
  });
}

export function clearRefreshTokenCookie(response: Response): void {
  response.cookie(REFRESH_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: REFRESH_TOKEN_PATH,
    expires: new Date(0),
  });
}

export function getRefreshTokenFromCookie(
  cookies: Record<string, string> | undefined,
): string | null {
  return cookies?.[REFRESH_TOKEN_COOKIE] ?? null;
}
