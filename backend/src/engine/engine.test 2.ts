import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, withConfig } from './config.js';
import { Decimal } from './decimal.js';
import { diagnose } from './diagnose.js';
import { InsufficientDataError } from './errors.js';
import { computeIndicators, totals } from './indicators.js';
import { bandOf, computeIre } from './ire.js';
import { normalize } from './normalize.js';
import { elapsedMonths, monthLabel } from './time.js';
import type { BudgetSnapshot, Risks } from './types.js';
import { ARTICLE_SNAPSHOT } from './__fixtures__/article.js';

const d = (v: string | number) => new Decimal(v);
const snap = (
  o: Partial<Record<'income' | 'expense' | 'installment' | 'balance' | 'reserve', string>>,
): BudgetSnapshot => ({
  incomes: o.income ? [d(o.income)] : [],
  expenses: o.expense ? [d(o.expense)] : [],
  debts: o.installment
    ? [{ id: 1, installment: d(o.installment), remaining: 12, balance: d(o.balance ?? '0') }]
    : [],
  reserves: o.reserve ? [d(o.reserve)] : [],
  referenceDate: '2026-10-29',
});
const sat = { cr: false, cp: false, lf: false, ne: false };
const risksFor = (cr: string): Risks => ({
  cr: d(cr),
  cp: d(0),
  lf: d(0),
  ne: d(0),
  saturated: sat,
});

describe('T-05.8 – T2: fronteiras de faixa (arredondamento half-up)', () => {
  // Só R_cr ≠ 0 com peso 0,40: raw = 0,4·R_cr.
  it.each([
    ['0.2049', 1, '0.20'],
    ['0.2050', 2, '0.21'],
    ['0.4049', 2, '0.40'],
    ['0.4050', 3, '0.41'],
    ['0.6049', 3, '0.60'],
    ['0.6050', 4, '0.61'],
    ['0.8049', 4, '0.80'],
    ['0.8050', 5, '0.81'],
  ])('raw %s → faixa %i (%s)', (raw, band, rounded) => {
    const r = computeIre(risksFor(d(raw).div('0.4').toString()), DEFAULT_CONFIG);
    expect(r.raw.equals(d(raw))).toBe(true);
    expect(r.rounded.toFixed(2)).toBe(rounded);
    expect(r.band).toBe(band);
  });

  it('IRE 1 → faixa 5 e IRE 0 → faixa 1', () => {
    expect(bandOf(d(1), DEFAULT_CONFIG)).toBe(5);
    expect(bandOf(d(0), DEFAULT_CONFIG)).toBe(1);
  });
});

describe('T-05.8 – T3: saturações', () => {
  const risks = (o: Parameters<typeof snap>[0]) => {
    const t = totals(snap(o));
    return normalize(computeIndicators(t), t, DEFAULT_CONFIG);
  };

  it('cr = 0,75 → R_cr 1 e saturado', () => {
    const r = risks({ income: '4000', installment: '3000' });
    expect(r.cr.equals(1)).toBe(true);
    expect(r.saturated.cr).toBe(true);
  });

  it('RNF – D-06: cp = −600 com R_m 4000 → R_cp 1 (não 1,5) e saturado', () => {
    const r = risks({ income: '4000', expense: '4600' });
    expect(r.cp.equals(1)).toBe(true);
    expect(r.saturated.cp).toBe(true);
  });

  it('cp ≥ 30% da renda → R_cp 0 e saturado', () => {
    const r = risks({ income: '4000', expense: '2800' });
    expect(r.cp.isZero()).toBe(true);
    expect(r.saturated.cp).toBe(true);
  });

  it('lf = 8 → R_lf 0 e saturado', () => {
    const r = risks({ income: '4000', expense: '1000', reserve: '8000' });
    expect(r.lf.isZero()).toBe(true);
    expect(r.saturated.lf).toBe(true);
  });

  it('ne = 20 → R_ne 1 e saturado', () => {
    const r = risks({ income: '1000', installment: '10', balance: '20000' });
    expect(r.ne.equals(1)).toBe(true);
    expect(r.saturated.ne).toBe(true);
  });

  it('valores no meio da escala não são saturados', () => {
    const r = diagnose(ARTICLE_SNAPSHOT).risks;
    expect(r.saturated).toEqual({ cr: false, cp: true, lf: false, ne: false });
  });
});

describe('T-05.8 – T4: casos-limite', () => {
  it('renda 0 → InsufficientDataError', () => {
    expect(() => diagnose(snap({ expense: '100' }))).toThrow(InsufficientDataError);
  });

  it('D-10: D = 0 → lf null e R_lf 0', () => {
    const r = diagnose(snap({ income: '3000', reserve: '500' }));
    expect(r.indicators.lf).toBeNull();
    expect(r.risks.lf.isZero()).toBe(true);
    expect(r.risks.saturated.lf).toBe(false);
  });

  it('RF08 – sem dívidas → cr 0 e ne 0', () => {
    const r = diagnose(snap({ income: '3000', expense: '1000', reserve: '1000' }));
    expect(r.indicators.cr.isZero()).toBe(true);
    expect(r.indicators.ne.isZero()).toBe(true);
  });

  it('tudo ótimo → IRE 0 e contributions null', () => {
    const r = diagnose(snap({ income: '10000', expense: '1000', reserve: '60000' }));
    expect(r.ire.raw.isZero()).toBe(true);
    expect(r.ire.band).toBe(1);
    expect(r.contributions).toBeNull();
  });

  it('vários itens de cada tipo são somados', () => {
    const s: BudgetSnapshot = {
      ...ARTICLE_SNAPSHOT,
      incomes: [d('3000'), d('1000')],
      expenses: [d('1500'), d('500')],
      reserves: [d('5000'), d('1000')],
    };
    expect(diagnose(s).ire.raw.equals(d('0.1925'))).toBe(true);
  });
});

