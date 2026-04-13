import { Router } from 'express';
import { asyncRoute } from '../../http/asyncRoute.js';
import { createAuthJwtMiddleware } from '../../middleware/authJwt.js';
import type { RecipientsService } from './recipients.service.js';
import { createRecipientBodySchema, listRecipientsQuerySchema } from './recipients.schemas.js';

export type RecipientsRouterDeps = {
  recipientsService: RecipientsService;
  jwtSecret: string;
  cookieName: string;
};

/** `GET /recipients` — mounted at `/recipients`. */
export function createRecipientsListRouter(deps: RecipientsRouterDeps): Router {
  const r = Router();
  const auth = createAuthJwtMiddleware({ jwtSecret: deps.jwtSecret, cookieName: deps.cookieName });
  r.use(auth);

  r.get(
    '/',
    asyncRoute(async (req, res) => {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }
      const q = listRecipientsQuerySchema.parse(req.query);
      const out = await deps.recipientsService.list(q.limit, q.cursor);
      res.status(200).json(out);
    }),
  );

  return r;
}

export type RecipientCreateRouterDeps = {
  recipientsService: RecipientsService;
  jwtSecret: string;
  cookieName: string;
};

/** `POST /recipient` — mounted at `/recipient` (body on `/`). */
export function createRecipientCreateRouter(deps: RecipientCreateRouterDeps): Router {
  const r = Router();
  const auth = createAuthJwtMiddleware({ jwtSecret: deps.jwtSecret, cookieName: deps.cookieName });
  r.use(auth);

  r.post(
    '/',
    asyncRoute(async (req, res) => {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }
      const body = createRecipientBodySchema.parse(req.body);
      const created = await deps.recipientsService.create(body);
      res.status(201).json(created);
    }),
  );

  return r;
}
