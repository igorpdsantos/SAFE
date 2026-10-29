import type { Env } from '../config/env.js';
import type { Clock } from '../lib/clock.js';
import { FieldCipher } from '../lib/crypto.js';
import { BudgetEvents } from '../lib/events.js';
import type { Logger } from '../lib/logger.js';
import type { PrismaClient } from '../lib/prisma.js';
import type { Redis } from '../lib/redis.js';
import type { OidcProvider } from '../modules/auth/oidc.js';
import { SessionStore } from '../modules/auth/sessions.js';
import { BudgetService } from '../modules/budget/service.js';
import { AnalysisService } from '../modules/analysis/service.js';
import { ProjectionService } from '../modules/projection/service.js';
import { SimulationService } from '../modules/simulations/service.js';
import { HistoryService } from '../modules/history/service.js';
import { PrivacyService } from '../modules/privacy/service.js';
import type { BudgetRepository } from '../repositories/budgetRepository.js';
import { PrismaBudgetRepository } from '../repositories/prismaBudgetRepository.js';
import type { AppDeps } from './deps.js';

export interface Infra {
  env: Env;
  logger: Logger;
  prisma: PrismaClient;
  redis: Redis;
  clock: Clock;
  oidc: OidcProvider;
  budgetRepository?: BudgetRepository;
}

/** Monta todas as dependências do app a partir da infraestrutura (o mesmo para produção e testes). */
export function createDeps(infra: Infra): AppDeps {
  const events = new BudgetEvents(infra.logger);
  const repo =
    infra.budgetRepository ??
    new PrismaBudgetRepository(infra.prisma, new FieldCipher(infra.env.DATA_ENC_KEY));
  const budget = new BudgetService(repo, infra.redis, events, infra.clock);
  const analysis = new AnalysisService(infra.prisma, infra.redis, budget, infra.clock);
  // SPEC-07 §2: toda escrita no orçamento recalcula indicador, histórico do dia e alertas.
  events.onBudgetChanged(async (userId) => {
    await analysis.refresh(userId);
  });
  const sessions = new SessionStore(infra.redis, infra.clock);
  return {
    ...infra,
    sessions,
    events,
    budget,
    analysis,
    projection: new ProjectionService(infra.redis, budget),
    simulations: new SimulationService(infra.prisma, budget, infra.clock),
    history: new HistoryService(infra.prisma, infra.clock),
    privacy: new PrivacyService(
      infra.prisma,
      infra.redis,
      sessions,
      budget,
      infra.clock,
      infra.logger,
    ),
  };
}
