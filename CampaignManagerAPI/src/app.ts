import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import type { Pool } from 'pg';
import type { Env } from './config/env.js';
import { jwtExpiresToMs } from './http/jwtExpiresToMs.js';
import { errorHandler } from './middleware/errorHandler.js';
import { PgAuthUserRepository } from './modules/auth/auth.repository.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { AuthService } from './modules/auth/auth.service.js';
import { PgCampaignRepository } from './modules/campaigns/campaigns.repository.js';
import { createCampaignsRouter } from './modules/campaigns/campaigns.routes.js';
import { CampaignsService } from './modules/campaigns/campaigns.service.js';
import { PgRecipientRepository } from './modules/recipients/recipients.repository.js';
import {
  createRecipientCreateRouter,
  createRecipientsListRouter,
} from './modules/recipients/recipients.routes.js';
import { RecipientsService } from './modules/recipients/recipients.service.js';

export type AppDependencies = {
  pool: Pool;
  env: Env;
};

/**
 * Composes middleware and route modules. Dependencies are injected for tests
 * and to keep constructors small (composition root).
 */
export function createApp(deps: AppDependencies): Express {
  const app = express();

  app.use(
    cors({
      origin: deps.env.CORS_ORIGIN === '*' ? true : deps.env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  const authRepo = new PgAuthUserRepository(deps.pool);
  const authService = new AuthService(authRepo, {
    jwtSecret: deps.env.JWT_SECRET,
    jwtExpiresIn: deps.env.JWT_EXPIRES_IN,
  });
  app.use(
    '/auth',
    createAuthRouter({
      authService,
      jwtSecret: deps.env.JWT_SECRET,
      nodeEnv: deps.env.NODE_ENV,
      sessionCookie: {
        name: deps.env.COOKIE_NAME,
        maxAgeMs: jwtExpiresToMs(deps.env.JWT_EXPIRES_IN),
      },
    }),
  );

  const campaignRepo = new PgCampaignRepository(deps.pool);
  const campaignsService = new CampaignsService(campaignRepo, {
    maxRecipientsPerCampaign: deps.env.MAX_RECIPIENTS_PER_CAMPAIGN,
  });
  app.use(
    '/campaigns',
    createCampaignsRouter({
      campaignsService,
      jwtSecret: deps.env.JWT_SECRET,
      cookieName: deps.env.COOKIE_NAME,
    }),
  );

  const recipientRepo = new PgRecipientRepository(deps.pool);
  const recipientsService = new RecipientsService(recipientRepo);
  app.use(
    '/recipients',
    createRecipientsListRouter({
      recipientsService,
      jwtSecret: deps.env.JWT_SECRET,
      cookieName: deps.env.COOKIE_NAME,
    }),
  );
  app.use(
    '/recipient',
    createRecipientCreateRouter({
      recipientsService,
      jwtSecret: deps.env.JWT_SECRET,
      cookieName: deps.env.COOKIE_NAME,
    }),
  );

  app.use(errorHandler);
  return app;
}
