import request from 'supertest';
import type { Express } from 'express';
import type { Env } from '../../src/config/env.js';
import { createApp } from '../../src/http/app.js';
import type { AppDeps } from '../../src/http/deps.js';
import { FakeClock } from '../../src/lib/clock.js';
import { createLogger, type Logger } from '../../src/lib/logger.js';
import { createPrisma, type PrismaClient } from '../../src/lib/prisma.js';
import { createRedis, type Redis } from '../../src/lib/redis.js';
import { SessionStore } from '../../src/modules/auth/sessions.js';
import { testEnv } from './env.js';
import { FakeOidc } from './fakeOidc.js';

let prisma: PrismaClient | null = null;
let redis: Redis | null = null;

/** Conexões compartilhadas por arquivo de teste (Postgres e Redis de teste). */
export function infra(): { prisma: PrismaClient; redis: Redis } {
  const env = testEnv();
  prisma ??= createPrisma(env.DATABASE_URL);
  redis ??= createRedis(env.REDIS_URL);
  return { prisma, redis };
}

const TABLES = [
  'log_auditoria',
  'aceitacao_termos',
  'consentimento_pesquisa',
  'alerta',
  'historico_indicadores',
  'simulacao_financeira',
  'indicador_financeiro',
  'reserva_financeira',
  'divida',
  'despesa',
  'renda',
  'exclusoes_pendentes_backup',
  'usuario',
];

/** Banco e Redis vazios antes de cada teste. */
export async function resetAll(): Promise<void> {
  const { prisma, redis } = infra();
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
  await redis.flushdb();
}

export async function closeAll(): Promise<void> {
  await prisma?.$disconnect();
  redis?.disconnect();
  prisma = null;
  redis = null;
}

export interface TestApp {
  app: Express;
  deps: AppDeps;
  clock: FakeClock;
  oidc: FakeOidc;
}

export function buildApp(opts: { env?: Partial<Env>; logger?: Logger } = {}): TestApp {
  const { prisma, redis } = infra();
  const env = testEnv(opts.env);
  const clock = new FakeClock();
  const oidc = new FakeOidc();
  const deps: AppDeps = {
    env,
    logger: opts.logger ?? createLogger('silent'),
    prisma,
    redis,
    clock,
    oidc,
    sessions: new SessionStore(redis, clock),
  };
  return { app: createApp(deps), deps, clock, oidc };
}

export const ORIGIN = 'http://localhost:5173';

/** Agente com cookies + o csrf, já logado pela rota de teste. */
export async function login(app: Express, email = 'pessoa@exemplo.com') {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/test/login').send({ email }).expect(200);
  const csrf: string = res.body.csrf;
  const userId: number = res.body.userId;
  const setCookie = res.headers['set-cookie'] as unknown as string[];
  /** Cabeçalho Cookie desta sessão, para usar em outro app ou em request() avulso. */
  const cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  const send = (method: 'post' | 'put' | 'patch' | 'delete', url: string) =>
    agent[method](url).set('Origin', ORIGIN).set('X-SAFE-CSRF', csrf);
  return { agent, csrf, userId, cookie, send };
}

/** Login + aceite dos termos vigentes. */
export async function loginAccepted(app: Express, email?: string) {
  const session = await login(app, email);
  await session
    .send('post', '/api/v1/terms/accept')
    .send({
      termsVersion: '1.0',
      privacyVersion: '1.0',
      acceptTerms: true,
      acknowledgePrivacy: true,
      ageConfirmed: true,
    })
    .expect(200);
  return session;
}
