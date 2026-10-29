import { describe, expect, it } from 'vitest';
import { ConfigError, loadEnv } from './env.js';

const valid = {
  NODE_ENV: 'test',
  APP_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://safe:safe@localhost:5432/safe',
  REDIS_URL: 'redis://localhost:6379',
  SESSION_SECRET: 'x'.repeat(32),
  DATA_ENC_KEY: Buffer.alloc(32, 1).toString('base64'),
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:5173/api/v1/auth/google/callback',
  TERMS_VERSION: '1.0',
  PRIVACY_VERSION: '1.0',
};

describe('T-01.2 – config/env.ts', () => {
  it('aceita um .env completo e aplica os padrões', () => {
    const env = loadEnv(valid);
    expect(env.API_PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('diz qual variável obrigatória está faltando', () => {
    const { REDIS_URL: _omit, ...rest } = valid;
    expect(() => loadEnv(rest)).toThrow(ConfigError);
    expect(() => loadEnv(rest)).toThrow(/REDIS_URL está faltando/);
  });

  it('rejeita DATA_ENC_KEY que não tem 32 bytes', () => {
    expect(() => loadEnv({ ...valid, DATA_ENC_KEY: 'curta' })).toThrow(
      /DATA_ENC_KEY: deve ter 32 bytes/,
    );
  });
});