describe('T-05.8 – T5: mínimo existencial (R$ 600)', () => {
  it.each([
    ['599.99', true],
    ['600.00', false],
    ['600.01', false],
  ])('renda residual %s → abaixo do mínimo: %s', (residual, below) => {
    const income = d(residual).plus(1000).toString();
    const r = diagnose(snap({ income, installment: '1000', balance: '1000' }));
    expect(r.residualIncome.equals(d(residual))).toBe(true);
    expect(r.critical.belowMinimumExistential).toBe(below);
  });

  it('cp ≤ 0 → negativeCapacity', () => {
    expect(diagnose(snap({ income: '2000', expense: '2000' })).critical.negativeCapacity).toBe(
      true,
    );
  });
});

const money = fc.integer({ min: 0, max: 10_000_000 }).map((c) => d(c).div(100));
const snapshotArb = fc.record({
  incomes: fc
    .array(money, { minLength: 1, maxLength: 3 })
    .filter((xs) => xs.some((x) => x.greaterThan(0))),
  expenses: fc.array(money, { maxLength: 4 }),
  debts: fc.array(
    fc.record({
      id: fc.integer(),
      installment: money.filter((x) => x.greaterThan(0)),
      remaining: fc.integer({ min: 1, max: 600 }),
      balance: money,
    }),
    { maxLength: 4 },
  ),
  reserves: fc.array(money, { maxLength: 3 }),
  referenceDate: fc.constant('2026-10-29'),
});

describe('T-05.8 – T6: propriedades (fast-check, 1000 casos)', () => {
  it('0 ≤ IRE ≤ 1, cada R_k em [0, 1], Σ C_i = 1 e determinística', () => {
    fc.assert(
      fc.property(snapshotArb, (s) => {
        const r = diagnose(s);
        expect(r.ire.raw.greaterThanOrEqualTo(0) && r.ire.raw.lessThanOrEqualTo(1)).toBe(true);
        for (const k of ['cr', 'cp', 'lf', 'ne'] as const) {
          expect(r.risks[k].greaterThanOrEqualTo(0) && r.risks[k].lessThanOrEqualTo(1)).toBe(true);
        }
        if (r.contributions) {
          const total = r.contributions.reduce((acc, c) => acc.plus(c.share), d(0));
          expect(total.minus(1).abs().lessThan('1e-30')).toBe(true);
          expect(r.contributions.some((c) => c.isMain)).toBe(true);
        }
        const again = diagnose(s);
        expect(again.ire.raw.equals(r.ire.raw)).toBe(true);
        expect(again.ire.band).toBe(r.ire.band);
      }),
      { numRuns: 1000 },
    );
  });
});

describe('T-05.7 – T7: elapsedMonths (D-03)', () => {
  it.each([
    ['2026-10-29', '2026-10-29', 0],
    ['2026-10-29', '2026-11-28', 0],
    ['2026-10-29', '2026-11-29', 1],
    ['2026-10-29', '2026-12-28', 1],
    ['2026-10-29', '2026-12-29', 2],
    ['2026-11-15', '2027-01-15', 2],
    ['2026-12-31', '2027-01-30', 0],
    ['2026-12-31', '2027-01-31', 1],
    ['2026-01-31', '2026-02-28', 0],
    ['2026-01-31', '2026-03-30', 1],
    ['2026-10-29', '2026-08-29', 0],
  ])('%s → %s = %i', (from, to, months) => {
    expect(elapsedMonths(from, to)).toBe(months);
  });

  it('rejeita data fora do formato', () => {
    expect(() => elapsedMonths('29/10/2026', '2026-11-01')).toThrow();
  });

  it('rótulos de mês com virada de ano', () => {
    expect(monthLabel('2026-10-29', 1)).toBe('nov/2026');
    expect(monthLabel('2026-10-29', 2)).toBe('dez/2026');
    expect(monthLabel('2026-10-29', 3)).toBe('jan/2027');
    expect(monthLabel('2026-10-29', 15)).toBe('jan/2028');
  });
});

describe('T-05.8 – T8: configuração', () => {
  it('withConfig com pesos alterados muda o resultado e não altera DEFAULT_CONFIG', () => {
    const cfg = withConfig({ weights: { cr: d('0.10'), lf: d('0.50') } });
    const changed = diagnose(ARTICLE_SNAPSHOT, cfg);
    expect(changed.ire.raw.equals(d('0.2825'))).toBe(true); // 0,1·0,2 + 0,5·0,5 + 0,1·0,125
    expect(DEFAULT_CONFIG.weights.cr.equals(d('0.40'))).toBe(true);
    expect(diagnose(ARTICLE_SNAPSHOT).ire.raw.equals(d('0.1925'))).toBe(true);
  });

  it('DEFAULT_CONFIG é congelado', () => {
    expect(Object.isFrozen(DEFAULT_CONFIG)).toBe(true);
    expect(Object.isFrozen(DEFAULT_CONFIG.weights)).toBe(true);
    expect(() => {
      (DEFAULT_CONFIG.weights as { cr: Decimal }).cr = d(1);
    }).toThrow();
  });

  it('pesos somam 1', () => {
    const w = DEFAULT_CONFIG.weights;
    expect(w.cr.plus(w.cp).plus(w.lf).plus(w.ne).equals(1)).toBe(true);
  });
});
