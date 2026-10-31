import { Router } from 'express';
import { z } from 'zod';
import { CONTEXT_SERIES } from './series.generated.js';

const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use o formato AAAA-MM, por exemplo 2026-01')
  .optional();

const query = z
  .object({ from: month, to: month })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    path: ['to'],
    message: 'O fim do período precisa ser depois do início.',
  });

/**
 * Séries públicas agregadas (SPEC-14 §3): sem sessão e sem dado pessoal. Os dados vêm de
 * CSVs versionados, atualizados à mão pela equipe; o servidor nunca busca nada de terceiros.
 */
export function contextRouter(): Router {
  const router = Router();
  router.get('/series', (req, res) => {
    const { from, to } = query.parse(req.query);
    const inRange = (date: string) => (!from || date >= from) && (!to || date <= to);
    res.json({
      series: CONTEXT_SERIES.map((s) => ({
        ...s,
        points: s.points.filter((p) => inRange(p.date)),
      })),
    });
  });
  return router;
}
