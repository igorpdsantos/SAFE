import { Router } from 'express';
import { z } from 'zod';
import { Decimal } from '../../engine/decimal.js';
import type { AppDeps } from '../../http/deps.js';
import { financialRouter } from '../../http/guards.js';
import { RATE_LIMITS, rateLimit } from '../../http/middlewares/rateLimit.js';
import { InvalidMoneyError, parseMoney } from '../../lib/decimal.js';
import { notFound } from '../../lib/errors.js';

function moneyField(hint: string) {
  return z.string({ error: hint }).transform((text, ctx) => {
    try {
      return parseMoney(text);
    } catch (err) {
      if (!(err instanceof InvalidMoneyError)) throw err;
      ctx.addIssue({ code: 'custom', message: hint });
      return z.NEVER;
    }
  });
}

const body = z.object({
  value: moneyField('Digite o valor da compra, maior que zero. Ex.: 1.200,00'),
  installments: z.number({ error: 'Digite um número inteiro de parcelas, de 1 a 600. Ex.: 12' }),
  installmentValue: moneyField('Digite o valor de cada parcela, maior que zero. Ex.: 100,00'),
});

function simulationId(raw: string): number {
  const id = z.coerce.number().int().positive().safeParse(raw);
  if (!id.success) throw notFound('Esta simulação não existe ou não é sua.');
  return id.data;
}

export function simulationsRouter(deps: AppDeps): Router {
  const router = financialRouter(deps);
  router.post('/', rateLimit(deps, RATE_LIMITS.simulations), async (req, res) => {
    const input = body.parse(req.body);
    res.json(
      await deps.simulations.run(res.locals.session!.userId, {
        value: new Decimal(input.value),
        installments: input.installments,
        installmentValue: new Decimal(input.installmentValue),
      }),
    );
  });
  router.get('/', async (_req, res) => {
    res.json({ items: await deps.simulations.list(res.locals.session!.userId) });
  });
  router.patch('/:id', async (req, res) => {
    const id = simulationId(req.params.id);
    z.object({
      state: z.literal('DESCARTADA', { error: 'Só é possível descartar a simulação' }),
    }).parse(req.body);
    res.json(await deps.simulations.discard(res.locals.session!.userId, id));
  });
  router.post('/:id/register', async (req, res) => {
    const id = simulationId(req.params.id);
    res.status(201).json(await deps.simulations.register(res.locals.session!.userId, id));
  });
  return router;
}
