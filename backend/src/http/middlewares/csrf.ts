import { timingSafeEqual } from 'node:crypto';
import type { Request, RequestHandler } from 'express';
import { AppError } from '../../lib/errors.js';
import type { Env } from '../../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function originOf(req: Request): string | null {
  const origin = req.get('origin');
  if (origin) return origin;
  const referer = req.get('referer');
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Origin igual a APP_ORIGIN e X-SAFE-CSRF igual ao da sessão, em tempo constante (SPEC-02 §4). */
export function requireCsrf(env: Env): RequestHandler {
  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const header = req.get('x-safe-csrf');
    const session = res.locals.session;
    if (
      originOf(req) !== env.APP_ORIGIN ||
      !header ||
      !session ||
      !sameSecret(header, session.csrf)
    ) {
      throw new AppError(
        'CSRF_FAILED',
        403,
        'Não foi possível confirmar a origem do pedido. Recarregue a página.',
      );
    }
    next();
  };
}
