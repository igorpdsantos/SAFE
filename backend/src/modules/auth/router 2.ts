import { Router, type Request, type Response } from 'express';
import { audit } from '../../lib/audit.js';
import type { AppDeps } from '../../http/deps.js';
import { requireAuth } from '../../http/middlewares/auth.js';
import { requireCsrf } from '../../http/middlewares/csrf.js';
import { RATE_LIMITS, rateLimit } from '../../http/middlewares/rateLimit.js';
import { termsUpToDate } from '../terms/service.js';
import {
  baseCookie,
  clearSessionCookies,
  clearSiteData,
  cookieNames,
  setSessionCookies,
} from './cookies.js';
import { OidcError, type OidcIdentity } from './oidc.js';

type LoginError = 'cancelado' | 'indisponivel' | 'invalido' | 'email';

interface OauthCookie {
  state: string;
  nonce: string;
  verifier: string;
}

function parseOauthCookie(value: unknown): OauthCookie | null {
  if (typeof value !== 'string') return null;
  try {
    const v = JSON.parse(value) as Partial<OauthCookie>;
    return v.state && v.nonce && v.verifier
      ? { state: v.state, nonce: v.nonce, verifier: v.verifier }
      : null;
  } catch {
    return null;
  }
}

/** Cria o usuário no 1º acesso (FA02) ou atualiza e-mail e último login (FA03); reativa INATIVO. */
export async function upsertUser(deps: AppDeps, identity: OidcIdentity): Promise<number> {
  const at = deps.clock.now();
  return deps.prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { oauthSubject: identity.sub },
      create: {
        oauthSubject: identity.sub,
        email: identity.email,
        createdAt: at,
        lastLoginAt: at,
        state: 'ATIVO',
      },
      update: { email: identity.email, lastLoginAt: at, state: 'ATIVO' },
      select: { id: true },
    });
    await audit(tx, {
      userId: user.id,
      operation: 'LOGIN',
      entity: 'usuario',
      entityId: user.id,
      at,
    });
    return user.id;
  });
}

/** Sempre um ID novo; a sessão anterior deste navegador é destruída (contra fixação). */
export async function startSession(deps: AppDeps, req: Request, res: Response, userId: number) {
  const names = cookieNames(deps.env);
  const previous: unknown = req.cookies?.[names.sid];
  if (typeof previous === 'string' && previous !== '') await deps.sessions.destroy(previous);
  const session = await deps.sessions.create(userId);
  setSessionCookies(res, deps.env, session.id, session.csrf);
  return session;
}

export function authRouter(deps: AppDeps): Router {
  const router = Router();
  const names = cookieNames(deps.env);
  const loginLimit = rateLimit(deps, RATE_LIMITS.login);
  const toLogin = (res: Response, error: LoginError) =>
    res.redirect(302, `${deps.env.APP_ORIGIN}/login?erro=${error}`);

  router.get('/google', loginLimit, async (_req, res) => {
    try {
      const auth = await deps.oidc.start();
      const value: OauthCookie = { state: auth.state, nonce: auth.nonce, verifier: auth.verifier };
      res.cookie(names.oauth, JSON.stringify(value), {
        ...baseCookie(deps.env),
        httpOnly: true,
        signed: true,
        maxAge: 10 * 60 * 1000,
      });
      res.redirect(302, auth.url);
    } catch (err) {
      if (err instanceof OidcError) return toLogin(res, 'indisponivel');
      throw err;
    }
  });

  router.get('/google/callback', loginLimit, async (req, res) => {
    const checks = parseOauthCookie(req.signedCookies?.[names.oauth]);
    res.clearCookie(names.oauth, { ...baseCookie(deps.env), httpOnly: true });
    if (req.query.error === 'access_denied') return toLogin(res, 'cancelado');
    if (req.query.error || !checks) return toLogin(res, 'invalido');

    const callbackUrl = new URL(deps.env.GOOGLE_REDIRECT_URI);
    callbackUrl.search = new URL(req.originalUrl, 'http://x').search;
    let identity: OidcIdentity;
    try {
      identity = await deps.oidc.finish(callbackUrl, checks);
    } catch (err) {
      if (err instanceof OidcError)
        return toLogin(res, err.kind === 'unavailable' ? 'indisponivel' : 'invalido');
      throw err;
    }
    if (!identity.emailVerified) return toLogin(res, 'email');

    const userId = await upsertUser(deps, identity);
    await startSession(deps, req, res, userId);
    const upToDate = await termsUpToDate(deps.prisma, deps.env, userId);
    res.redirect(302, `${deps.env.APP_ORIGIN}${upToDate ? '/' : '/termos'}`);
  });

  const authed = [requireAuth(deps), rateLimit(deps, RATE_LIMITS.api), requireCsrf(deps.env)];

  router.get('/me', ...authed, async (_req, res) => {
    const { userId } = res.locals.session!;
    const user = await deps.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    res.json({
      userId,
      email: user?.email ?? null,
      termsUpToDate: await termsUpToDate(deps.prisma, deps.env, userId),
    });
  });

  router.post('/logout', ...authed, async (_req, res) => {
    const session = res.locals.session!;
    await deps.sessions.destroy(session.id);
    await audit(deps.prisma, {
      userId: session.userId,
      operation: 'LOGOUT',
      entity: 'usuario',
      at: deps.clock.now(),
    });
    clearSessionCookies(res, deps.env);
    clearSiteData(res);
    res.status(204).end();
  });

  router.post('/logout-all', ...authed, async (_req, res) => {
    const { userId } = res.locals.session!;
    await deps.sessions.destroyAllSessions(userId);
    await audit(deps.prisma, {
      userId,
      operation: 'LOGOUT_ALL',
      entity: 'usuario',
      at: deps.clock.now(),
    });
    clearSessionCookies(res, deps.env);
    clearSiteData(res);
    res.status(204).end();
  });

  return router;
}
