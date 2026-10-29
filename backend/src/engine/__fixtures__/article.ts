import { Decimal } from '../decimal.js';
import type { BudgetSnapshot } from '../types.js';

const d = (v: string) => new Decimal(v);

/** Caso de referência do artigo (PRD §6.6): R_m 4000, D 2000, P 400, S 6000, Res 6000. */
export const ARTICLE_SNAPSHOT: BudgetSnapshot = {
  incomes: [d('4000')],
  expenses: [d('2000')],
  debts: [{ id: 1, installment: d('400'), remaining: 10, balance: d('6000') }],
  reserves: [d('6000')],
  referenceDate: '2026-10-29',
};

export const ARTICLE_SIMULATION = {
  value: d('6000'),
  installments: 12,
  installmentValue: d('600'),
};
