import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import type { AppDeps } from '../../http/deps.js';
import { AppError } from '../../lib/errors.js';
import { runRetentionJobs } from './jobs.js';

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Jobs de retenção (SPEC-10 §3) chamados pelo agendador da Vercel, que não mantém processo
 * vivo para o node-cron. A Vercel envia `Authorization: Bearer <CRON_SECRET>`.
 */
export function retentionCronRouter(deps: AppDeps, secret: string): Router {
  const router = Router();
  router.get('/retention', async (req, res) => {
    const header = req.get('authorization') ?? '';
    if (!header.startsWith('Bearer ') || !sameSecret(header.slice(7), secret)) {
      throw new AppError('UNAUTHENTICATED', 401, 'Acesso não autorizado.');
    }
    res.json({ retention: await runRetentionJobs(deps) });
  });
  return router;
}
