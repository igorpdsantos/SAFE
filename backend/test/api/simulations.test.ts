import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp, closeAll, loginAccepted, resetAll } from '../helpers/app.js';
import { seedArticle } from '../helpers/seed.js';

beforeEach(resetAll);
afterAll(closeAll);

const V = '/api/v1';
const ARTICLE = { value: '6000.00', installments: 12, installmentValue: '600.00' };

describe('T-08.5 – POST /simulations (SPEC-08 §3)', () => {
  it('caso do artigo devolve o JSON da spec e grava só a simulação', async () => {
    const { app, deps } = buildApp();
    const s = await loginAccepted(app);
    await seedArticle(s);
    const res = await s.send('post', `${V}/simulations`).send(ARTICLE).expect(200);
    expect(res.body).toMatchObject({
      financialCost: '1200.00',
      current: {
        ire: {
          value: '0.19',
          raw: '0.1925',
          band: 1,
          label: 'Baixo risco',
          color: 'risk-1',
          icon: 'check-circle',
        },
      },
      projected: {
        ire: {
          value: '0.38',
          raw: '0.3775',
          band: 2,
          label: 'Risco moderado',
          color: 'risk-2',
          icon: 'info',
        },
      },
      deltaIre: '0.1850',
      outcome: 'AGRAVAMENTO',
      alertSeverity: 2,
      residualIncomeAfter: '3000.00',
    });
    expect(res.body.factors[0]).toEqual({
      key: 'cr',
      name: 'Comprometimento da renda',
      before: '10,00%',
      after: '25,00%',
      riskBefore: '0.2000',
      riskAfter: '0.5000',
      points: '0.1200',
      share: '0.6486',
      isMain: true,
      unchanged: false,
      saturatedBoth: false,
    });
    expect(res.body.factors.map((f: { key: string }) => f.key)).toEqual(['cr', 'cp', 'ne', 'lf']);
    expect(res.body.explanation).toBe(
      'Esta compra elevaria o comprometimento da sua renda com dívidas de 10,0% para 25,0% e reduziria sua folga mensal de R$ 1.600,00 para R$ 1.000,00. Esses fatores respondem por 91,9% do aumento do risco.',
    );
    expect(res.body.projection.with.points[0].free).toBe('1000.00');
    expect(res.body.assumptions).toHaveLength(3);
    const row = await deps.prisma.simulation.findFirstOrThrow();
    expect(row).toMatchObject({ installments: 12, outcome: 'AGRAVAMENTO', state: 'ATIVA' });
    expect(row.currentRisk.toString()).toBe('0.1925');
    expect(row.estimatedRisk.toString()).toBe('0.3775');
  });

  it('T-08.6 – depois de simular, orçamento, análise, histórico e alertas ficam idênticos', async () => {
    const { app, deps } = buildApp();
    const s = await loginAccepted(app);
    await seedArticle(s);
    const read = async () => ({
      incomes: (await s.agent.get(`${V}/incomes`)).body,
      expenses: (await s.agent.get(`${V}/expenses`)).body,
      debts: (await s.agent.get(`${V}/debts`)).body,
      reserves: (await s.agent.get(`${V}/reserves`)).body,
      analysis: (await s.agent.get(`${V}/analysis`)).body,
      history: (await s.agent.get(`${V}/history`)).body,
      indicator: await deps.prisma.indicator.findMany(),
      alerts: await deps.prisma.alert.findMany(),
    });
    const before = await read();
    await s.send('post', `${V}/simulations`).send(ARTICLE).expect(200);
    await s
      .send('post', `${V}/simulations`)
      .send({ value: '50000.00', installments: 10, installmentValue: '5000.00' })
      .expect(200);
    expect(await read()).toEqual(before);
  });

  it('1000 / 3 / 333,33 é aceito; 1000 / 3 / 300 → 400 INCONSISTENT_SIMULATION', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    await seedArticle(s);
    await s
      .send('post', `${V}/simulations`)
      .send({ value: '1000', installments: 3, installmentValue: '333.33' })
      .expect(200);
    const bad = await s
      .send('post', `${V}/simulations`)
      .send({ value: '1000', installments: 3, installmentValue: '300' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('INCONSISTENT_SIMULATION');
    expect(bad.body.error.message).toContain('R$ 900,00');
  });

  it.each([
    [{ value: '0', installments: 3, installmentValue: '10' }, 'value'],
    [{ value: '100', installments: 0, installmentValue: '10' }, 'installments'],
    [{ value: '100', installments: '3', installmentValue: '10' }, 'installments'],
    [{ value: '100', installments: 3, installmentValue: '1e3' }, 'installmentValue'],
  ])('%j → 400 no campo %s', async (body, field) => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    await seedArticle(s);
    const res = await s.send('post', `${V}/simulations`).send(body);
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.fields)).toContain(field);
  });

  it('sem renda → 409 INSUFFICIENT_DATA', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    const res = await s.send('post', `${V}/simulations`).send(ARTICLE);
    expect(res.status).toBe(409);
  });

  it('rate limit: 31ª simulação no minuto → 429', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    await seedArticle(s);
    for (let i = 0; i < 30; i++) await s.send('post', `${V}/simulations`).send(ARTICLE).expect(200);
    expect((await s.send('post', `${V}/simulations`).send(ARTICLE)).status).toBe(429);
  });
});

describe('T-08.5 – GET e PATCH /simulations', () => {
  it('lista as do usuário, descarta, e simulação de outro usuário → 404', async () => {
    const { app } = buildApp();
    const a = await loginAccepted(app, 'a@exemplo.com');
    const b = await loginAccepted(app, 'b@exemplo.com');
    await seedArticle(a);
    const sim = await a.send('post', `${V}/simulations`).send(ARTICLE).expect(200);
    const list = await a.agent.get(`${V}/simulations`).expect(200);
    expect(list.body.items[0]).toMatchObject({
      id: sim.body.id,
      value: '6000.00',
      installments: 12,
      outcome: 'AGRAVAMENTO',
      state: 'ATIVA',
    });
    expect((await b.agent.get(`${V}/simulations`)).body.items).toEqual([]);
    expect(
      (await b.send('patch', `${V}/simulations/${sim.body.id}`).send({ state: 'DESCARTADA' }))
        .status,
    ).toBe(404);
    await a
      .send('patch', `${V}/simulations/${sim.body.id}`)
      .send({ state: 'DESCARTADA' })
      .expect(200);
    expect((await a.agent.get(`${V}/simulations`)).body.items[0].state).toBe('DESCARTADA');
  });
});
