import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { UnauthorizedError } from '../http/errors.js';

const payloadSchema = z.object({
  sub: z.string().uuid(),
});

export type AuthJwtMiddlewareOptions = {
  jwtSecret: string;
  /** httpOnly session cookie set on `POST /auth/login`. */
  cookieName: string;
};

export function extractAccessToken(req: Request, cookieName: string): string | null {
  const fromCookie =
    typeof req.cookies === 'object' && req.cookies !== null
      ? String((req.cookies as Record<string, string | undefined>)[cookieName] ?? '').trim()
      : '';
  return fromCookie.length > 0 ? fromCookie : null;
}

export function verifyAccessToken(token: string, jwtSecret: string): { sub: string } | null {
  try {
    const decoded = jwt.verify(token, jwtSecret);
    const parsed = payloadSchema.safeParse(decoded);
    if (!parsed.success) {
      return null;
    }
    return { sub: parsed.data.sub };
  } catch {
    return null;
  }
}

export function createAuthJwtMiddleware(opts: AuthJwtMiddlewareOptions): RequestHandler {
  const { jwtSecret, cookieName } = opts;
  return (req, _res, next) => {
    const token = extractAccessToken(req, cookieName);
    if (!token) {
      next(new UnauthorizedError('Missing session'));
      return;
    }
    const parsed = verifyAccessToken(token, jwtSecret);
    if (!parsed) {
      next(new UnauthorizedError('Invalid token payload'));
      return;
    }
    req.user = { id: parsed.sub };
    next();
  };
}
