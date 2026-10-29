import { Router } from 'express';
import type { AppDeps } from '../../http/deps.js';
import { financialRouter } from '../../http/guards.js';

export function projectionRouter(deps: AppDeps): Router {
  const router = financialRouter(deps);
  router.get('/', async (_req, res) => {
    res.json(await deps.projection.get(res.locals.session!.userId));
  });
  return router;
}
