import type { Env } from '../config/env.js';
import type { Clock } from '../lib/clock.js';
import type { BudgetEvents } from '../lib/events.js';
import type { Logger } from '../lib/logger.js';
import type { PrismaClient } from '../lib/prisma.js';
import type { Redis } from '../lib/redis.js';
import type { OidcProvider } from '../modules/auth/oidc.js';
import type { SessionStore } from '../modules/auth/sessions.js';
import type { BudgetService } from '../modules/budget/service.js';

/** Dependências que o app recebe prontas (permite trocar por versões de teste). */
export interface AppDeps {
  env: Env;
  logger: Logger;
  prisma: PrismaClient;
  redis: Redis;
  clock: Clock;
  oidc: OidcProvider;
  sessions: SessionStore;
  events: BudgetEvents;
  budget: BudgetService;
}
