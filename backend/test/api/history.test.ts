import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Decimal } from '../../src/engine/decimal.js';
import { trendOf } from '../../src/modules/history/service.js';
import { buildApp, closeAll, loginAccepted, resetAll } from '../helpers/app.js';

beforeEach(resetAll);
afterAll(closeAll);

const V = '/api/v1';

describe('T-09.1 – GET /history (SPEC-09 §4)', () => {
  it('3 dias de alterações → 3 pontos em ordem; várias no mesmo dia → 1 ponto com o último valor', async () => {
    const { app, clock } = buildApp();
    let s = await loginAccepted(app);
    const inc = await s.send('post', `${V}/incomes`).send({ monthValue: '4000' }).expect(201);
    for (const [day, value] of [
      ['2026-10-30', '1000'],
      ['2026-10-31', '3000'],
    ] as const) {
      clock.set(`${day}T15:00:00Z`);
      s = await loginAccepted(app);
      await s.send('put', `${V}/incomes/${inc.body.id}`).send({ monthValue: '4000' }).expect(200);
      await s
        .send('post', `${V}/expenses`)
        .send({ category: 'OUTROS', type: 'VARIAVEL', value })
        .expect(201);
    }
    const res = await s.agent.get(`${V}/history`).expect(200);
    expect(res.body.points.map((p: { date: string }) => p.date)).toEqual([
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
    ]);
    expect(res.body.points[2]).toMatchObject({
      band: expect.any(Number),
      label: expect.any(String),
    });
    expect(res.body.trend).toBe('PIORANDO');
  });

  it('0 pontos → lista vazia e INSUFICIENTE; período inválido ou maior que 366 dias → 400', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    const empty = await s.agent.get(`${V}/history`).expect(200);
    expect(empty.body).toEqual({ points: [], trend: 'INSUFICIENTE' });
    expect((await s.agent.get(`${V}/history?from=2025-01-01&to=2026-10-29`)).status).toBe(400);
    expect((await s.agent.get(`${V}/history?from=29/10/2026`)).status).toBe(400);
    expect((await s.agent.get(`${V}/history?from=2026-10-29&to=2026-10-01`)).status).toBe(400);
  });

  it('histórico de outro usuário nunca aparece', async () => {
    const { app } = buildApp();
    const a = await loginAccepted(app, 'a@exemplo.com');
    const b = await loginAccepted(app, 'b@exemplo.com');
    await a.send('post', `${V}/incomes`).send({ monthValue: '4000' }).expect(201);
    expect((await b.agent.get(`${V}/history`)).body.points).toEqual([]);
  });

  it.each([
    [['0.40'], 'INSUFICIENTE'],
    [['0.40', '0.35'], 'MELHORANDO'],
    [['0.40', '0.44'], 'ESTAVEL'],
    [['0.40', '0.45'], 'PIORANDO'],
  ])('trend %j → %s', (risks, trend) => {
    expect(trendOf(risks.map((r) => new Decimal(r)))).toBe(trend);
  });
});
