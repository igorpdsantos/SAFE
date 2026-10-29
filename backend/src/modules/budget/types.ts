import type { Decimal } from '../../engine/decimal.js';

export const EXPENSE_CATEGORIES = [
  'MORADIA',
  'ALIMENTACAO',
  'TRANSPORTE',
  'SAUDE',
  'EDUCACAO',
  'CONTAS_CASA',
  'LAZER',
  'OUTROS',
] as const;
export const DEBT_CATEGORIES = [
  'CARTAO_CREDITO',
  'EMPRESTIMO_PESSOAL',
  'CONSIGNADO',
  'FINANC_VEICULO',
  'FINANC_IMOVEL',
  'CREDIARIO',
  'CHEQUE_ESPECIAL',
  'OUTROS',
] as const;
export const EXPENSE_TYPES = ['FIXA', 'VARIAVEL'] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type DebtCategory = (typeof DEBT_CATEGORIES)[number];
export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export interface IncomeInput {
  description: string | null;
  monthValue: Decimal;
}
export interface ExpenseInput {
  description: string | null;
  category: ExpenseCategory;
  type: ExpenseType;
  value: Decimal;
}
export interface DebtInput {
  description: string | null;
  category: DebtCategory;
  installmentValue: Decimal;
  remainingInstallments: number;
  totalInstallments: number | null;
  balanceDue: Decimal | null;
}
export interface ReserveInput {
  description: string | null;
  value: Decimal;
}

export type Income = IncomeInput & { id: number };
export type Expense = ExpenseInput & { id: number };
export type Debt = DebtInput & { id: number; referenceDate: string };
export type Reserve = ReserveInput & { id: number };

export interface BudgetItems {
  incomes: Income;
  expenses: Expense;
  debts: Debt;
  reserves: Reserve;
}
export interface BudgetInputs {
  incomes: IncomeInput;
  expenses: ExpenseInput;
  debts: DebtInput;
  reserves: ReserveInput;
}
export type BudgetKind = keyof BudgetItems;

export const BUDGET_KINDS: readonly BudgetKind[] = ['incomes', 'expenses', 'debts', 'reserves'];

/** Limite de itens por usuário (SPEC-04 §2). */
export const MAX_ITEMS: Record<BudgetKind, number> = {
  incomes: 20,
  expenses: 100,
  debts: 100,
  reserves: 20,
};

/** Nome da tabela, usado na auditoria. */
export const ENTITY_NAME: Record<BudgetKind, string> = {
  incomes: 'renda',
  expenses: 'despesa',
  debts: 'divida',
  reserves: 'reserva_financeira',
};
