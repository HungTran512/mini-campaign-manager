import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { createApp } from '../src/app.js';
import type { Env } from '../src/config/env.js';

describe('GET /health', () => {
  it('returns 200 without touching the database', async () => {
    const pool = {
      query: vi.fn(),
      connect: vi.fn(),
      end: vi.fn().mockResolvedValue(undefined),
    } as unknown as Pool;

    const env: Env = {
      NODE_ENV: 'test',
      PORT: 3000,
      DATABASE_URL: 'postgresql://example:example@127.0.0.1:5432/example',
      JWT_SECRET: '01234567890123456789012345678901',
      JWT_EXPIRES_IN: '7d',
      CORS_ORIGIN: '*',
      MAX_RECIPIENTS_PER_CAMPAIGN: 10_000,
      COOKIE_NAME: 'access_token',
    };

    const app = createApp({ pool, env });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(pool.query).not.toHaveBeenCalled();
  });
});
