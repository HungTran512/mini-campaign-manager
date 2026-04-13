import { Router } from 'express';
import { asyncRoute } from '../../http/asyncRoute.js';
import { BadRequestError } from '../../http/errors.js';
import { createAuthJwtMiddleware } from '../../middleware/authJwt.js';
import type { CampaignsService } from './campaigns.service.js';
import {
  campaignIdParamSchema,
  createCampaignBodySchema,
  listCampaignsQuerySchema,
  patchCampaignBodySchema,
  scheduleCampaignBodySchema,
} from './campaigns.schemas.js';

function parseCampaignId(raw: unknown): string {
  const r = campaignIdParamSchema.safeParse(raw);
  if (!r.success) {
    throw new BadRequestError('Invalid campaign id', 'BAD_REQUEST');
  }
  return r.data;
}

export type CampaignsRouterDeps = {
  campaignsService: CampaignsService;
  jwtSecret: string;
  cookieName: string;
};

export function createCampaignsRouter(deps: CampaignsRouterDeps): Router {
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
      const body = createCampaignBodySchema.parse(req.body);
      const campaign = await deps.campaignsService.create(userId, body);
      res.status(201).json(campaign);
    }),
  );

  r.get(
    '/',
    asyncRoute(async (req, res) => {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }
      const q = listCampaignsQuerySchema.parse(req.query);
      const out = await deps.campaignsService.list(userId, q.limit, q.cursor);
      res.status(200).json(out);
    }),
  );

  r.get(
    '/overview',
    asyncRoute(async (req, res) => {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }
      const overview = await deps.campaignsService.getDashboardOverview(userId);
      res.status(200).json(overview);
    }),
  );

  r.get(
    '/:id/stats',
    asyncRoute(async (req, res) => {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }
      const id = parseCampaignId(req.params.id);
      const stats = await deps.campaignsService.getStats(userId, id);
      if (!stats) {
        res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
        return;
      }
      res.status(200).json(stats);
    }),
  );

  r.get(
    '/:id',
    asyncRoute(async (req, res) => {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }
      const id = parseCampaignId(req.params.id);
      const detail = await deps.campaignsService.getDetail(userId, id);
      if (!detail) {
        res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
        return;
      }
      res.status(200).json(detail);
    }),
  );

  r.patch(
    '/:id',
    asyncRoute(async (req, res) => {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }
      const id = parseCampaignId(req.params.id);
      const body = patchCampaignBodySchema.parse(req.body);
      const updated = await deps.campaignsService.patchDraft(userId, id, body);
      res.status(200).json(updated);
    }),
  );

  r.delete(
    '/:id',
    asyncRoute(async (req, res) => {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }
      const id = parseCampaignId(req.params.id);
      await deps.campaignsService.softDelete(userId, id);
      res.status(204).send();
    }),
  );

  r.post(
    '/:id/schedule',
    asyncRoute(async (req, res) => {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }
      const id = parseCampaignId(req.params.id);
      const body = scheduleCampaignBodySchema.parse(req.body);
      const updated = await deps.campaignsService.schedule(userId, id, body);
      res.status(200).json(updated);
    }),
  );

  r.post(
    '/:id/send',
    asyncRoute(async (req, res) => {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }
      const id = parseCampaignId(req.params.id);
      const payload = await deps.campaignsService.send(userId, id);
      res.status(200).json(payload);
    }),
  );

  return r;
}
