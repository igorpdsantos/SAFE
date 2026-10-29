import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ABSOLUTE_MS } from '../../src/modules/auth/sessions.js';
import { buildApp, closeAll, infra, login, ORIGIN, resetAll } from '../helpers/app.js';
import { captureLogger } from '../helpers/logCapture.js';

beforeEach(resetAll);
afterAll(closeAll);

const MIN = 60_000;

/** Faz o fluxo do Google (falso) num agente e devolve a resposta do callback. */
async function googleLogin(
  agent: request.Agent,
  code: string,
  opts: { tamperState?: boolean } = {},
) {
  const start = await agent.get('/api/v1/auth/google').expect(302);
  const state = new URL(start.headers.location as string).searchParams.get('state')!;
  const sentState = opts.tamperState ? `${state}-x` : state;
  return agent.get(
    `/api/v1/auth/google/callback?code=${encodeURIComponent(code)}&state=${sentState}`,
  );
}

const cookiesOf = (res: request.Response): string[] => {
  const raw = res.headers['set-cookie'] as unknown;
  return Array.isArray(raw) ? (raw as string[]) : raw ? [raw as string] : [];
};

describe('T-02.9 – login com Google (SPEC-02 §8)', () => {
  it('cria o usuário no 1º acesso e reaproveita no 2º (mesmo sub, e-mail atualizado)', async () => {
    const { app, deps } = buildApp();
    const first = await googleLogin(request.agent(app), 'ok:sub-1:Primeiro@Exemplo.com');
    expect(first.status).toBe(302);
    expect(first.headers.location).toBe(`${ORIGIN}/termos`);
    const second = await googleLogin(request.agent(app), 'ok:sub-1:novo@exemplo.com');
    expect(second.status).toBe(302);
    const users = await deps.prisma.user.findMany();
    expect(users).toHaveLength(1);
    expect(users[0]!.email).toBe('novo@exemplo.com');
    expect(users[0]!.lastLoginAt).not.toBeNull();
    const logins = await deps.prisma.auditLog.count({ where: { operation: 'LOGIN' } });
    expect(logins).toBe(2);
  });

  it('o /auth/google redireciona para o provedor com o cookie temporário assinado', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/api/v1/auth/google').expect(302);
    expect(res.headers.location).toContain('state=');
    const oauth = cookiesOf(res).find((c) => c.startsWith('safe_oauth='))!;
    expect(oauth).toContain('HttpOnly');
    expect(oauth).toContain('Max-Age=600');
    expect(decodeURIComponent(oauth)).toContain('s:'); // assinado
  });

  it('banco e Redis não guardam tokens do Google', async () => {
    const { app } = buildApp();
    await googleLogin(request.agent(app), 'ok:sub-2:a@b.com');
    const { redis, prisma } = infra();
    const keys = await redis.keys('*');
    expect(keys.every((k) => /^(sess:|user_sessions:|rl:)/.test(k))).toBe(true);
    for (const k of keys.filter((k) => k.startsWith('sess:'))) {
      const v = (await redis.get(k))!;
      expect(Object.keys(JSON.parse(v)).sort()).toEqual([
        'createdAt',
        'csrf',
        'lastSeenAt',
        'userId',
      ]);
    }
    const user = await prisma.user.findFirstOrThrow();
    expect(Object.keys(user).sort()).toEqual([
      'createdAt',
      'email',
      'id',
      'lastLoginAt',
      'oauthSubject',
      'state',
    ]);
  });

  it('state adulterado → /login?erro=invalido; cancelar → erro=cancelado', async () => {
    const { app } = buildApp();
    const tampered = await googleLogin(request.agent(app), 'ok:s:a@b.com', { tamperState: true });
    expect(tampered.headers.location).toBe(`${ORIGIN}/login?erro=invalido`);
    const agent = request.agent(app);
    await agent.get('/api/v1/auth/google');
    const cancel = await agent.get('/api/v1/auth/google/callback?error=access_denied&state=x');
    expect(cancel.headers.location).toBe(`${ORIGIN}/login?erro=cancelado`);
  });

  it('callback sem o cookie temporário → erro=invalido', async () => {
    const { app } = buildApp();
    const res = await request(app).get(
      '/api/v1/auth/google/callback?code=ok:s:a@b.com&state=state-1',
    );
    expect(res.headers.location).toBe(`${ORIGIN}/login?erro=invalido`);
  });

  it('Google indisponível → erro=indisponivel; e-mail não verificado → erro=email', async () => {
    const { app, oidc } = buildApp();
    const down = await googleLogin(request.agent(app), 'down');
    expect(down.headers.location).toBe(`${ORIGIN}/login?erro=indisponivel`);
    const unverified = await googleLogin(request.agent(app), 'unverified:s:a@b.com');
    expect(unverified.headers.location).toBe(`${ORIGIN}/login?erro=email`);
    oidc.available = false;
    const start = await request(app).get('/api/v1/auth/google');
    expect(start.headers.location).toBe(`${ORIGIN}/login?erro=indisponivel`);
  });

  it('conta INATIVO é reativada no login', async () => {
    const { app, deps } = buildApp();
    await googleLogin(request.agent(app), 'ok:sub-3:a@b.com');
    await deps.prisma.user.updateMany({ data: { state: 'INATIVO' } });
    await googleLogin(request.agent(app), 'ok:sub-3:a@b.com');
    expect((await deps.prisma.user.findFirstOrThrow()).state).toBe('ATIVO');
  });
});

