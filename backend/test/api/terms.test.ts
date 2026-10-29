import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { AppDeps } from '../../src/http/deps.js';
import { requireAuth } from '../../src/http/middlewares/auth.js';
import { errorHandler } from '../../src/http/middlewares/errors.js';
import { requestId } from '../../src/http/middlewares/requestId.js';
import { requireTermsAccepted } from '../../src/http/middlewares/terms.js';
import { buildApp, closeAll, login, resetAll } from '../helpers/app.js';

beforeEach(resetAll);
afterAll(closeAll);

const accept = {
  termsVersion: '1.0',
  privacyVersion: '1.0',
  acceptTerms: true,
  acknowledgePrivacy: true,
  ageConfirmed: true,
};

/** App mínimo com uma "rota financeira" protegida, para testar o middleware isolado. */
function financialProbe(deps: AppDeps) {
  const app = express();
  app.use(requestId, cookieParser(deps.env.SESSION_SECRET));
  app.get('/financeiro', requireAuth(deps), requireTermsAccepted(deps), (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler(deps.logger));
  return app;
}

describe('T-03.7 – termos (SPEC-03 §6)', () => {
  it('GET /terms/current devolve as versões vigentes e accepted=false', async () => {
    const { app } = buildApp();
    const s = await login(app);
    const res = await s.agent.get('/api/v1/terms/current').expect(200);
    expect(res.body).toEqual({
      termsVersion: '1.0',
      privacyVersion: '1.0',
      termsUrl: '/legal/termos-v1.0.md',
      privacyUrl: '/legal/privacidade-v1.0.md',
      accepted: false,
    });
  });

  it('usuário recém-criado → rota financeira 403 TERMS_REQUIRED; depois do aceite, liberada', async () => {
    const t = buildApp();
    const s = await login(t.app);
    const probe = financialProbe(t.deps);
    const { cookie } = s;
    const before = await request(probe).get('/financeiro').set('Cookie', cookie);
    expect(before.status).toBe(403);
    expect(before.body.error.code).toBe('TERMS_REQUIRED');
    await s.send('post', '/api/v1/terms/accept').send(accept).expect(200);
    await request(probe).get('/financeiro').set('Cookie', cookie).expect(200);
  });

  it('aceite válido grava as duas versões, a maioridade, o token e a auditoria', async () => {
    const { app, deps } = buildApp();
    const s = await login(app);
    const res = await s.send('post', '/api/v1/terms/accept').send(accept).expect(200);
    const rows = await deps.prisma.termsAcceptance.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: s.userId,
      termsVersion: '1.0',
      privacyVersion: '1.0',
      ageConfirmed: true,
    });
    expect(rows[0]!.tokenId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await deps.prisma.auditLog.count({ where: { operation: 'TERMS_ACCEPT' } })).toBe(1);
    const termsCookie = (res.headers['set-cookie'] as unknown as string[]).find((c) =>
      c.startsWith('safe_terms='),
    )!;
    expect(termsCookie).toMatch(/safe_terms=1\.0%7C1\.0/);
    expect(termsCookie).toMatch(/HttpOnly/);
    const me = await s.agent.get('/api/v1/auth/me');
    expect(me.body.termsUpToDate).toBe(true);
  });

  it('aceitar de novo não duplica (FA01)', async () => {
    const { app, deps } = buildApp();
    const s = await login(app);
    await s.send('post', '/api/v1/terms/accept').send(accept).expect(200);
    await s.send('post', '/api/v1/terms/accept').send(accept).expect(200);
    expect(await deps.prisma.termsAcceptance.count()).toBe(1);
  });

  it.each(['acceptTerms', 'acknowledgePrivacy', 'ageConfirmed'])(
    'faltando %s → 400 com fields e nada gravado',
    async (field) => {
      const { app, deps } = buildApp();
      const s = await login(app);
      const res = await s.send('post', '/api/v1/terms/accept').send({ ...accept, [field]: false });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Object.keys(res.body.error.fields)).toEqual([field]);
      expect(await deps.prisma.termsAcceptance.count()).toBe(0);
    },
  );

  it('versão enviada diferente da vigente → 409 TERMS_OUTDATED', async () => {
    const { app } = buildApp();
    const s = await login(app);
    const res = await s
      .send('post', '/api/v1/terms/accept')
      .send({ ...accept, termsVersion: '0.9' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TERMS_OUTDATED');
  });

  it('FA02: trocar TERMS_VERSION para 1.1 → o mesmo usuário volta a receber 403', async () => {
    const v1 = buildApp();
    const s = await login(v1.app, 'versao@exemplo.com');
    await s.send('post', '/api/v1/terms/accept').send(accept).expect(200);
    const { cookie } = s;
    await request(financialProbe(v1.deps)).get('/financeiro').set('Cookie', cookie).expect(200);

    const v11 = buildApp({ env: { TERMS_VERSION: '1.1' } });
    const res = await request(financialProbe(v11.deps)).get('/financeiro').set('Cookie', cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TERMS_REQUIRED');
  });

  it('o servidor ignora o cookie safe_terms: forjar 1.1|1.1 não libera nada', async () => {
    const t = buildApp();
    const s = await login(t.app);
    const cookie = `${s.cookie}; safe_terms=1.1|1.1`;
    const res = await request(financialProbe(t.deps)).get('/financeiro').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('consentimento de pesquisa: dar, revogar (revoked_at) e dar de novo', async () => {
    const { app, deps } = buildApp();
    const s = await login(app);
    await s
      .send('post', '/api/v1/terms/accept')
      .send({ ...accept, researchConsent: true })
      .expect(200);
    let res = await s.agent.get('/api/v1/me/research-consent').expect(200);
    expect(res.body.granted).toBe(true);
    res = await s.send('put', '/api/v1/me/research-consent').send({ granted: false }).expect(200);
    expect(res.body).toEqual({ granted: false, grantedAt: null });
    const revoked = await deps.prisma.researchConsent.findFirstOrThrow();
    expect(revoked.revokedAt).not.toBeNull();
    await s.send('put', '/api/v1/me/research-consent').send({ granted: true }).expect(200);
    expect(await deps.prisma.researchConsent.count()).toBe(2);
    const ops = (await deps.prisma.auditLog.findMany({ orderBy: { id: 'asc' } })).map(
      (a) => a.operation,
    );
    expect(ops).toEqual([
      'LOGIN',
      'TERMS_ACCEPT',
      'RESEARCH_CONSENT_GRANT',
      'RESEARCH_CONSENT_REVOKE',
      'RESEARCH_CONSENT_GRANT',
    ]);
  });

  it('consentimento de pesquisa nunca vem marcado por padrão', async () => {
    const { app, deps } = buildApp();
    const s = await login(app);
    await s.send('post', '/api/v1/terms/accept').send(accept).expect(200);
    expect(await deps.prisma.researchConsent.count()).toBe(0);
    const res = await s.agent.get('/api/v1/me/research-consent');
    expect(res.body.granted).toBe(false);
  });

  it('PUT /me/research-consent exige CSRF', async () => {
    const { app } = buildApp();
    const s = await login(app);
    const res = await s.agent.put('/api/v1/me/research-consent').send({ granted: true });
    expect(res.status).toBe(403);
  });
});
