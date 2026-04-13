import { Router } from 'express';
import { asyncRoute } from '../../http/asyncRoute.js';
import { extractAccessToken, verifyAccessToken } from '../../middleware/authJwt.js';
import type { AuthService } from './auth.service.js';
import { loginBodySchema, registerBodySchema } from './auth.schemas.js';
import type { SessionCookieConfig } from './sessionCookie.js';
import { sessionCookieClearOptions, sessionCookieSetOptions } from './sessionCookie.js';

export type AuthRouterDeps = {
  authService: AuthService;
  jwtSecret: string;
  nodeEnv: string;
  sessionCookie: SessionCookieConfig;
};

export function createAuthRouter(deps: AuthRouterDeps): Router {
  const r = Router();
  const { name: cookieName } = deps.sessionCookie;
  const setOpts = sessionCookieSetOptions(deps.sessionCookie, deps.nodeEnv);
  const clearOpts = sessionCookieClearOptions(deps.sessionCookie, deps.nodeEnv);

  r.post(
    '/register',
    asyncRoute(async (req, res) => {
      const body = registerBodySchema.parse(req.body);
      const user = await deps.authService.register(body);
      const token = deps.authService.issueAccessToken(user.id);
      res.cookie(cookieName, token, setOpts);
      res.status(201).json({
        user: { id: user.id, email: user.email, name: user.name },
      });
    }),
  );

  r.post(
    '/login',
    asyncRoute(async (req, res) => {
      const body = loginBodySchema.parse(req.body);
      const { user } = await deps.authService.login(body);
      const token = deps.authService.issueAccessToken(user.id);
      res.cookie(cookieName, token, setOpts);
      res.status(200).json({ user });
    }),
  );

  r.get(
    '/me',
    asyncRoute(async (req, res) => {
      const token = extractAccessToken(req, cookieName);
      if (!token) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }
      const session = verifyAccessToken(token, deps.jwtSecret);
      if (!session) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }
      const user = await deps.authService.getUserById(session.sub);
      if (!user) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }
      res.status(200).json({ user });
    }),
  );

  r.post(
    '/logout',
    asyncRoute(async (_req, res) => {
      res.clearCookie(cookieName, clearOpts);
      res.status(204).send();
    }),
  );

  return r;
}
