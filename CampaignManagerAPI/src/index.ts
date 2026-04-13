import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createPgPool } from './db/pool.js';

const env = loadEnv();
const pool = createPgPool(env);
const app = createApp({ pool, env });

const server = app.listen(env.PORT, () => {
  console.log(`Listening on http://127.0.0.1:${String(env.PORT)}`);
});

async function shutdown(): Promise<void> {
  server.close();
  await pool.end();
}

process.on('SIGINT', () => {
  void shutdown().then(() => process.exit(0));
});
process.on('SIGTERM', () => {
  void shutdown().then(() => process.exit(0));
});
