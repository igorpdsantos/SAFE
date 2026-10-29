import type { BudgetInputs, BudgetItems, BudgetKind, Debt } from '../modules/budget/types.js';
import {
  changedFields,
  type BudgetData,
  type BudgetRepository,
  type WriteContext,
} from './budgetRepository.js';

interface Stored {
  userId: number;
  item: BudgetItems[BudgetKind];
}

export interface MemoryAudit {
  userId: number;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  kind: BudgetKind;
  entityId: number;
  fields: string[];
}

/** Mesma regra do repositório real, em memória: para testes e scripts sem banco (SPEC-04 §5). */
export class InMemoryBudgetRepository implements BudgetRepository {
  private nextId = 1;
  private readonly rows: Record<BudgetKind, Stored[]> = {
    incomes: [],
    expenses: [],
    debts: [],
    reserves: [],
  };
  readonly audits: MemoryAudit[] = [];

  async list<K extends BudgetKind>(userId: number, kind: K): Promise<BudgetItems[K][]> {
    return this.rows[kind]
      .filter((r) => r.userId === userId)
      .map((r) => ({ ...r.item }) as BudgetItems[K]);
  }

  async get<K extends BudgetKind>(
    userId: number,
    kind: K,
    id: number,
  ): Promise<BudgetItems[K] | null> {
    const found = this.rows[kind].find((r) => r.userId === userId && r.item.id === id);
    return found ? ({ ...found.item } as BudgetItems[K]) : null;
  }

  async count(userId: number, kind: BudgetKind): Promise<number> {
    return this.rows[kind].filter((r) => r.userId === userId).length;
  }

  async create<K extends BudgetKind>(
    userId: number,
    kind: K,
    input: BudgetInputs[K],
    ctx: WriteContext,
  ): Promise<BudgetItems[K]> {
    const item = { ...input, id: this.nextId++ } as BudgetItems[K];
    if (kind === 'debts') (item as Debt).referenceDate = ctx.today;
    this.rows[kind].push({ userId, item });
    this.audits.push({
      userId,
      operation: 'CREATE',
      kind,
      entityId: item.id,
      fields: Object.keys(input),
    });
    return { ...item };
  }

  async update<K extends BudgetKind>(
    userId: number,
    kind: K,
    id: number,
    input: BudgetInputs[K],
    ctx: WriteContext,
  ): Promise<BudgetItems[K] | null> {
    const found = this.rows[kind].find((r) => r.userId === userId && r.item.id === id);
    if (!found) return null;
    const before = found.item;
    const next = { ...before, ...input, id } as BudgetItems[K];
    if (
      kind === 'debts' &&
      (before as Debt).remainingInstallments !==
        (input as BudgetInputs['debts']).remainingInstallments
    ) {
      (next as Debt).referenceDate = ctx.today;
    }
    found.item = next;
    this.audits.push({
      userId,
      operation: 'UPDATE',
      kind,
      entityId: id,
      fields: changedFields(before, input),
    });
    return { ...next };
  }

  async remove(userId: number, kind: BudgetKind, id: number): Promise<boolean> {
    const index = this.rows[kind].findIndex((r) => r.userId === userId && r.item.id === id);
    if (index === -1) return false;
    this.rows[kind].splice(index, 1);
    this.audits.push({ userId, operation: 'DELETE', kind, entityId: id, fields: [] });
    return true;
  }

  async all(userId: number): Promise<BudgetData> {
    return {
      incomes: await this.list(userId, 'incomes'),
      expenses: await this.list(userId, 'expenses'),
      debts: await this.list(userId, 'debts'),
      reserves: await this.list(userId, 'reserves'),
    };
  }
}
