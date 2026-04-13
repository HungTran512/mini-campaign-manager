import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65_535).default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  MAX_RECIPIENTS_PER_CAMPAIGN: z.coerce.number().int().positive().max(100_000).default(10_000),
  COOKIE_NAME: z.string().min(1).default('access_token'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(fields)}`);
  }
  return parsed.data;
}
