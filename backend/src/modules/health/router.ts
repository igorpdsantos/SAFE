import { Router } from 'express';

/** GET /api/v1/health: não toca no banco nem no Redis. */
export function healthRouter(): Router {
  const router = Router();
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  return router;
}
