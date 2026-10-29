import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/errors.js';
import type { AppDeps } from '../../http/deps.js';
import { authedRouter } from '../../http/guards.js';
import { baseCookie } from '../auth/cookies.js';
import {
  acceptTerms,
  getResearchConsent,
  setResearchConsent,
  termsUpToDate,
  versionsTag,
} from './service.js';

const mustBeTrue = (message: string) => z.literal(true, { error: message });

const acceptBody = z.object({
  termsVersion: z.string(),
  privacyVersion: z.string(),
  acceptTerms: mustBeTrue('Marque que você leu e aceita os Termos de Uso.'),
  acknowledgePrivacy: mustBeTrue('Marque que você leu a Política de Privacidade.'),
  ageConfirmed: mustBeTrue('Marque que você tem 18 anos ou mais.'),
  researchConsent: z.boolean().default(false),
});

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function termsRouter(deps: AppDeps): Router {
  const router = authedRouter(deps);
  const { env } = deps;

  router.get('/current', async (_req, res) => {
    res.json({
      termsVersion: env.TERMS_VERSION,
      privacyVersion: env.PRIVACY_VERSION,
      termsUrl: `/legal/termos-v${env.TERMS_VERSION}.md`,
      privacyUrl: `/legal/privacidade-v${env.PRIVACY_VERSION}.md`,
      accepted: await termsUpToDate(deps.prisma, env, res.locals.session!.userId),
    });
  });

  router.post('/accept', async (req, res) => {
    const raw = z
      .object({ termsVersion: z.string(), privacyVersion: z.string() })
      .safeParse(req.body);
    if (
      raw.success &&
      (raw.data.termsVersion !== env.TERMS_VERSION ||
        raw.data.privacyVersion !== env.PRIVACY_VERSION)
    ) {
      throw new AppError(
        'TERMS_OUTDATED',
        409,
        'Os termos foram atualizados; recarregue a página.',
      );
    }
    const input = acceptBody.parse(req.body);
    const session = res.locals.session!;
    await acceptTerms(deps.prisma, env, deps.clock, session.userId, input.researchConsent);
    await deps.sessions.setTermsOk(session.userId, versionsTag(env));
    res.cookie('safe_terms', versionsTag(env), {
      ...baseCookie(env),
      httpOnly: true,
      maxAge: YEAR_MS,
    });
    res.json({ accepted: true });
  });

  return router;
}

/** Rotas em /me que dependem só da sessão (o router /me é compartilhado com a SPEC-10). */
export function registerResearchConsent(me: Router, deps: AppDeps): void {
  me.get('/research-consent', async (_req, res) => {
    res.json(await getResearchConsent(deps.prisma, res.locals.session!.userId));
  });
  me.put('/research-consent', async (req, res) => {
    const { granted } = z
      .object({ granted: z.boolean({ error: 'Informe se você quer participar.' }) })
      .parse(req.body);
    const { userId } = res.locals.session!;
    await setResearchConsent(deps.prisma, deps.env, deps.clock, userId, granted);
    res.json(await getResearchConsent(deps.prisma, userId));
  });
}
