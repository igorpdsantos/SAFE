import { Router } from 'express';
import type { AppDeps } from './deps.js';
import { healthRouter } from '../modules/health/router.js';

/** Registro dos routers: UMA linha por módulo (evita conflito entre as trilhas). */
export function apiRouter(_deps: AppDeps): Router {
  const router = Router();
  router.use(healthRouter());
  return router;
}
