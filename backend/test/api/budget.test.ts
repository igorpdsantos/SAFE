import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { cacheKeys } from '../../src/lib/cache.js';
import { buildApp, closeAll, infra, login, loginAccepted, resetAll } from '../helpers/app.js';

beforeEach(resetAll);
afterAll(closeAll);

const V = '/api/v1';
const samples = {
  incomes: {
    create: { monthValue: '4000.00', description: 'Salário' },
    update: { monthValue: '4200' },
  },
  expenses: {
    create: { category: 'MORADIA', type: 'FIXA', value: '1200.00', description: 'Aluguel' },
    update: { category: 'MORADIA', type: 'FIXA', value: '1300.00' },
  },
  debts: {
    create: {
      category: 'CREDIARIO',
      installmentValue: '400.00',
      remainingInstallments: 10,
      totalInstallments: 12,
      description: 'Notebook',
    },
    update: {
      category: 'CREDIARIO',
      installmentValue: '400.00',
      remainingInstallments: 9,
      totalInstallments: 12,
    },
  },
  reserves: { create: { value: '6000.00', description: 'Poupança' }, update: { value: '6500.00' } },
} as const;
type Kind = keyof typeof samples;
const KINDS = Object.keys(samples) as Kind[];

describe('T-04.8 – CRUD do orçamento (SPEC-04 §7)', () => {
  it.each(KINDS)('%s: cria, lista, lê, edita e exclui', async (kind) => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    const created = await s.send('post', `${V}/${kind}`).send(samples[kind].create).expect(201);
    expect(created.body.id).toBeGreaterThan(0);
    expect(created.body.description).toBe(samples[kind].create.description);
    const list = await s.agent.get(`${V}/${kind}`).expect(200);
    expect(list.body.items).toHaveLength(1);
    await s.agent.get(`${V}/${kind}/${created.body.id}`).expect(200);
    const updated = await s
      .send('put', `${V}/${kind}/${created.body.id}`)
      .send(samples[kind].update)
      .expect(200);
    expect(updated.body.description).toBeNull(); // PUT substitui tudo (FA01)
    await s.send('delete', `${V}/${kind}/${created.body.id}`).expect(204);
    expect((await s.agent.get(`${V}/${kind}`)).body.items).toEqual([]);
  });

  it('formato da renda: decimais como string', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    const res = await s.send('post', `${V}/incomes`).send({ monthValue: '1600.5' }).expect(201);
    expect(res.body).toEqual({ id: res.body.id, description: null, monthValue: '1600.50' });
  });

  it.each(KINDS)('IDOR: %s de outro usuário → 404 em GET, PUT e DELETE', async (kind) => {
    const { app, deps } = buildApp();
    const a = await loginAccepted(app, 'a@exemplo.com');
    const b = await loginAccepted(app, 'b@exemplo.com');
    const item = await a.send('post', `${V}/${kind}`).send(samples[kind].create).expect(201);
    const id = item.body.id;
    expect((await b.agent.get(`${V}/${kind}/${id}`)).status).toBe(404);
    expect((await b.send('put', `${V}/${kind}/${id}`).send(samples[kind].update)).status).toBe(404);
    expect((await b.send('delete', `${V}/${kind}/${id}`)).status).toBe(404);
    expect((await b.agent.get(`${V}/${kind}`)).body.items).toEqual([]);
    expect((await a.agent.get(`${V}/${kind}/${id}`)).body.description).toBe(
      samples[kind].create.description,
    );
    expect(
      await deps.prisma.auditLog.count({
        where: { userId: b.userId, operation: { in: ['UPDATE', 'DELETE'] } },
      }),
    ).toBe(0);
  });

  it('id inválido → 404', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    expect((await s.agent.get(`${V}/debts/abc`)).status).toBe(404);
    expect((await s.agent.get(`${V}/debts/999`)).status).toBe(404);
  });

  it('sem termos aceitos → 403 TERMS_REQUIRED; sem sessão → 401', async () => {
    const { app } = buildApp();
    const s = await login(app);
    const res = await s.agent.get(`${V}/incomes`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TERMS_REQUIRED');
    expect((await request(app).get(`${V}/incomes`)).status).toBe(401);
  });

  it('escrita sem CSRF → 403', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    expect((await s.agent.post(`${V}/incomes`).send({ monthValue: '10' })).status).toBe(403);
  });
});

