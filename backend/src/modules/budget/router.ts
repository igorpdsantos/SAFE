import { Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../../http/deps.js';
import { financialRouter } from '../../http/guards.js';
import { notFound } from '../../lib/errors.js';
import { SCHEMAS } from './schemas.js';
import { BUDGET_KINDS, type BudgetKind } from './types.js';

const idParam = z.coerce.number().int().positive();

function parseId(raw: unknown): number {
  const parsed = idParam.safeParse(raw);
  if (!parsed.success) throw notFound('Este item não existe ou não é seu.');
  return parsed.data;
}

/** CRUD de um recurso do orçamento: /incomes, /expenses, /debts ou /reserves (SPEC-04 §3). */
export function budgetResourceRouter(deps: AppDeps, kind: BudgetKind): Router {
  const router = financialRouter(deps);
  const schema = SCHEMAS[kind];
  const { budget } = deps;
  const uid = (res: { locals: Express.Locals }) => res.locals.session!.userId;

  router.get('/', async (_req, res) => {
    res.json({ items: await budget.list(uid(res), kind) });
  });
  router.get('/:id', async (req, res) => {
    res.json(await budget.get(uid(res), kind, parseId(req.params.id)));
  });
  router.post('/', async (req, res) => {
    res.status(201).json(await budget.create(uid(res), kind, schema.parse(req.body)));
  });
  router.put('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    res.json(await budget.update(uid(res), kind, id, schema.parse(req.body)));
  });
  router.delete('/:id', async (req, res) => {
    await budget.remove(uid(res), kind, parseId(req.params.id));
    res.status(204).end();
  });
  return router;
}

export function budgetSummaryRouter(deps: AppDeps): Router {
  const router = financialRouter(deps);
  router.get('/summary', async (_req, res) => {
    res.json(await deps.budget.summary(res.locals.session!.userId));
  });
  return router;
}

export { BUDGET_KINDS };
