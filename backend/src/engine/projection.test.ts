import { describe, expect, it } from 'vitest';
import { Decimal } from './decimal.js';
import { InsufficientDataError } from './errors.js';
import { project } from './projection.js';
import type { BudgetSnapshot } from './types.js';
import { ARTICLE_SNAPSHOT } from './__fixtures__/article.js';

const d = (v: string | number) => new Decimal(v);
const free = (p: ReturnType<typeof project>) => p.points.map((x) => x.free.toString());

describe('T-06.1 – projeção (SPEC-06 §5)', () => {
  it('caso do artigo: FL_1..10 = 1600, FL_11..12 = 2000, Saldo_12 = 26000, H = 12', () => {
    const p = project(ARTICLE_SNAPSHOT);
    expect(p.horizon).toBe(12);
    expect(free(p)).toEqual([...Array(10).fill('1600'), '2000', '2000']);
    expect(p.points[0]!.balance.toString()).toBe('7600');
    expect(p.points[11]!.balance.toString()).toBe('26000');
    expect(p.points[0]!.debtsActive).toBe(1);
    expect(p.points[10]!.debtsActive).toBe(0);
    expect(p.firstNonPositiveFreeMonth).toBeNull();
    expect(p.firstNegativeBalanceMonth).toBeNull();
  });

  it('com extra {600, 12}: FL_1..10 = 1000, FL_11..12 = 1400', () => {
    const p = project(ARTICLE_SNAPSHOT, { installment: d(600), n: 12 });
    expect(free(p)).toEqual([...Array(10).fill('1000'), '1400', '1400']);
    expect(p.points[11]!.debtsActive).toBe(1);
  });

  it('dívida com 18 parcelas → H = 18; simulação com n = 24 → H = 24', () => {
    const s: BudgetSnapshot = {
      ...ARTICLE_SNAPSHOT,
      debts: [{ id: 1, installment: d(400), remaining: 18, balance: d(7200) }],
    };
    expect(project(s).horizon).toBe(18);
    expect(project(s, { installment: d(100), n: 24 }).horizon).toBe(24);
  });

  it('cenário com déficit marca o primeiro mês sem sobra e o primeiro saldo negativo', () => {
    const s: BudgetSnapshot = {
      incomes: [d(3000)],
      expenses: [d(2500)],
      debts: [{ id: 1, installment: d(700), remaining: 12, balance: d(8400) }],
      reserves: [d(500)],
      referenceDate: '2026-10-29',
    };
    const p = project(s);
    expect(p.points[0]!.free.toString()).toBe('-200');
    expect(p.firstNonPositiveFreeMonth).toBe(1);
    expect(p.points[2]!.balance.toString()).toBe('-100');
    expect(p.firstNegativeBalanceMonth).toBe(3);
  });

  it('sobra exatamente zero conta como mês sem sobra', () => {
    const s: BudgetSnapshot = { ...ARTICLE_SNAPSHOT, expenses: [d(3600)] };
    expect(project(s).firstNonPositiveFreeMonth).toBe(1);
  });

  it('rótulos começam no mês seguinte e viram o ano', () => {
    const labels = project(ARTICLE_SNAPSHOT).points.map((p) => p.label);
    expect(labels.slice(0, 4)).toEqual(['nov/2026', 'dez/2026', 'jan/2027', 'fev/2027']);
    expect(labels[11]).toBe('out/2027');
  });

  it('sem renda → InsufficientDataError', () => {
    expect(() => project({ ...ARTICLE_SNAPSHOT, incomes: [] })).toThrow(InsufficientDataError);
  });
});
