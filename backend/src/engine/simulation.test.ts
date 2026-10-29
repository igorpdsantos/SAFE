import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { Decimal } from './decimal.js';
import { InsufficientDataError, SimulationValidationError } from './errors.js';
import { explain } from './explain.js';
import { DEFAULT_CONFIG } from './config.js';
import { simulate, validateSimulation, type SimulationInput } from './simulation.js';
import type { BudgetSnapshot } from './types.js';
import { ARTICLE_SNAPSHOT } from './__fixtures__/article.js';

const d = (v: string | number) => new Decimal(v);
const input = (value: string, installments: number, installmentValue: string): SimulationInput => ({
  value: d(value),
  installments,
  installmentValue: d(installmentValue),
});
const base = (o: {
  income: string;
  expense: string;
  installment?: string;
  reserve?: string;
}): BudgetSnapshot => ({
  incomes: [d(o.income)],
  expenses: [d(o.expense)],
  debts: o.installment
    ? [{ id: 1, installment: d(o.installment), remaining: 10, balance: d(o.installment).times(10) }]
    : [],
  reserves: [d(o.reserve ?? '0')],
  referenceDate: '2026-10-29',
});
const kindOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof SimulationValidationError ? e.kind : 'other';
  }
  return 'ok';
};

describe('T-08.1 – validateSimulation (SPEC-08 §2.1, D-11)', () => {
  it('V = 1000, n = 3, p = 333,33 é aceito (tolerância de 1 centavo por parcela)', () => {
    expect(kindOf(() => validateSimulation(input('1000', 3, '333.33')))).toBe('ok');
  });

  it('V = 1000, n = 3, p = 300 → INCONSISTENT_SIMULATION com a mensagem em pt-BR', () => {
    expect(kindOf(() => validateSimulation(input('1000', 3, '300')))).toBe('INCONSISTENT');
    expect(() => validateSimulation(input('1000', 3, '300'))).toThrow(
      'O total das parcelas (R$ 900,00) é menor que o valor da compra (R$ 1.000,00). Confira os valores.',
    );
  });

  it.each([
    ['0', 3, '10', 'value'],
    ['100', 0, '10', 'installments'],
    ['100', 601, '10', 'installments'],
    ['100', 2.5, '60', 'installments'],
    ['100', 3, '0', 'installmentValue'],
  ])('V=%s n=%s p=%s → erro no campo %s', (v, n, p, field) => {
    try {
      validateSimulation(input(v, n as number, p));
      expect.fail('deveria lançar');
    } catch (e) {
      expect(e).toBeInstanceOf(SimulationValidationError);
      expect((e as SimulationValidationError).kind).toBe('VALIDATION');
      expect(Object.keys((e as SimulationValidationError).fields)).toContain(field);
    }
  });

  it('n = 600 é o limite aceito', () => {
    expect(kindOf(() => validateSimulation(input('600', 600, '1')))).toBe('ok');
  });
});

