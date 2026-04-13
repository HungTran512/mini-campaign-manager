import { Pool } from 'pg';
import type { Env } from '../config/env.js';

export function createPgPool(env: Pick<Env, 'DATABASE_URL'>): Pool {
  return new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}
