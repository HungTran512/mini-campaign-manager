/**
 * Connects to the default `postgres` database and creates the target database
 * from DATABASE_URL if it is missing (fixes FATAL 3D000).
 */
import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(__dirname, '..', '.env') });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

function adminConnectionUrl(databaseUrl: string, maintenanceDb: string): string {
  const u = new URL(databaseUrl);
  const safe = /^[a-zA-Z0-9_-]+$/u;
  if (!safe.test(maintenanceDb)) {
    throw new Error('Invalid maintenance database name');
  }
  u.pathname = `/${maintenanceDb}`;
  return u.toString();
}

function targetDatabaseName(databaseUrl: string): string {
  const u = new URL(databaseUrl);
  const segments = u.pathname.replace(/^\/+/u, '').split('/').filter(Boolean);
  if (segments.length !== 1) {
    throw new Error('DATABASE_URL path must be exactly one database name');
  }
  return decodeURIComponent(segments[0]!);
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/gu, '""')}"`;
}

async function main(): Promise<void> {
  const { DATABASE_URL } = envSchema.parse(process.env);
  const dbName = targetDatabaseName(DATABASE_URL);

  const adminUrl = adminConnectionUrl(DATABASE_URL, 'postgres');
  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (exists.rowCount && exists.rowCount > 0) {
      console.log(`Database "${dbName}" already exists.`);
      return;
    }
    await client.query(`CREATE DATABASE ${quoteIdent(dbName)}`);
    console.log(`Created database "${dbName}".`);
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
