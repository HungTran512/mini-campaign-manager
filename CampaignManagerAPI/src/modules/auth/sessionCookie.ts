import type { CookieOptions } from 'express';

export type SessionCookieConfig = {
  name: string;
  maxAgeMs: number;
};

/** Options for `res.cookie` / `res.clearCookie` so login + logout stay aligned. */
export function sessionCookieSetOptions(cfg: SessionCookieConfig, nodeEnv: string): CookieOptions {
  const secure = nodeEnv === 'production';
  const sameSite: CookieOptions['sameSite'] = secure ? 'none' : 'lax';
  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: cfg.maxAgeMs,
    path: '/',
  };
}

export function sessionCookieClearOptions(_cfg: SessionCookieConfig, nodeEnv: string): CookieOptions {
  const secure = nodeEnv === 'production';
  const sameSite: CookieOptions['sameSite'] = secure ? 'none' : 'lax';
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  };
}
