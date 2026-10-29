import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  buildApp,
  closeAll,
  infra,
  login,
  loginAccepted,
  ORIGIN,
  resetAll,
} from '../helpers/app.js';
import { captureLogger } from '../helpers/logCapture.js';
import { seedArticle } from '../helpers/seed.js';

// Suíte de segurança da SPEC-13 §3. Itens já cobertos em detalhe em test/api/* são
// repetidos aqui de forma resumida para a suíte valer sozinha como checklist.

beforeEach(resetAll);
afterAll(closeAll);

const V = '/api/v1';
const SENTINEL = '987654.32';
const ALLOWED_COOKIES = new Set(['safe_sid', 'safe_csrf', 'safe_oauth', 'safe_terms']);

const setCookies = (res: request.Response): string[] => {
  const raw = res.headers['set-cookie'] as unknown;
  return Array.isArray(raw) ? (raw as string[]) : raw ? [raw as string] : [];
};

describe('T-13.2 – IDOR em todos os recursos', () => {
  it('B não lê, altera nem apaga renda, despesa, dívida, reserva, simulação e alerta de A (404)', async () => {
    const { app, deps } = buildApp();
    const a = await loginAccepted(app, 'a@exemplo.com');
    const b = await loginAccepted(app, 'b@exemplo.com');
    await seedArticle(a);
    await a
      .send('post', `${V}/expenses`)
      .send({ category: 'MORADIA', type: 'FIXA', value: '3000' })
      .expect(201);
    const sim = await a
      .send('post', `${V}/simulations`)
      .send({ value: '600', installments: 1, installmentValue: '600' });
    const alert = await deps.prisma.alert.findFirstOrThrow({ where: { userId: a.userId } });
    const valid: Record<string, object> = {
      incomes: { monthValue: '1' },
      expenses: { category: 'OUTROS', type: 'FIXA', value: '1' },
      debts: { category: 'OUTROS', installmentValue: '1', remainingInstallments: 1 },
      reserves: { value: '1' },
    };
    for (const kind of Object.keys(valid)) {
      const id = (await a.agent.get(`${V}/${kind}`)).body.items[0].id;
      expect((await b.agent.get(`${V}/${kind}/${id}`)).status, kind).toBe(404);
      expect((await b.send('put', `${V}/${kind}/${id}`).send(valid[kind])).status, kind).toBe(404);
      expect((await b.send('delete', `${V}/${kind}/${id}`)).status, kind).toBe(404);
    }
    expect(
      (await b.send('patch', `${V}/simulations/${sim.body.id}`).send({ state: 'DESCARTADA' }))
        .status,
    ).toBe(404);
    expect((await b.send('patch', `${V}/alerts/${alert.id}`).send({ status: 'LIDO' })).status).toBe(
      404,
    );
    expect((await b.agent.get(`${V}/simulations`)).body.items).toEqual([]);
    expect((await b.agent.get(`${V}/alerts`)).body.items).toEqual([]);
  });
});

describe('T-13.2 – CSRF e termos', () => {
  it('POST sem cabeçalho, com cabeçalho errado ou com Origin estranho → 403', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    const attempts = [
      () => s.agent.post(`${V}/incomes`).set('Origin', ORIGIN),
      () => s.agent.post(`${V}/incomes`).set('Origin', ORIGIN).set('X-SAFE-CSRF', 'errado'),
      () =>
        s.agent
          .post(`${V}/incomes`)
          .set('Origin', 'https://evil.example')
          .set('X-SAFE-CSRF', s.csrf),
    ];
    for (const attempt of attempts)
      expect((await attempt().send({ monthValue: '10' })).status).toBe(403);
  });

  it('todas as rotas financeiras exigem termos aceitos', async () => {
    const { app } = buildApp();
    const s = await login(app);
    const paths = [
      '/incomes',
      '/expenses',
      '/debts',
      '/reserves',
      '/budget/summary',
      '/analysis',
      '/alerts',
    ];
    for (const path of [...paths, '/projection', '/simulations', '/history']) {
      expect((await s.agent.get(`${V}${path}`)).status, path).toBe(403);
    }
  });
});

