import type { RequestHandler } from 'express';

/** Nenhuma resposta da API vai para cache do navegador ou de proxy (SEGURANCA_LGPD §5.3). */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  next();
};
