import { Decimal, ZERO } from './decimal.js';
import { InsufficientDataError } from './errors.js';
import type { BudgetSnapshot, Indicators, Totals } from './types.js';

const sum = (values: readonly Decimal[]) => values.reduce((acc, v) => acc.plus(v), ZERO);

/** Somas do snapshot (SPEC-05 §3.1). */
export function totals(s: BudgetSnapshot): Totals {
  return {
    income: sum(s.incomes),
    expenses: sum(s.expenses),
    installments: sum(s.debts.map((d) => d.installment)),
    balance: sum(s.debts.map((d) => d.balance)),
    reserve: sum(s.reserves),
  };
}

/** Indicadores brutos (SPEC-05 §3.2). Sem renda não há o que calcular. */
export function computeIndicators(t: Totals): Indicators {
  if (!t.income.greaterThan(0)) throw new InsufficientDataError('income');
  return {
    cr: t.installments.div(t.income),
    ne: t.balance.div(t.income),
    lf: t.expenses.greaterThan(0) ? t.reserve.div(t.expenses) : null,
    cp: t.income.minus(t.expenses.plus(t.installments)),
  };
}
