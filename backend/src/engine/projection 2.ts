import type { Decimal } from './decimal.js';
import { InsufficientDataError } from './errors.js';
import { totals } from './indicators.js';
import { monthLabel } from './time.js';
import type { BudgetSnapshot } from './types.js';

export interface ProjectionPoint {
  month: number; // t = 1..H
  label: string; // 'nov/2026'
  free: Decimal;
  balance: Decimal;
  debtsActive: number;
}

export interface Projection {
  horizon: number;
  points: ProjectionPoint[];
  firstNonPositiveFreeMonth: number | null;
  firstNegativeBalanceMonth: number | null;
}

export interface ExtraInstallment {
  installment: Decimal;
  n: number;
}

/** Fluxo livre e saldo acumulado mês a mês (SPEC-06 §2, PRD §7). t = 1 é o mês seguinte. */
export function project(s: BudgetSnapshot, extra?: ExtraInstallment): Projection {
  const t = totals(s);
  if (!t.income.greaterThan(0)) throw new InsufficientDataError('income');

  const horizon = Math.max(12, ...s.debts.map((d) => d.remaining), extra?.n ?? 0);
  const base = t.income.minus(t.expenses);
  const points: ProjectionPoint[] = [];
  let balance = t.reserve;
  let firstNonPositiveFreeMonth: number | null = null;
  let firstNegativeBalanceMonth: number | null = null;

  for (let month = 1; month <= horizon; month++) {
    const active = s.debts.filter((d) => month <= d.remaining);
    let free = active.reduce((acc, d) => acc.minus(d.installment), base);
    let debtsActive = active.length;
    if (extra && month <= extra.n) {
      free = free.minus(extra.installment);
      debtsActive++;
    }
    balance = balance.plus(free);
    if (firstNonPositiveFreeMonth === null && free.lessThanOrEqualTo(0))
      firstNonPositiveFreeMonth = month;
    if (firstNegativeBalanceMonth === null && balance.lessThan(0))
      firstNegativeBalanceMonth = month;
    points.push({ month, label: monthLabel(s.referenceDate, month), free, balance, debtsActive });
  }

  return { horizon, points, firstNonPositiveFreeMonth, firstNegativeBalanceMonth };
}
