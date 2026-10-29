import type { BudgetInputs, BudgetItems, BudgetKind } from '../modules/budget/types.js';

/** Contexto de toda escrita: momento da operação e a data de negócio de hoje. */
export interface WriteContext {
  at: Date;
  today: string; // 'AAAA-MM-DD' (America/Sao_Paulo)
}

export interface BudgetData {
  incomes: BudgetItems['incomes'][];
  expenses: BudgetItems['expenses'][];
  debts: BudgetItems['debts'][];
  reserves: BudgetItems['reserves'][];
}

/**
 * Acesso ao orçamento. **Todo método recebe o userId** e só enxerga dados dele (SEGURANCA_LGPD §4):
 * item de outro usuário é tratado como inexistente.
 * Escritas gravam a auditoria (só nomes de campos) na mesma transação (SPEC-04 §4).
 */
export interface BudgetRepository {
  list<K extends BudgetKind>(userId: number, kind: K): Promise<BudgetItems[K][]>;
  get<K extends BudgetKind>(userId: number, kind: K, id: number): Promise<BudgetItems[K] | null>;
  count(userId: number, kind: BudgetKind): Promise<number>;
  create<K extends BudgetKind>(
    userId: number,
    kind: K,
    input: BudgetInputs[K],
    ctx: WriteContext,
  ): Promise<BudgetItems[K]>;
  update<K extends BudgetKind>(
    userId: number,
    kind: K,
    id: number,
    input: BudgetInputs[K],
    ctx: WriteContext,
  ): Promise<BudgetItems[K] | null>;
  remove(userId: number, kind: BudgetKind, id: number, ctx: WriteContext): Promise<boolean>;
  all(userId: number): Promise<BudgetData>;
}

/** Nomes dos campos que mudaram entre duas versões (para a auditoria, sem valores). */
export function changedFields(before: object, after: object): string[] {
  const a = before as Record<string, unknown>;
  const b = after as Record<string, unknown>;
  return Object.keys(b).filter(
    (k) => k !== 'id' && k !== 'referenceDate' && !sameValue(a[k], b[k]),
  );
}

function sameValue(x: unknown, y: unknown): boolean {
  if (x === y) return true;
  if (x === null || y === null || x === undefined || y === undefined) return false;
  return String(x) === String(y);
}