describe('T-04.8 – validações (SPEC-04 §2)', () => {
  it.each([
    ['incomes', { monthValue: '0' }, 'monthValue'],
    ['incomes', { monthValue: '-1' }, 'monthValue'],
    ['incomes', { monthValue: '1,5' }, 'monthValue'],
    ['incomes', { monthValue: '1e9' }, 'monthValue'],
    ['incomes', { monthValue: 'NaN' }, 'monthValue'],
    ['incomes', { monthValue: 1600 }, 'monthValue'],
    ['incomes', { monthValue: '10000000.01' }, 'monthValue'],
    ['incomes', { monthValue: '10', description: 'x'.repeat(61) }, 'description'],
    ['incomes', { monthValue: '10', description: 'linha 1\nlinha 2' }, 'description'],
    ['expenses', { category: 'FESTA', type: 'FIXA', value: '1' }, 'category'],
    ['expenses', { category: 'LAZER', type: 'MENSAL', value: '1' }, 'type'],
    [
      'debts',
      { category: 'OUTROS', installmentValue: '0', remainingInstallments: 1 },
      'installmentValue',
    ],
    [
      'debts',
      { category: 'OUTROS', installmentValue: '10', remainingInstallments: 601 },
      'remainingInstallments',
    ],
    [
      'debts',
      { category: 'OUTROS', installmentValue: '10', remainingInstallments: 1.5 },
      'remainingInstallments',
    ],
    [
      'debts',
      {
        category: 'OUTROS',
        installmentValue: '10',
        remainingInstallments: 10,
        totalInstallments: 5,
      },
      'totalInstallments',
    ],
    [
      'debts',
      { category: 'OUTROS', installmentValue: '10', remainingInstallments: 1, balanceDue: '-5' },
      'balanceDue',
    ],
    ['reserves', { value: '-0.01' }, 'value'],
  ])('%s %j → 400 no campo %s e nada gravado', async (kind, body, field) => {
    const { app, deps } = buildApp();
    const s = await loginAccepted(app);
    const res = await s.send('post', `${V}/${kind}`).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.fields)).toContain(field);
    expect(res.body.error.fields[field]).toMatch(/[A-Za-zÀ-ú]/);
    expect(await deps.prisma.auditLog.count({ where: { operation: 'CREATE' } })).toBe(0);
  });

  it('mensagem de erro diz o que fazer (SPEC-15 L9)', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    const res = await s.send('post', `${V}/incomes`).send({ monthValue: '0' });
    expect(res.body.error.fields.monthValue).toBe(
      'Digite um valor maior que zero, por exemplo 2.500,00',
    );
  });

  it('descrição vazia vira null; reserva e despesa aceitam zero', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    const r = await s
      .send('post', `${V}/reserves`)
      .send({ value: '0', description: '   ' })
      .expect(201);
    expect(r.body.description).toBeNull();
    await s
      .send('post', `${V}/expenses`)
      .send({ category: 'LAZER', type: 'VARIAVEL', value: '0.00' })
      .expect(201);
  });

  it('limite de quantidade: a 21ª renda → 400 com mensagem clara', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    for (let i = 0; i < 20; i++)
      await s.send('post', `${V}/incomes`).send({ monthValue: '100' }).expect(201);
    const res = await s.send('post', `${V}/incomes`).send({ monthValue: '100' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('20 rendas');
  });
});

describe('T-04.8 – descrição criptografada (S-05)', () => {
  it('no banco é bytea ilegível; a API devolve o texto', async () => {
    const { app, deps } = buildApp();
    const s = await loginAccepted(app);
    await s.send('post', `${V}/debts`).send(samples.debts.create).expect(201);
    const rows = await deps.prisma.$queryRawUnsafe<{ description: Buffer }[]>(
      'SELECT description FROM divida',
    );
    const raw = Buffer.from(rows[0]!.description);
    expect(raw.toString('utf8')).not.toContain('Notebook');
    expect(raw.length).toBe(12 + 'Notebook'.length + 16);
    const list = await s.agent.get(`${V}/debts`);
    expect(list.body.items[0].description).toBe('Notebook');
  });
});

