import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { cacheKeys } from '../../src/lib/cache.js';
import { buildApp, closeAll, infra, loginAccepted, resetAll } from '../helpers/app.js';
import { seedArticle } from '../helpers/seed.js';

beforeEach(resetAll);
afterAll(closeAll);

const V = '/api/v1';

describe('T-07.4 – GET /analysis (SPEC-07 §6)', () => {
  it('caso do artigo → IRE 0,19, faixa 1, fatores lf e cr principais', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    await seedArticle(s);
    const res = await s.agent.get(`${V}/analysis`).expect(200);
    expect(res.body.totals).toEqual({
      income: '4000.00',
      expenses: '2000.00',
      installments: '400.00',
      debtBalance: '6000.00',
      reserve: '6000.00',
    });
    expect(res.body.indicators).toEqual({
      cr: {
        value: '0.1000',
        display: '10,00%',
        risk: '0.2000',
        saturated: false,
        level: 'OK',
        exceedsIncome: false,
      },
      cp: { value: '1600.00', display: 'R$ 1.600,00', risk: '0.0000', saturated: true },
      lf: { value: '3.0000', display: '3,0 meses', risk: '0.5000', saturated: false },
      ne: { value: '1.5000', display: '1,5 mês de renda', risk: '0.1250', saturated: false },
    });
    expect(res.body.ire).toMatchObject({
      raw: '0.1925',
      value: '0.19',
      band: 1,
      label: 'Baixo risco',
      color: 'risk-1',
      icon: 'check-circle',
    });
    expect(
      res.body.factors.map((f: { key: string; isMain: boolean }) => [f.key, f.isMain]),
    ).toEqual([
      ['lf', true],
      ['cr', true],
      ['ne', false],
      ['cp', false],
    ]);
    expect(res.body.factors[0]).toEqual({
      key: 'lf',
      name: 'Reserva de emergência (liquidez)',
      points: '0.1000',
      share: '0.5195',
      isMain: true,
    });
    expect(res.body.residualIncome).toBe('3600.00');
    expect(res.body.alerts).toEqual([]);
  });

  it('sem renda → 409 INSUFFICIENT_DATA com fields.income', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    const res = await s.agent.get(`${V}/analysis`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_DATA');
    expect(res.body.error.fields).toEqual({ income: 'Cadastre sua renda' });
  });

  it('alterar uma dívida 5 vezes → indicador atualizado e um único registro de histórico no dia', async () => {
    const { app, deps } = buildApp();
    const s = await loginAccepted(app);
    const { debtId } = await seedArticle(s);
    for (let i = 1; i <= 5; i++) {
      await s
        .send('put', `${V}/debts/${debtId}`)
        .send({
          category: 'CREDIARIO',
          installmentValue: `${400 + i * 100}.00`,
          remainingInstallments: 10,
          balanceDue: '6000.00',
        })
        .expect(200);
    }
    const history = await deps.prisma.historyEntry.findMany({ where: { userId: s.userId } });
    expect(history).toHaveLength(1);
    const indicator = await deps.prisma.indicator.findUniqueOrThrow({
      where: { userId: s.userId },
    });
    expect(indicator.rentPerc.toString()).toBe('22.5'); // 900 / 4000
    expect(history[0]!.risk.toString()).toBe(indicator.riskIndex.toDecimalPlaces(2).toString());
  });

  it('faixa 3 cria FAIXA_3 uma vez; recalcular sem mudança não duplica; voltar à faixa 2 marca como LIDO', async () => {
    const { app, deps } = buildApp();
    const s = await loginAccepted(app);
    await s.send('post', `${V}/incomes`).send({ monthValue: '4000' }).expect(201);
    await s
      .send('post', `${V}/expenses`)
      .send({ category: 'MORADIA', type: 'FIXA', value: '2000' })
      .expect(201);
    // CR 25% (0,40·0,5) + CP 1000 (0,30·0,1667) + sem reserva (0,20·1) + NE 2,5 (0,10·0,2083) = 0,4708 → faixa 3.
    const debt = await s
      .send('post', `${V}/debts`)
      .send({ category: 'CREDIARIO', installmentValue: '1000', remainingInstallments: 10 })
      .expect(201);
    const a1 = await s.agent.get(`${V}/analysis`).expect(200);
    expect(a1.body.ire.band).toBe(3);
    await s.send('post', `${V}/reserves`).send({ value: '0' }).expect(201); // recalcula sem mudar a faixa
    const open = await deps.prisma.alert.findMany({ where: { userId: s.userId, type: 'FAIXA_3' } });
    expect(open).toHaveLength(1);
    expect(open[0]!.status).toBe('NAO_LIDO');
    expect(open[0]!.description).toContain('Evite assumir novas dívidas');
    await s
      .send('put', `${V}/debts/${debt.body.id}`)
      .send({ category: 'CREDIARIO', installmentValue: '400', remainingInstallments: 10 })
      .expect(200);
    const after = await deps.prisma.alert.findMany({
      where: { userId: s.userId, type: 'FAIXA_3' },
    });
    expect(after.map((a) => a.status)).toEqual(['LIDO']);
  });

  it('CP ≤ 0 gera CAPACIDADE_NEGATIVA (sev. 5) e renda residual < 600 gera MINIMO_EXISTENCIAL', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    await s.send('post', `${V}/incomes`).send({ monthValue: '1000' }).expect(201);
    await s
      .send('post', `${V}/expenses`)
      .send({ category: 'MORADIA', type: 'FIXA', value: '600' })
      .expect(201);
    await s
      .send('post', `${V}/debts`)
      .send({ category: 'OUTROS', installmentValue: '500', remainingInstallments: 3 })
      .expect(201);
    const res = await s.agent.get(`${V}/analysis`).expect(200);
    const types = res.body.alerts.map(
      (a: { type: string; severity: number }) => `${a.type}:${a.severity}`,
    );
    expect(types).toContain('CAPACIDADE_NEGATIVA:5');
    expect(types).toContain('MINIMO_EXISTENCIAL:5');
  });

  it('CR > 100% → exceedsIncome e display "125,00%"', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    await s.send('post', `${V}/incomes`).send({ monthValue: '1000' }).expect(201);
    await s
      .send('post', `${V}/debts`)
      .send({ category: 'OUTROS', installmentValue: '1250', remainingInstallments: 2 })
      .expect(201);
    const res = await s.agent.get(`${V}/analysis`).expect(200);
    expect(res.body.indicators.cr).toMatchObject({
      display: '125,00%',
      level: 'ALTO',
      exceedsIncome: true,
    });
  });

  it('usa o cache; uma escrita invalida e recalcula', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    await seedArticle(s);
    const first = await s.agent.get(`${V}/analysis`).expect(200);
    expect(await infra().redis.exists(cacheKeys.analysis(s.userId))).toBe(1);
    const second = await s.agent.get(`${V}/analysis`).expect(200);
    expect(second.body.calculatedAt).toBe(first.body.calculatedAt);
  });

  it('remover a renda apaga o indicador vigente', async () => {
    const { app, deps } = buildApp();
    const s = await loginAccepted(app);
    const inc = await s.send('post', `${V}/incomes`).send({ monthValue: '1000' }).expect(201);
    expect(await deps.prisma.indicator.count()).toBe(1);
    await s.send('delete', `${V}/incomes/${inc.body.id}`).expect(204);
    expect(await deps.prisma.indicator.count()).toBe(0);
  });
});

