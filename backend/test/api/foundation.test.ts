import express from 'express';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { errorHandler } from '../../src/http/middlewares/errors.js';
import { requestId } from '../../src/http/middlewares/requestId.js';
import { buildApp, closeAll } from '../helpers/app.js';
import { captureLogger } from '../helpers/logCapture.js';

afterAll(closeAll);

describe('T-01.7 – app Express (SPEC-01 §5)', () => {
  const { app } = buildApp();

  it('GET /api/v1/health → 200 {"status":"ok"}', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('manda CSP, nosniff, no-referrer, no-store e X-Request-Id', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['strict-transport-security']).toBeUndefined();
  });

  it('manda HSTS em produção', async () => {
    const { app: prod } = buildApp({ env: { NODE_ENV: 'production' } });
    const res = await request(prod).get('/api/v1/health').set('X-Forwarded-Proto', 'https');
    expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
  });

  it('redireciona http → https em produção', async () => {
    const { app: prod } = buildApp({ env: { NODE_ENV: 'production' } });
    const res = await request(prod).get('/api/v1/health').set('X-Forwarded-Proto', 'http');
    expect(res.status).toBe(308);
  });

  it('T-01.5 – rota inexistente → 404 no formato único', async () => {
    const res = await request(app).get('/api/v1/nao-existe');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
    expect(typeof res.body.error.message).toBe('string');
  });

  it('corpo > 10 KB → 413', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ x: 'a'.repeat(11 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('JSON malformado → 400', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"x":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('T-01.5 – tratador de erros', () => {
  it('erro lançado → 500 genérico, sem stack na resposta', async () => {
    const cap = captureLogger();
    const app = express();
    app.use(requestId);
    app.get('/boom', () => {
      throw new Error('segredo interno R$ 1234');
    });
    app.use(errorHandler(cap.logger));
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('segredo');
    expect(JSON.stringify(res.body)).not.toContain('at ');
    expect(cap.text()).toContain('erro interno');
    expect(cap.text()).not.toContain('1234');
  });
});

describe('T-01.6 – logger sem dados pessoais', () => {
  it('o log de acesso não contém cookie nem corpo', async () => {
    const cap = captureLogger();
    const { app } = buildApp({ logger: cap.logger });
    await request(app)
      .post('/api/v1/health')
      .set('Cookie', '__Host-safe_sid=sessao-secreta')
      .set('X-SAFE-CSRF', 'csrf-secreto')
      .send({ email: 'pessoa@exemplo.com', value: '1600.00' });
    const text = cap.text();
    expect(text).toContain('"route"');
    expect(text).not.toContain('sessao-secreta');
    expect(text).not.toContain('csrf-secreto');
    expect(text).not.toContain('pessoa@exemplo.com');
    expect(text).not.toContain('1600');
  });

  it('loga a rota parametrizada, não a URL', async () => {
    const cap = captureLogger();
    const { app } = buildApp({ logger: cap.logger });
    await request(app).get('/api/v1/health');
    const line = JSON.parse(cap.lines[0] ?? '{}');
    expect(line.route).toBe('/api/v1/health');
    expect(line.status).toBe(200);
    expect(line.requestId).toBeDefined();
  });

  it('redige campos sensíveis mesmo quando alguém loga um objeto', () => {
    const cap = captureLogger();
    cap.logger.info({ user: { email: 'x@y.com' }, item: { value: '99.00' } }, 'teste');
    expect(cap.text()).not.toContain('x@y.com');
    expect(cap.text()).not.toContain('99.00');
  });
});
