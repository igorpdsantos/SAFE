import type { Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../../http/deps.js';
import { RATE_LIMITS, rateLimit } from '../../http/middlewares/rateLimit.js';
import { baseCookie, clearSessionCookies, clearSiteData } from '../auth/cookies.js';

const confirmBody = z.object({
  confirm: z.literal('EXCLUIR', { error: 'Digite EXCLUIR, em letras maiúsculas, para confirmar' }),
});

/** Rotas em /me da SPEC-10. O router /me só exige sessão: o titular exporta e apaga mesmo sem termos em dia. */
export function registerPrivacy(me: Router, deps: AppDeps): void {
  me.get('/', async (_req, res) => {
    res.json(await deps.privacy.me(res.locals.session!.userId));
  });

  me.get('/export', rateLimit(deps, RATE_LIMITS.export), async (_req, res) => {
    const { filename, data } = await deps.privacy.export(res.locals.session!.userId);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.type('application/json').send(JSON.stringify(data, null, 2));
  });

  me.delete('/', rateLimit(deps, RATE_LIMITS.deleteAccount), async (req, res) => {
    confirmBody.parse(req.body);
    await deps.privacy.deleteAccount(res.locals.session!.userId);
    clearSessionCookies(res, deps.env);
    res.clearCookie('safe_terms', { ...baseCookie(deps.env), httpOnly: true });
    clearSiteData(res);
    res.status(204).end();
  });
}