describe('T-13.2 – cabeçalhos e cookies', () => {
  it('CSP, HSTS (produção), nosniff, no-referrer e no-store em /api', async () => {
    const { app } = buildApp({ env: { NODE_ENV: 'production' } });
    const res = await request(app).get(`${V}/health`).set('X-Forwarded-Proto', 'https');
    expect(res.headers['content-security-policy']).toContain("script-src 'self'");
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('o fluxo inteiro só cria os 4 cookies previstos', async () => {
    const { app } = buildApp();
    const names = new Set<string>();
    const collect = (res: request.Response) =>
      setCookies(res).forEach((c) => names.add(c.split('=')[0]!));
    const agent = request.agent(app);
    const start = await agent.get(`${V}/auth/google`);
    collect(start);
    const state = new URL(start.headers.location as string).searchParams.get('state');
    collect(await agent.get(`${V}/auth/google/callback?code=ok:s:a@b.com&state=${state}`));
    expect(setCookies(await agent.get(`${V}/auth/me`))).toEqual([]);
    const s = await loginAccepted(app, 'cookies@exemplo.com');
    await seedArticle(s);
    collect(
      await s
        .send('post', `${V}/terms/accept`)
        .send({
          termsVersion: '1.0',
          privacyVersion: '1.0',
          acceptTerms: true,
          acknowledgePrivacy: true,
          ageConfirmed: true,
        }),
    );
    collect(
      await s
        .send('post', `${V}/simulations`)
        .send({ value: '600', installments: 1, installmentValue: '600' }),
    );
    collect(await s.agent.get(`${V}/me/export`));
    collect(await s.send('post', `${V}/auth/logout`));
    expect(names.size).toBeGreaterThanOrEqual(4);
    for (const n of names) expect(ALLOWED_COOKIES.has(n), n).toBe(true);
  });
});

describe('T-13.2 – logs sem dados pessoais', () => {
  it('o uso completo não deixa e-mail, valor de teste, descrição, cookie nem csrf no log', async () => {
    const cap = captureLogger();
    const { app } = buildApp({ logger: cap.logger });
    const s = await loginAccepted(app, 'log.secreto@exemplo.com');
    await s
      .send('post', `${V}/incomes`)
      .send({ monthValue: SENTINEL, description: 'Descrição secreta' })
      .expect(201);
    await s.send('post', `${V}/incomes`).send({ monthValue: '-1' }).expect(400);
    await s.agent.get(`${V}/analysis`).expect(200);
    await s
      .send('post', `${V}/simulations`)
      .send({ value: SENTINEL, installments: 1, installmentValue: SENTINEL })
      .expect(200);
    await s.agent.get(`${V}/me/export`).expect(200);
    await s.send('delete', `${V}/me`).send({ confirm: 'EXCLUIR' }).expect(204);
    const text = cap.text();
    expect(text.length).toBeGreaterThan(100);
    for (const secret of ['log.secreto@exemplo.com', '987654', 'Descrição secreta', s.csrf]) {
      expect(text, secret).not.toContain(secret);
    }
    expect(text).not.toMatch(/safe_sid=/);
  });
});

describe('T-13.2 – entrada hostil', () => {
  it.each([
    ['negativo', { monthValue: '-100.00' }],
    ['NaN', { monthValue: 'NaN' }],
    ['notação científica', { monthValue: '1e9' }],
    ['número em vez de texto', { monthValue: 100 }],
    ['texto enorme', { monthValue: '1'.repeat(5000) }],
    ['objeto', { monthValue: { $gt: 0 } }],
    ['descrição enorme', { monthValue: '10', description: 'x'.repeat(2000) }],
  ])('%s → 400', async (_name, body) => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    expect((await s.send('post', `${V}/incomes`).send(body)).status).toBe(400);
  });

  it('corpo > 10 KB → 413', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    const res = await s
      .send('post', `${V}/incomes`)
      .send({ monthValue: '10', description: 'x'.repeat(11 * 1024) });
    expect(res.status).toBe(413);
  });
});

describe('T-13.2 – criptografia e exclusão', () => {
  it('descrição no banco ≠ texto; exclusão não deixa nada no banco nem no Redis', async () => {
    const { app, deps } = buildApp();
    const s = await loginAccepted(app);
    await s
      .send('post', `${V}/reserves`)
      .send({ value: '10', description: 'Cofrinho' })
      .expect(201);
    const raw = await deps.prisma.$queryRawUnsafe<{ d: Buffer }[]>(
      'SELECT description AS d FROM reserva_financeira',
    );
    expect(Buffer.from(raw[0]!.d).toString('utf8')).not.toContain('Cofrinho');
    await s.send('delete', `${V}/me`).send({ confirm: 'EXCLUIR' }).expect(204);
    expect(await deps.prisma.user.count()).toBe(0);
    expect(await deps.prisma.reserve.count()).toBe(0);
    const keys = await infra().redis.keys('*');
    expect(keys.filter((k) => /^(sess:|cache:|user_sessions:)/.test(k))).toEqual([]);
  });
});

describe('T-13.2 – rate limit e rota de teste', () => {
  it('limites da SPEC-02 §6: login 10/min e exclusão de conta 3/h', async () => {
    const { app } = buildApp();
    for (let i = 0; i < 10; i++) await request(app).get(`${V}/auth/google`).expect(302);
    expect((await request(app).get(`${V}/auth/google`)).status).toBe(429);
    const s = await loginAccepted(app);
    for (let i = 0; i < 3; i++)
      await s.send('delete', `${V}/me`).send({ confirm: 'nao' }).expect(400);
    expect((await s.send('delete', `${V}/me`).send({ confirm: 'nao' })).status).toBe(429);
  });

  it('rota de login de teste ausente em produção', async () => {
    const { app } = buildApp({ env: { NODE_ENV: 'production' } });
    const res = await request(app)
      .post(`${V}/test/login`)
      .set('X-Forwarded-Proto', 'https')
      .send({ email: 'a@b.com' });
    expect(res.status).toBe(404);
  });
});