describe('T-04.8 – parcelas restantes e saldo (D-03, D-04)', () => {
  it('10 parcelas em 29/10 → 10 hoje; 29/12 → 8; 29/08 do ano seguinte → 0 e inativa', async () => {
    const { app, clock } = buildApp();
    const s = await loginAccepted(app);
    const created = await s.send('post', `${V}/debts`).send(samples.debts.create).expect(201);
    expect(created.body).toMatchObject({
      referenceDate: '2026-10-29',
      remainingNow: 10,
      active: true,
      balanceUsed: '4000.00',
    });
    // Cada salto no tempo expira a sessão (30 min ociosa): entra de novo com o mesmo usuário.
    clock.set('2026-12-29T15:00:00Z');
    const later = await loginAccepted(app);
    let item = (await later.agent.get(`${V}/debts/${created.body.id}`)).body;
    expect(item).toMatchObject({ remainingNow: 8, active: true, balanceUsed: '3200.00' });
    clock.set('2027-08-29T15:00:00Z');
    const fresh = await loginAccepted(app, 'pessoa@exemplo.com');
    item = (await fresh.agent.get(`${V}/debts/${created.body.id}`)).body;
    expect(item).toMatchObject({ remainingNow: 0, active: false, balanceUsed: '0.00' });
  });

  it('balanceDue informado é usado no lugar de parcela × restantes', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    const res = await s
      .send('post', `${V}/debts`)
      .send({ ...samples.debts.create, balanceDue: '6000' })
      .expect(201);
    expect(res.body.balanceUsed).toBe('6000.00');
    expect(res.body.balanceDue).toBe('6000.00');
  });

  it('mudar as parcelas restantes reinicia a reference_date; mudar só o valor, não', async () => {
    const { app, clock } = buildApp();
    let s = await loginAccepted(app);
    const created = await s.send('post', `${V}/debts`).send(samples.debts.create).expect(201);
    clock.set('2026-11-15T15:00:00Z');
    s = await loginAccepted(app);
    const sameCount = await s
      .send('put', `${V}/debts/${created.body.id}`)
      .send({ ...samples.debts.create, installmentValue: '450.00' })
      .expect(200);
    expect(sameCount.body.referenceDate).toBe('2026-10-29');
    const newCount = await s
      .send('put', `${V}/debts/${created.body.id}`)
      .send(samples.debts.update)
      .expect(200);
    expect(newCount.body.referenceDate).toBe('2026-11-15');
  });
});

describe('T-04.8 – efeitos de escrita (SPEC-04 §4)', () => {
  it('toda escrita gera auditoria com só os nomes dos campos', async () => {
    const { app, deps } = buildApp();
    const s = await loginAccepted(app);
    const c = await s
      .send('post', `${V}/incomes`)
      .send({ monthValue: '987654.32', description: 'Segredo' })
      .expect(201);
    await s
      .send('put', `${V}/incomes/${c.body.id}`)
      .send({ monthValue: '987654.33', description: 'Segredo' })
      .expect(200);
    await s.send('delete', `${V}/incomes/${c.body.id}`).expect(204);
    const logs = await deps.prisma.auditLog.findMany({
      where: { entity: 'renda' },
      orderBy: { id: 'asc' },
    });
    expect(logs.map((l) => l.operation)).toEqual(['CREATE', 'UPDATE', 'DELETE']);
    expect(logs[1]!.details).toEqual({ fields: ['monthValue'] });
    const dump = JSON.stringify(logs);
    expect(dump).not.toContain('987654');
    expect(dump).not.toContain('Segredo');
  });

  it('escrita apaga o cache de análise e projeção e emite budgetChanged', async () => {
    const { app, deps } = buildApp();
    const s = await loginAccepted(app);
    const seen: number[] = [];
    deps.events.onBudgetChanged((id) => {
      seen.push(id);
    });
    const { redis } = infra();
    await redis.set(cacheKeys.analysis(s.userId), 'x');
    await redis.set(cacheKeys.projection(s.userId), 'x');
    await s.send('post', `${V}/reserves`).send({ value: '10' }).expect(201);
    expect(await redis.exists(cacheKeys.analysis(s.userId), cacheKeys.projection(s.userId))).toBe(
      0,
    );
    expect(seen).toEqual([s.userId]);
  });
});

