import { Router } from 'express';
import type { AppDeps } from '../../http/deps.js';
import { financialRouter } from '../../http/guards.js';

export function historyRouter(deps: AppDeps): Router {
  const router = financialRouter(deps);
  router.get('/', async (req, res) => {
    res.json(
      await deps.history.get(res.locals.session!.userId, {
        from: req.query.from,
        to: req.query.to,
      }),
    );
  });
  return router;
}