describe('T-02.9 – sessão e cookies', () => {
  it('cookie de sessão HttpOnly, SameSite=Lax, Path=/ e sem Max-Age; csrf legível pelo JS', async () => {
    const { app } = buildApp();
    const res = await googleLogin(request.agent(app), 'ok:s:a@b.com');
    const sid = cookiesOf(res).find((c) => c.startsWith('safe_sid='))!;
    expect(sid).toMatch(/HttpOnly/);
    expect(sid).toMatch(/SameSite=Lax/);
    expect(sid).toMatch(/Path=\//);
    expect(sid).not.toMatch(/Max-Age|Expires/);
    const csrf = cookiesOf(res).find((c) => c.startsWith('safe_csrf='))!;
    expect(csrf).not.toMatch(/HttpOnly/);
  });

  it('em produção os cookies usam __Host- e Secure', async () => {
    const { app } = buildApp({ env: { NODE_ENV: 'production' } });
    const agent = request.agent(app);
    const start = await agent
      .get('/api/v1/auth/google')
      .set('X-Forwarded-Proto', 'https')
      .expect(302);
    expect(cookiesOf(start)[0]).toMatch(/^__Host-safe_oauth=.*Secure/);
    const state = new URL(start.headers.location as string).searchParams.get('state')!;
    const cb = await request(app)
      .get(`/api/v1/auth/google/callback?code=ok:s:a@b.com&state=${state}`)
      .set('X-Forwarded-Proto', 'https')
      .set('Cookie', cookiesOf(start)[0]!.split(';')[0]!);
    const sid = cookiesOf(cb).find((c) => c.startsWith('__Host-safe_sid='))!;
    expect(sid).toMatch(/Secure/);
    expect(sid).toMatch(/HttpOnly/);
  });

  it('GET /auth/me sem sessão → 401 UNAUTHENTICATED; com sessão → dados', async () => {
    const { app } = buildApp();
    const anon = await request(app).get('/api/v1/auth/me');
    expect(anon.status).toBe(401);
    expect(anon.body.error.code).toBe('UNAUTHENTICATED');
    const s = await login(app, 'eu@exemplo.com');
    const me = await s.agent.get('/api/v1/auth/me').expect(200);
    expect(me.body).toEqual({ userId: s.userId, email: 'eu@exemplo.com', termsUpToDate: false });
  });

  it('31 min sem requisição → 401 SESSION_EXPIRED', async () => {
    const { app, clock } = buildApp();
    const s = await login(app);
    clock.advance(29 * MIN);
    await s.agent.get('/api/v1/auth/me').expect(200);
    clock.advance(31 * MIN);
    const res = await s.agent.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('8 h de sessão → 401 mesmo com uso contínuo', async () => {
    const { app, clock } = buildApp();
    const s = await login(app);
    for (let elapsed = 0; elapsed < ABSOLUTE_MS; elapsed += 25 * MIN) {
      clock.advance(25 * MIN);
      if (elapsed + 25 * MIN <= ABSOLUTE_MS) await s.agent.get('/api/v1/auth/me').expect(200);
    }
    clock.advance(25 * MIN);
    const res = await s.agent.get('/api/v1/auth/me');
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('novo login gera ID novo e o antigo deixa de funcionar', async () => {
    const { app } = buildApp();
    const agent = request.agent(app);
    const first = await googleLogin(agent, 'ok:s:a@b.com');
    const oldSid = cookiesOf(first)
      .find((c) => c.startsWith('safe_sid='))!
      .split(';')[0]!;
    const second = await googleLogin(agent, 'ok:s:a@b.com');
    const newSid = cookiesOf(second)
      .find((c) => c.startsWith('safe_sid='))!
      .split(';')[0]!;
    expect(newSid).not.toBe(oldSid);
    await request(app).get('/api/v1/auth/me').set('Cookie', oldSid).expect(401);
    await request(app).get('/api/v1/auth/me').set('Cookie', newSid).expect(200);
  });

  it('o Redis guarda o hash do ID, nunca o ID cru', async () => {
    const { app } = buildApp();
    const res = await googleLogin(request.agent(app), 'ok:s:a@b.com');
    const sid = cookiesOf(res)
      .find((c) => c.startsWith('safe_sid='))!
      .split(';')[0]!
      .split('=')[1]!;
    const keys = await infra().redis.keys('*');
    expect(keys.some((k) => k.includes(sid))).toBe(false);
  });
});

describe('T-02.9 – CSRF', () => {
  it('POST sem X-SAFE-CSRF, com valor errado ou com Origin de outro site → 403 CSRF_FAILED', async () => {
    const { app } = buildApp();
    const s = await login(app);
    const cases = [
      () => s.agent.post('/api/v1/auth/logout').set('Origin', ORIGIN),
      () => s.agent.post('/api/v1/auth/logout').set('Origin', ORIGIN).set('X-SAFE-CSRF', 'errado'),
      () =>
        s.agent
          .post('/api/v1/auth/logout')
          .set('Origin', 'https://malicioso.example')
          .set('X-SAFE-CSRF', s.csrf),
      () => s.agent.post('/api/v1/auth/logout').set('X-SAFE-CSRF', s.csrf),
    ];
    for (const req of cases) {
      const res = await req();
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_FAILED');
    }
    await s.agent.get('/api/v1/auth/me').expect(200);
  });

  it('aceita Referer da mesma origem quando falta Origin', async () => {
    const { app } = buildApp();
    const s = await login(app);
    await s.agent
      .post('/api/v1/auth/logout')
      .set('Referer', `${ORIGIN}/conta`)
      .set('X-SAFE-CSRF', s.csrf)
      .expect(204);
  });
});

describe('T-02.9 – logout', () => {
  it('logout: cookie antigo reenviado → 401; resposta tem Clear-Site-Data', async () => {
    const { app, deps } = buildApp();
    const s = await login(app);
    const res = await s.send('post', '/api/v1/auth/logout').expect(204);
    expect(res.headers['clear-site-data']).toBe('"cache", "cookies", "storage"');
    expect(cookiesOf(res).some((c) => c.startsWith('safe_sid=;'))).toBe(true);
    await s.agent.get('/api/v1/auth/me').expect(401);
    expect(await deps.prisma.auditLog.count({ where: { operation: 'LOGOUT' } })).toBe(1);
  });

  it('logout-all derruba as sessões de dois navegadores', async () => {
    const { app, deps } = buildApp();
    const a = await login(app, 'mesmo@exemplo.com');
    const b = await login(app, 'mesmo@exemplo.com');
    await a.agent.get('/api/v1/auth/me').expect(200);
    await b.agent.get('/api/v1/auth/me').expect(200);
    await a.send('post', '/api/v1/auth/logout-all').expect(204);
    await a.agent.get('/api/v1/auth/me').expect(401);
    await b.agent.get('/api/v1/auth/me').expect(401);
    expect(await infra().redis.keys(`user_sessions:${a.userId}`)).toEqual([]);
    expect(await deps.prisma.auditLog.count({ where: { operation: 'LOGOUT_ALL' } })).toBe(1);
  });
});

describe('T-02.6 – rate limit', () => {
  it('11º login no mesmo minuto e IP → 429 com Retry-After', async () => {
    const { app, clock } = buildApp();
    for (let i = 0; i < 10; i++) await request(app).get('/api/v1/auth/google').expect(302);
    const res = await request(app).get('/api/v1/auth/google');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    clock.advance(61_000);
    await request(app).get('/api/v1/auth/google').expect(302);
  });

  it('API autenticada: 121ª requisição no minuto → 429', async () => {
    const { app } = buildApp();
    const s = await login(app);
    for (let i = 0; i < 120; i++) await s.agent.get('/api/v1/auth/me').expect(200);
    expect((await s.agent.get('/api/v1/auth/me')).status).toBe(429);
  });
});

describe('T-02.8 – rota de login de teste', () => {
  it('não existe fora de NODE_ENV=test (404 em produção e desenvolvimento)', async () => {
    for (const NODE_ENV of ['production', 'development'] as const) {
      const { app } = buildApp({ env: { NODE_ENV } });
      const res = await request(app)
        .post('/api/v1/test/login')
        .set('X-Forwarded-Proto', 'https')
        .send({ email: 'a@b.com' });
      expect(res.status).toBe(404);
    }
  });
});

describe('T-02.9 – logs', () => {
  it('nenhum log contém cookie, csrf ou e-mail', async () => {
    const cap = captureLogger();
    const { app } = buildApp({ logger: cap.logger });
    const res = await googleLogin(request.agent(app), 'ok:sub-log:segredo@exemplo.com');
    const sid = cookiesOf(res)
      .find((c) => c.startsWith('safe_sid='))!
      .split(';')[0]!
      .split('=')[1]!;
    const s = await login(app, 'outro@exemplo.com');
    await s.agent.get('/api/v1/auth/me');
    await s.send('post', '/api/v1/auth/logout');
    const text = cap.text();
    expect(text).toContain('"route"');
    for (const secret of ['segredo@exemplo.com', 'outro@exemplo.com', sid, s.csrf]) {
      expect(text).not.toContain(secret);
    }
  });
});