describe('T-04.7 – snapshot e resumo', () => {
  it('buildSnapshot só com dívidas ativas, usando remainingNow e balanceUsed', async () => {
    const { app, deps, clock } = buildApp();
    const s = await loginAccepted(app);
    await s.send('post', `${V}/incomes`).send({ monthValue: '4000' }).expect(201);
    await s
      .send('post', `${V}/expenses`)
      .send({ category: 'MORADIA', type: 'FIXA', value: '2000' })
      .expect(201);
    await s
      .send('post', `${V}/debts`)
      .send({ category: 'CREDIARIO', installmentValue: '400', remainingInstallments: 10 })
      .expect(201);
    await s
      .send('post', `${V}/debts`)
      .send({ category: 'OUTROS', installmentValue: '100', remainingInstallments: 1 })
      .expect(201);
    await s.send('post', `${V}/reserves`).send({ value: '6000' }).expect(201);
    clock.set('2026-11-29T15:00:00Z');
    const snap = await deps.budget.buildSnapshot(s.userId);
    expect(snap.referenceDate).toBe('2026-11-29');
    expect(snap.debts).toHaveLength(1);
    expect(snap.debts[0]).toMatchObject({ remaining: 9 });
    expect(snap.debts[0]!.balance.toString()).toBe('3600');
    expect(snap.incomes.map(String)).toEqual(['4000']);
  });

  it('GET /budget/summary devolve totais e contagens', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    await s.send('post', `${V}/incomes`).send({ monthValue: '4000' }).expect(201);
    for (const value of ['1000', '600', '400']) {
      await s
        .send('post', `${V}/expenses`)
        .send({ category: 'OUTROS', type: 'VARIAVEL', value })
        .expect(201);
    }
    await s
      .send('post', `${V}/debts`)
      .send({
        category: 'CREDIARIO',
        installmentValue: '400',
        remainingInstallments: 10,
        balanceDue: '6000',
      })
      .expect(201);
    await s.send('post', `${V}/reserves`).send({ value: '6000' }).expect(201);
    const res = await s.agent.get(`${V}/budget/summary`).expect(200);
    expect(res.body).toEqual({
      incomeTotal: '4000.00',
      expenseTotal: '2000.00',
      installmentTotal: '400.00',
      debtBalanceTotal: '6000.00',
      reserveTotal: '6000.00',
      counts: { incomes: 1, expenses: 3, debts: 1, reserves: 1 },
    });
  });
});

