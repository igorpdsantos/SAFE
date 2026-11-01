// Formatos das respostas da API (decimais chegam como string, SPEC-01 §4.1).
export type RiskBand = 1 | 2 | 3 | 4 | 5;
export type IndicatorKey = 'cr' | 'cp' | 'lf' | 'ne';

export interface Me {
  userId: number;
  email: string | null;
  termsUpToDate: boolean;
}

export interface Ire {
  raw: string;
  value: string;
  band: RiskBand;
  label: string;
  color: string;
  icon: string;
  recommendation?: string;
}

export interface IndicatorView {
  value: string | null;
  display: string;
  risk: string;
  saturated: boolean;
  level?: 'OK' | 'ATENCAO' | 'ALTO';
  exceedsIncome?: boolean;
}

export interface Factor {
  key: IndicatorKey;
  name: string;
  points: string;
  share: string;
  isMain: boolean;
}

export interface Alert {
  id: number;
  type: string;
  severity: number;
  message: string;
  status: 'NAO_LIDO' | 'LIDO';
  createdAt: string;
}

export interface Analysis {
  calculatedAt: string;
  totals: {
    income: string;
    expenses: string;
    installments: string;
    debtBalance: string;
    reserve: string;
  };
  indicators: Record<IndicatorKey, IndicatorView>;
  ire: Ire;
  factors: Factor[] | null;
  residualIncome: string;
  alerts: Alert[];
}

export interface ProjectionPoint {
  month: number;
  label: string;
  free: string;
  balance: string;
  debtsActive: number;
}

export interface Projection {
  horizon: number;
  points: ProjectionPoint[];
  firstNonPositiveFreeMonth: number | null;
  firstNegativeBalanceMonth: number | null;
  assumptions?: string[];
}

export interface SimulationFactor {
  key: IndicatorKey;
  name: string;
  before: string;
  after: string;
  riskBefore: string;
  riskAfter: string;
  points: string;
  share: string | null;
  isMain: boolean;
  unchanged: boolean;
  saturatedBoth: boolean;
}

export type Outcome = 'SEM_AGRAVAMENTO' | 'AGRAVAMENTO' | 'CRITICO';

export interface Simulation {
  id: number;
  financialCost: string;
  current: { ire: Ire };
  projected: { ire: Ire };
  deltaIre: string;
  outcome: Outcome;
  alertSeverity: number;
  factors: SimulationFactor[];
  residualIncomeAfter: string;
  explanation: string;
  projection: { without: Projection; with: Projection };
  assumptions: string[];
}

export interface HistoryPoint {
  date: string;
  ire: string;
  band: RiskBand;
  label: string;
}

export interface History {
  points: HistoryPoint[];
  trend: 'INSUFICIENTE' | 'MELHORANDO' | 'ESTAVEL' | 'PIORANDO';
}

export interface Income {
  id: number;
  description: string | null;
  monthValue: string;
}
export interface Expense {
  id: number;
  description: string | null;
  category: string;
  type: 'FIXA' | 'VARIAVEL';
  value: string;
  /** Faixa da despesa variável (menor e maior valor do mês); `null` na fixa. `value` é o máximo. */
  valueMin: string | null;
  valueMax: string | null;
}
export interface Debt {
  id: number;
  description: string | null;
  category: string;
  installmentValue: string;
  remainingInstallments: number;
  totalInstallments: number | null;
  balanceDue: string | null;
  referenceDate: string;
  remainingNow: number;
  active: boolean;
  balanceUsed: string;
}
export interface Reserve {
  id: number;
  description: string | null;
  value: string;
}

export interface BudgetItems {
  incomes: Income;
  expenses: Expense;
  debts: Debt;
  reserves: Reserve;
}
export type BudgetKind = keyof BudgetItems;

export interface MyData {
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
  privacyVersion: string | null;
  researchConsent: boolean;
  counts: Record<string, number>;
}

export interface TermsCurrent {
  termsVersion: string;
  privacyVersion: string;
  termsUrl: string;
  privacyUrl: string;
  accepted: boolean;
}

/** Série pública agregada da aba "Entenda os dados" (SPEC-14). */
export interface ContextSeries {
  id: string;
  name: string;
  source: string;
  url: string;
  extractedAt: string;
  unit: string;
  points: { date: string; value: string }[];
}
