import type { RequestHandler } from 'express';
import { AppError } from '../../lib/errors.js';
import { cookieNames } from '../../modules/auth/cookies.js';
import type { AppDeps } from '../deps.js';

/** Exige sessão válida e põe a sessão em res.locals (SPEC-02 §3). */
export function requireAuth(deps: AppDeps): RequestHandler {
  const names = cookieNames(deps.env);
  return async (req, res, next) => {
    const sid: unknown = req.cookies?.[names.sid];
    if (typeof sid !== 'string' || sid === '') {
      throw new AppError('UNAUTHENTICATED', 401, 'Entre com sua conta Google para continuar.');
    }
    const found = await deps.sessions.lookup(sid);
    if (found.status !== 'ok') {
      throw new AppError(
        'SESSION_EXPIRED',
        401,
        'Sua sessão terminou. Entre de novo para continuar.',
      );
    }
    res.locals.session = { id: sid, key: found.key, ...found.data };
    next();
  };
}
