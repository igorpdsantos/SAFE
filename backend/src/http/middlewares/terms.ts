import type { RequestHandler } from 'express';
import { AppError } from '../../lib/errors.js';
import { termsUpToDate, versionsTag } from '../../modules/terms/service.js';
import type { AppDeps } from '../deps.js';

/** Rotas financeiras exigem o aceite da versão vigente; resultado em cache na sessão (SPEC-03 §3). */
export function requireTermsAccepted(deps: AppDeps): RequestHandler {
  return async (_req, res, next) => {
    const session = res.locals.session;
    if (!session)
      throw new AppError('UNAUTHENTICATED', 401, 'Entre com sua conta Google para continuar.');
    const tag = versionsTag(deps.env);
    if (session.termsOk === tag) return next();
    if (!(await termsUpToDate(deps.prisma, deps.env, session.userId))) {
      throw new AppError('TERMS_REQUIRED', 403, 'Para continuar, aceite os Termos de Uso.');
    }
    session.termsOk = tag;
    const { id: _id, key, ...data } = session;
    await deps.sessions.update(key, data);
    next();
  };
}
