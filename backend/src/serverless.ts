import type { Express } from 'express';
import { loadEnv } from './config/env.js';
import { createApp } from './http/app.js';
import { createDeps } from './http/container.js';
import { systemClock } from './lib/clock.js';
import { createLogger } from './lib/logger.js';
import { createPrisma } from './lib/prisma.js';
import { createRedis } from './lib/redis.js';
import { googleOidc } from './modules/auth/oidc.js';

/**
 * Entrada da API na Vercel (função serverless). Monta as dependências uma vez por instância
 * e reaproveita entre requisições. Sem listen() e sem node-cron: os jobs de retenção vêm do
 * agendador da Vercel pela rota /api/v1/internal/retention.
 */
let app: Express | undefined;

function getApp(): Express {
  if (app) return app;
  const env = loadEnv();
  const logger = createLogger(env.LOG_LEVEL);
  const deps = createDeps({
    env,
    logger,
    prisma: createPrisma(env.DATABASE_URL),
    redis: createRedis(env.REDIS_URL),
    clock: systemClock,
    oidc: googleOidc(env),
  });
  app = createApp(deps);
  return app;
}

export default function handler(req: Parameters<Express>[0], res: Parameters<Express>[1]) {
  return getApp()(req, res);
}
