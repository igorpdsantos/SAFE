import type { CookieOptions, Response } from 'express';
import type { Env } from '../../config/env.js';

export interface CookieNames {
  sid: string;
  csrf: string;
  oauth: string;
  terms: string;
}

/**
 * Os 4 cookies do SAFE (SEGURANCA_LGPD §5.1). Fora de produção (http://localhost)
 * o prefixo __Host- e o Secure não funcionam, então usamos nomes simples.
 */
export function cookieNames(env: Env): CookieNames {
  const host = env.NODE_ENV === 'production' ? '__Host-' : '';
  return {
    sid: `${host}safe_sid`,
    csrf: `${host}safe_csrf`,
    oauth: `${host}safe_oauth`,
    terms: 'safe_terms',
  };
}

export function baseCookie(env: Env): CookieOptions {
  return { secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/' };
}

/** Cookie de sessão: HttpOnly e sem Max-Age (some ao fechar o navegador). */
export function setSessionCookies(res: Response, env: Env, sid: string, csrf: string): void {
  const names = cookieNames(env);
  res.cookie(names.sid, sid, { ...baseCookie(env), httpOnly: true });
  res.cookie(names.csrf, csrf, { ...baseCookie(env), httpOnly: false });
}

export function clearSessionCookies(res: Response, env: Env): void {
  const names = cookieNames(env);
  res.clearCookie(names.sid, { ...baseCookie(env), httpOnly: true });
  res.clearCookie(names.csrf, { ...baseCookie(env), httpOnly: false });
}

/** Resposta de saída: navegador apaga cache, cookies e storage (SEGURANCA_LGPD §5.3). */
export function clearSiteData(res: Response): void {
  res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
}
