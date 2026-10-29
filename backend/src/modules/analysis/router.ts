import { Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../../http/deps.js';
import { financialRouter } from '../../http/guards.js';
import { notFound } from '../../lib/errors.js';

export function analysisRouter(deps: AppDeps): Router {
  const router = financialRouter(deps);
  router.get('/', async (_req, res) => {
    res.json(await deps.analysis.getAnalysis(res.locals.session!.userId));
  });
  return router;
}

const statusQuery = z.enum(['NAO_LIDO', 'LIDO']).optional();
const patchBody = z.object({
  status: z.literal('LIDO', { error: 'Só é possível marcar o alerta como lido' }),
});

export function alertsRouter(deps: AppDeps): Router {
  const router = financialRouter(deps);
  router.get('/', async (req, res) => {
    const status = statusQuery.parse(req.query.status);
    res.json({ items: await deps.analysis.listAlerts(res.locals.session!.userId, status) });
  });
  router.patch('/:id', async (req, res) => {
    const id = z.coerce.number().int().positive().safeParse(req.params.id);
    patchBody.parse(req.body);
    const userId = res.locals.session!.userId;
    const { count } = id.success
      ? await deps.prisma.alert.updateMany({
          where: { id: id.data, userId },
          data: { status: 'LIDO' },
        })
      : { count: 0 };
    if (count === 0) throw notFound('Este alerta não existe ou não é seu.');
    res.json({ id: id.data, status: 'LIDO' });
  });
  return router;
}
