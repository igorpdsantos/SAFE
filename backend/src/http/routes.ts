import { Router } from 'express';
import type { AppDeps } from './deps.js';
import { authedRouter } from './guards.js';
import { healthRouter } from '../modules/health/router.js';
import { authRouter } from '../modules/auth/router.js';
import { testLoginRouter } from '../modules/auth/testLogin.js';
import { registerResearchConsent, termsRouter } from '../modules/terms/router.js';
import {
  BUDGET_KINDS,
  budgetResourceRouter,
  budgetSummaryRouter,
} from '../modules/budget/router.js';

/** Registro dos routers: UMA linha por módulo, cada um no seu prefixo (evita conflito entre as trilhas). */
export function apiRouter(deps: AppDeps): Router {
  const router = Router();
  router.use(healthRouter());
  router.use('/auth', authRouter(deps));
  router.use('/terms', termsRouter(deps));
  router.use('/me', meRouter(deps));
  for (const kind of BUDGET_KINDS) router.use(`/${kind}`, budgetResourceRouter(deps, kind));
  router.use('/budget', budgetSummaryRouter(deps));
  if (deps.env.NODE_ENV === 'test') router.use('/test', testLoginRouter(deps));
  return router;
}

/** /me reúne rotas de mais de um módulo sob a mesma checagem de sessão. */
function meRouter(deps: AppDeps): Router {
  const me = authedRouter(deps);
  registerResearchConsent(me, deps);
  return me;
}
