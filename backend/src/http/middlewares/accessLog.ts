import type { Request, RequestHandler } from 'express';
import type { Logger } from '../../lib/logger.js';

/** Rota parametrizada (/debts/:id), nunca a URL real com ids. */
function routeOf(req: Request): string {
  const path = req.route?.path;
  return typeof path === 'string' ? `${req.baseUrl}${path}` : '(sem rota)';
}

/** Log de acesso sem corpo, sem resposta e sem cabeçalhos (SPEC-01 §4.3). */
export function accessLog(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      logger.info(
        {
          requestId: res.locals.requestId,
          userId: res.locals.session?.userId,
          method: req.method,
          route: routeOf(req),
          status: res.statusCode,
          durationMs: Math.round(durationMs * 10) / 10,
        },
        'request',
      );
    });
    next();
  };
}
