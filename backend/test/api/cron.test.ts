import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp, closeAll, loginAccepted, resetAll } from '../helpers/app.js';
import { seedArticle } from '../helpers/seed.js';

beforeEach(resetAll);
afterAll(closeAll);

const URL = '/api/v1/internal/retention';
const SECRET = 'cron-secret-com-pelo-menos-32-caracteres';

describe('T-01.11 – retenção pelo agendador da Vercel (SPEC-10 §3)', () => {
  it('sem CRON_SECRET configurado a rota não existe', async () => {
    const { app } = buildApp();
    expect((await request(app).get(URL).set('Authorization', `Bearer ${SECRET}`)).status).toBe(404);
  });

  it('sem o segredo ou com segredo errado → 401 e nada roda', async () => {
    const { app } = buildApp({ env: { CRON_SECRET: SECRET } });
    expect((await request(app).get(URL)).status).toBe(401);
    expect(
      (
        await request(app)
          .get(URL)
          .set('Authorization', `Bearer ${SECRET.slice(0, -1)}x`)
      ).status,
    ).toBe(401);
    expect((await request(app).get(URL).set('Authorization', SECRET)).status).toBe(401);
  });

  it('com o segredo roda os jobs e devolve só as contagens', async () => {
    const { app, deps, clock } = buildApp({ env: { CRON_SECRET: SECRET } });
    const s = await loginAccepted(app);
    await seedArticle(s);
    await s
      .send('post', '/api/v1/simulations')
      .send({ value: '6000.00', installments: 12, installmentValue: '600.00' })
      .expect(200);
    await deps.prisma.simulation.updateMany({
      data: { createdAt: new Date(clock.now().getTime() - 366 * 24 * 60 * 60 * 1000) },
    });
    const res = await request(app).get(URL).set('Authorization', `Bearer ${SECRET}`).expect(200);
    expect(res.body.retention).toMatchObject({ purgeOldSimulations: 1 });
    expect(await deps.prisma.simulation.count()).toBe(0);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});
