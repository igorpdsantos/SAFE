import type { Env } from '../../src/config/env.js';

export function testEnv(overrides: Partial<Env> = {}): Env {
  return {
    NODE_ENV: 'test',
    APP_ORIGIN: 'http://localhost:5173',
    API_PORT: 3000,
    LOG_LEVEL: 'silent',
    DATABASE_URL:
      process.env.TEST_DATABASE_URL ?? 'postgresql://safe:safe@localhost:5433/safe_test',
    REDIS_URL: process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/1',
    SESSION_SECRET: 'test-session-secret-with-32-chars!!',
    DATA_ENC_KEY: Buffer.alloc(32, 7).toString('base64'),
    GOOGLE_CLIENT_ID: 'test-client',
    GOOGLE_CLIENT_SECRET: 'test-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:5173/api/v1/auth/google/callback',
    TERMS_VERSION: '1.0',
    PRIVACY_VERSION: '1.0',
    ...overrides,
  };
}
