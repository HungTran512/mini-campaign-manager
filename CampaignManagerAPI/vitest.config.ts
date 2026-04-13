import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    fileParallelism: false,
    poolOptions: { threads: { singleThread: true } },
    env: {
      DATABASE_URL: 'postgresql://example:example@127.0.0.1:5432/example',
      JWT_SECRET: '01234567890123456789012345678901',
      NODE_ENV: 'test',
    },
  },
});