describe('T-08.4 – desfechos e casos especiais (SPEC-08 §5)', () => {
  it("parcela que leva CP' ≤ 0 → CRITICO mesmo sem mudar de faixa", () => {
    // Folga de R$ 500 vira −R$ 100 com a parcela de R$ 600.
    const s = base({ income: '4000', expense: '3000', installment: '500', reserve: '100000' });
    const r = simulate(s, input('600', 1, '600'));
    expect(r.projected.indicators.cp.toString()).toBe('-100');
    expect(r.outcome).toBe('CRITICO');
    expect(r.alertSeverity).toBe(5);
    expect(r.explanation).toContain('deixaria sua renda sem folga: faltariam R$ 100,00 por mês');
  });

  it('folga já zerada: CRITICO, e a folga não entra como fator porque já está no limite', () => {
    const s = base({ income: '4000', expense: '3000', installment: '1000' });
    const r = simulate(s, input('100', 1, '100'));
    expect(r.outcome).toBe('CRITICO');
    expect(r.factors.find((f) => f.key === 'cp')!.saturatedBoth).toBe(true);
  });

  it('renda residual depois = 599,99 → CRITICO pela regra do mínimo existencial', () => {
    const s = base({ income: '1599.99', expense: '0' });
    const r = simulate(s, input('1000', 1, '1000'));
    expect(r.residualIncomeAfter.toString()).toBe('599.99');
    expect(r.outcome).toBe('CRITICO');
    expect(r.explanation).toContain(
      'Depois das parcelas, sobrariam R$ 599,99 da sua renda, abaixo do valor mínimo de referência de R$ 600,00.',
    );
  });

  it('renda residual depois = 600,00 → não é crítico por essa regra', () => {
    const s = base({ income: '1600', expense: '0', reserve: '100000' });
    const r = simulate(s, input('1000', 1, '1000'));
    expect(r.residualIncomeAfter.toString()).toBe('600');
    expect(r.outcome).not.toBe('CRITICO');
  });

  it('já saturado em CR (≥ 50%): ΔC_cr = 0 com saturatedBoth e variação bruta', () => {
    const s = base({ income: '4000', expense: '0', installment: '2400', reserve: '0' });
    const r = simulate(s, input('1200', 12, '100'));
    const cr = r.factors.find((f) => f.key === 'cr')!;
    expect(cr.delta.isZero()).toBe(true);
    expect(cr.unchanged).toBe(true);
    expect(cr.saturatedBoth).toBe(true);
    expect(cr.before!.toString()).toBe('0.6');
    expect(cr.after!.toString()).toBe('0.625');
  });

  it('ΔIRE = 0 → "não altera", sem participação e sem principais', () => {
    // CR, CP e NE já saturados e a reserva não muda: nada a acrescentar ao índice.
    const s: BudgetSnapshot = {
      incomes: [d(1000)],
      expenses: [d(500)],
      debts: [{ id: 1, installment: d(900), remaining: 12, balance: d(20000) }],
      reserves: [d(0)],
      referenceDate: '2026-10-29',
    };
    const r = simulate(s, input('100', 1, '100'));
    expect(r.deltaIre.isZero()).toBe(true);
    expect(r.factors.every((f) => f.share === null && !f.isMain)).toBe(true);
    expect(r.explanation.startsWith('Esta decisão não altera o seu índice de risco.')).toBe(true);
    expect(r.outcome).toBe('CRITICO');
  });

  it('compra pequena sem mudar de faixa → SEM_AGRAVAMENTO, severidade 0', () => {
    const r = simulate(
      base({ income: '10000', expense: '1000', reserve: '60000' }),
      input('100', 1, '100'),
    );
    expect(r.current.ire.band).toBe(r.projected.ire.band);
    expect(r.outcome).toBe('SEM_AGRAVAMENTO');
    expect(r.alertSeverity).toBe(0);
    expect(r.financialCost.isZero()).toBe(true);
  });

  it('um único fator principal usa o singular', () => {
    const r = simulate(
      base({ income: '10000', expense: '1000', reserve: '60000' }),
      input('2400', 12, '200'),
    );
    expect(r.factors.filter((f) => f.isMain)).toHaveLength(1);
    expect(r.explanation).toMatch(/Esse fator responde por 88,9% do aumento do risco\.$/);
  });

  it('a explicação cita o tamanho das dívidas em meses de renda', () => {
    const r = simulate(
      base({ income: '10000', expense: '1000', reserve: '60000', installment: '100' }),
      input('60000', 120, '500'),
    );
    expect(r.explanation).toContain(
      'aumentaria o total das suas dívidas de 0,1 para 6,1 meses de renda',
    );
  });

  it('a simulação não altera o snapshot recebido', () => {
    const before = JSON.stringify(ARTICLE_SNAPSHOT);
    simulate(ARTICLE_SNAPSHOT, input('6000', 12, '600'));
    expect(JSON.stringify(ARTICLE_SNAPSHOT)).toBe(before);
  });

  it('projeção dupla: sem e com a compra', () => {
    const r = simulate(ARTICLE_SNAPSHOT, input('6000', 12, '600'));
    expect(r.projection.without.points[0]!.free.toString()).toBe('1600');
    expect(r.projection.with.points[0]!.free.toString()).toBe('1000');
  });

  it('sem renda → InsufficientDataError', () => {
    expect(() => simulate({ ...ARTICLE_SNAPSHOT, incomes: [] }, input('100', 1, '100'))).toThrow(
      InsufficientDataError,
    );
  });

  it('explain: sem frase para os principais, usa uma frase genérica', () => {
    const text = explain({
      deltaIre: d('0.01'),
      factors: [{ key: 'lf', before: d(1), after: d(1), share: d(1), isMain: true }],
      residualIncomeAfter: d(1000),
      belowMinimum: false,
      cfg: DEFAULT_CONFIG,
    });
    expect(text).toBe(
      'Esta compra aumentaria o seu índice de risco. Esse fator responde por 100,0% do aumento do risco.',
    );
  });
});

const money = (max: number) => fc.integer({ min: 1, max: max * 100 }).map((c) => d(c).div(100));
const caseArb = fc.record({
  income: money(50_000),
  expense: fc.integer({ min: 0, max: 5_000_000 }).map((c) => d(c).div(100)),
  installment: money(5_000),
  remaining: fc.integer({ min: 1, max: 60 }),
  reserve: fc.integer({ min: 0, max: 10_000_000 }).map((c) => d(c).div(100)),
  n: fc.integer({ min: 1, max: 120 }),
  p: money(5_000),
  withDebt: fc.boolean(),
});

describe('T-08.4 – propriedades da simulação (fast-check, PRD §6.3)', () => {
  it('ΔIRE ≥ 0; ΔC_lf = 0; |Σ ΔC − ΔIRE| < 1e-9', () => {
    fc.assert(
      fc.property(caseArb, (c) => {
        const s: BudgetSnapshot = {
          incomes: [c.income],
          expenses: [c.expense],
          debts: c.withDebt
            ? [
                {
                  id: 1,
                  installment: c.installment,
                  remaining: c.remaining,
                  balance: c.installment.times(c.remaining),
                },
              ]
            : [],
          reserves: [c.reserve],
          referenceDate: '2026-10-29',
        };
        const r = simulate(s, { value: c.p.times(c.n), installments: c.n, installmentValue: c.p });
        expect(r.deltaIre.greaterThanOrEqualTo(0)).toBe(true);
        expect(r.factors.find((f) => f.key === 'lf')!.delta.isZero()).toBe(true);
        const sum = r.factors.reduce((acc, f) => acc.plus(f.delta), d(0));
        expect(sum.minus(r.deltaIre).abs().lessThan('1e-9')).toBe(true);
        for (const f of r.factors) expect(f.delta.greaterThanOrEqualTo(0)).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });
});
