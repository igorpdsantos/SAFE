import { Router } from 'express';
import type { AppDeps } from './deps.js';
import { requireAuth } from './middlewares/auth.js';
import { requireCsrf } from './middlewares/csrf.js';
import { RATE_LIMITS, rateLimit } from './middlewares/rateLimit.js';
import { requireTermsAccepted } from './middlewares/terms.js';

/** Router com sessão + rate limit geral + CSRF nos métodos que alteram estado. */
export function authedRouter(deps: AppDeps): Router {
  const router = Router();
  router.use(requireAuth(deps), rateLimit(deps, RATE_LIMITS.api), requireCsrf(deps.env));
  return router;
}

/** Igual ao anterior e exige os termos em dia (rotas financeiras, SPEC-04 a SPEC-10). */
export function financialRouter(deps: AppDeps): Router {
  const router = authedRouter(deps);
  router.use(requireTermsAccepted(deps));
  return router;
}