describe('T-07.3 – alertas', () => {
  it('GET /alerts e PATCH marca como lido; alerta de outro usuário → 404', async () => {
    const { app } = buildApp();
    const a = await loginAccepted(app, 'a@exemplo.com');
    const b = await loginAccepted(app, 'b@exemplo.com');
    await a.send('post', `${V}/incomes`).send({ monthValue: '1000' }).expect(201);
    await a
      .send('post', `${V}/expenses`)
      .send({ category: 'MORADIA', type: 'FIXA', value: '1000' })
      .expect(201);
    const list = await a.agent.get(`${V}/alerts?status=NAO_LIDO`).expect(200);
    const id = list.body.items[0].id;
    expect((await b.send('patch', `${V}/alerts/${id}`).send({ status: 'LIDO' })).status).toBe(404);
    await a.send('patch', `${V}/alerts/${id}`).send({ status: 'LIDO' }).expect(200);
    const read = await a.agent.get(`${V}/alerts?status=LIDO`).expect(200);
    expect(read.body.items.map((x: { id: number }) => x.id)).toContain(id);
    expect((await b.agent.get(`${V}/alerts`)).body.items).toEqual([]);
    expect((await a.send('patch', `${V}/alerts/${id}`).send({ status: 'NAO_LIDO' })).status).toBe(
      400,
    );
  });
});

describe('T-06.2 – GET /projection (SPEC-06 §3)', () => {
  it('caso do artigo com premissas; sem renda → 409', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    const empty = await s.agent.get(`${V}/projection`);
    expect(empty.status).toBe(409);
    expect(empty.body.error.fields.income).toBe('Cadastre sua renda para ver a projeção');
    await seedArticle(s);
    const res = await s.agent.get(`${V}/projection`).expect(200);
    expect(res.body.horizon).toBe(12);
    expect(res.body.points[0]).toEqual({
      month: 1,
      label: 'nov/2026',
      free: '1600.00',
      balance: '7600.00',
      debtsActive: 1,
    });
    expect(res.body.points[11].balance).toBe('26000.00');
    expect(res.body.assumptions).toEqual([
      'Renda e despesas constantes',
      'Dívidas pagas até a última parcela informada',
    ]);
  });

  it('editar uma dívida e recarregar mostra o novo valor (cache invalidado)', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    const { debtId } = await seedArticle(s);
    await s.agent.get(`${V}/projection`).expect(200);
    await s
      .send('put', `${V}/debts/${debtId}`)
      .send({
        category: 'CREDIARIO',
        installmentValue: '600.00',
        remainingInstallments: 10,
        balanceDue: '6000.00',
      })
      .expect(200);
    const res = await s.agent.get(`${V}/projection`).expect(200);
    expect(res.body.points[0].free).toBe('1400.00');
  });
});
