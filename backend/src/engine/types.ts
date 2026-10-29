import type { Decimal } from './decimal.js';

/** Dívida ativa no snapshot (parcelas restantes ≥ 1). */
export interface DebtInput {
  id: number | string;
  installment: Decimal;
  remaining: number;
  balance: Decimal;
}

/** Foto da situação financeira que entra no motor. A data vem aqui: o motor não lê o relógio. */
export interface BudgetSnapshot {
  incomes: Decimal[];
  expenses: Decimal[];
  debts: DebtInput[];
  reserves: Decimal[];
  referenceDate: string; // 'YYYY-MM-DD'
}

export interface EngineConfig {
  weights: { cr: Decimal; cp: Decimal; lf: Decimal; ne: Decimal };
  caps: { cr: Decimal; ne: Decimal; lf: Decimal; cpShare: Decimal };
  bandUpperBounds: readonly [Decimal, Decimal, Decimal, Decimal];
  delta: Decimal;
  minimumExistential: Decimal;
  mainFactorsShare: Decimal;
}

export type IndicatorKey = 'cr' | 'cp' | 'lf' | 'ne';

export interface Totals {
  income: Decimal;
  expenses: Decimal;
  installments: Decimal;
  balance: Decimal;
  reserve: Decimal;
}

export interface Indicators {
  cr: Decimal;
  ne: Decimal;
  lf: Decimal | null; // null se D = 0
  cp: Decimal;
}

export interface Risks {
  cr: Decimal;
  cp: Decimal;
  lf: Decimal;
  ne: Decimal;
  saturated: Record<IndicatorKey, boolean>;
}

export type RiskBand = 1 | 2 | 3 | 4 | 5;

export interface IreResult {
  raw: Decimal;
  rounded: Decimal;
  band: RiskBand;
}

export interface Contribution {
  key: IndicatorKey;
  weighted: Decimal; // R_i·W_i
  share: Decimal; // C_i
  isMain: boolean;
}

export interface Diagnosis {
  totals: Totals;
  indicators: Indicators;
  risks: Risks;
  ire: IreResult;
  contributions: Contribution[] | null; // null se IRE = 0
  residualIncome: Decimal; // R_m − P_Σ
  critical: { negativeCapacity: boolean; belowMinimumExistential: boolean };
}

/** Ordem fixa dos indicadores, usada também como desempate. */
export const INDICATOR_KEYS: readonly IndicatorKey[] = ['cr', 'cp', 'lf', 'ne'];