describe('T-04.10 – despesa variável com faixa (SPEC-04 §2.6)', () => {
  const faixa = {
    category: 'CONTAS_CASA',
    type: 'VARIAVEL',
    valueMin: '300.00',
    valueMax: '600.50',
  };

  it('persiste X e Y no banco; value fica igual ao máximo; a API devolve os três', async () => {
    const { app, deps } = buildApp();
    const s = await loginAccepted(app);
    const res = await s.send('post', `${V}/expenses`).send(faixa).expect(201);
    expect(res.body).toMatchObject({ value: '600.50', valueMin: '300.00', valueMax: '600.50' });
    const row = await deps.prisma.expense.findFirstOrThrow({ where: { id: res.body.id } });
    expect([row.value, row.valueMin, row.valueMax].map(String)).toEqual(['600.5', '300', '600.5']);
    const list = await s.agent.get(`${V}/expenses`).expect(200);
    expect(list.body.items[0]).toMatchObject({ valueMin: '300.00', valueMax: '600.50' });
  });

  it('despesa fixa continua com valor único e faixa nula', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    const res = await s
      .send('post', `${V}/expenses`)
      .send({ category: 'MORADIA', type: 'FIXA', value: '1200', valueMin: '1', valueMax: '2' })
      .expect(201);
    expect(res.body).toMatchObject({ value: '1200.00', valueMin: null, valueMax: null });
  });

  it('editar de variável para fixa limpa a faixa; de fixa para variável cria a faixa', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    const created = await s.send('post', `${V}/expenses`).send(faixa).expect(201);
    const toFixed = await s
      .send('put', `${V}/expenses/${created.body.id}`)
      .send({ category: 'CONTAS_CASA', type: 'FIXA', value: '450' })
      .expect(200);
    expect(toFixed.body).toMatchObject({ value: '450.00', valueMin: null, valueMax: null });
    const back = await s
      .send('put', `${V}/expenses/${created.body.id}`)
      .send({ ...faixa, valueMin: '100', valueMax: '200' })
      .expect(200);
    expect(back.body).toMatchObject({ value: '200.00', valueMin: '100.00', valueMax: '200.00' });
  });

  it('cliente antigo: variável só com value vira a faixa X = Y = value', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    const res = await s
      .send('post', `${V}/expenses`)
      .send({ category: 'LAZER', type: 'VARIAVEL', value: '100' })
      .expect(201);
    expect(res.body).toMatchObject({ value: '100.00', valueMin: '100.00', valueMax: '100.00' });
  });

  it.each([
    [
      { ...faixa, valueMin: '700' },
      'valueMin',
      'O menor valor não pode ser maior que o maior valor',
    ],
    [
      { ...faixa, valueMin: undefined },
      'valueMin',
      'Digite o menor valor do mês, por exemplo 300,00',
    ],
    [
      { ...faixa, valueMax: undefined },
      'valueMax',
      'Digite o maior valor do mês, por exemplo 600,00',
    ],
    [
      { ...faixa, valueMin: '-1' },
      'valueMin',
      'Digite um valor de zero ou mais, por exemplo 300,00',
    ],
    [
      { category: 'MORADIA', type: 'FIXA' },
      'value',
      'Digite um valor de zero ou mais, por exemplo 150,00',
    ],
  ])('%j → 400 em %s: "%s" e nada gravado', async (body, field, message) => {
    const { app, deps } = buildApp();
    const s = await loginAccepted(app);
    const res = await s.send('post', `${V}/expenses`).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.fields[field]).toBe(message);
    expect(await deps.prisma.expense.count()).toBe(0);
  });

  it('o cálculo usa o máximo: análise e resumo somam Y, não X, e monthlyNumbers traz os 3 cenários', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    await s.send('post', `${V}/incomes`).send({ monthValue: '4000.00' }).expect(201);
    await s
      .send('post', `${V}/expenses`)
      .send({ category: 'MORADIA', type: 'FIXA', value: '1000.00' })
      .expect(201);
    await s.send('post', `${V}/expenses`).send(faixa).expect(201);
    await s
      .send('post', `${V}/debts`)
      .send({ category: 'OUTROS', installmentValue: '400.00', remainingInstallments: 5 })
      .expect(201);
    const summary = await s.agent.get(`${V}/budget/summary`).expect(200);
    expect(summary.body.expenseTotal).toBe('1600.50');
    const analysis = await s.agent.get(`${V}/analysis`).expect(200);
    expect(analysis.body.totals.expenses).toBe('1600.50');
    expect(analysis.body.monthlyNumbers).toEqual({
      fixedExpenses: '1000.00',
      variableExpensesMin: '300.00',
      variableExpensesMax: '600.50',
      freeAfterExpenses: {
        worst: '1999.50', // 4000 - 1000 - 600.50 - 400
        average: '2149.75', // 4000 - 1000 - 450.25 - 400
        best: '2300.00', // 4000 - 1000 - 300.00 - 400
      },
    });
  });

  it('auditoria grava só os nomes dos campos da faixa, nunca os valores', async () => {
    const { app, deps } = buildApp();
    const s = await loginAccepted(app);
    await s.send('post', `${V}/expenses`).send(faixa).expect(201);
    const log = await deps.prisma.auditLog.findFirstOrThrow({
      where: { userId: s.userId, operation: 'CREATE', entity: 'despesa' },
    });
    const text = JSON.stringify(log.details);
    expect(text).toContain('valueMin');
    expect(text).not.toContain('300');
    expect(text).not.toContain('600');
  });

  it('IDOR: outro usuário não vê nem altera a faixa', async () => {
    const { app } = buildApp();
    const a = await loginAccepted(app, 'a@exemplo.com');
    const b = await loginAccepted(app, 'b@exemplo.com');
    const item = await a.send('post', `${V}/expenses`).send(faixa).expect(201);
    expect((await b.agent.get(`${V}/expenses/${item.body.id}`)).status).toBe(404);
    expect((await b.send('put', `${V}/expenses/${item.body.id}`).send(faixa)).status).toBe(404);
  });
});
