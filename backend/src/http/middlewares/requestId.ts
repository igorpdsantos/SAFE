import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

/** Gera o id da requisição (nunca confia no do cliente) e devolve em X-Request-Id. */
export const requestId: RequestHandler = (_req, res, next) => {
  const id = randomUUID();
  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
};
