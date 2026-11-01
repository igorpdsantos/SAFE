import { Decimal, ZERO } from '../../engine/decimal.js';
import { elapsedMonths } from '../../engine/time.js';
import type { BudgetSnapshot } from '../../engine/types.js';
import { invalidateUserCache } from '../../lib/cache.js';
import { businessDate, type Clock } from '../../lib/clock.js';
import { toMoneyString } from '../../lib/decimal.js';
import { AppError, notFound } from '../../lib/errors.js';
import type { BudgetEvents } from '../../lib/events.js';
import type { Redis } from '../../lib/redis.js';
import type {
  BudgetData,
  BudgetRepository,
  WriteContext,
} from '../../repositories/budgetRepository.js';
import {
  MAX_ITEMS,
  type BudgetInputs,
  type BudgetItems,
  type BudgetKind,
  type Debt,
} from './types.js';

/** Parcelas restantes "hoje", ativa e saldo usado no cálculo (D-03, D-04). */
export function debtStatus(debt: Debt, today: string) {
  const remainingNow = Math.max(
    debt.remainingInstallments - elapsedMonths(debt.referenceDate, today),
    0,
  );
  const balanceUsed = debt.balanceDue ?? debt.installmentValue.times(remainingNow);
  return { remainingNow, active: remainingNow >= 1, balanceUsed };
}

/** A única porta entre o banco e o motor: só dívidas ativas, com parcelas e saldo de hoje (SPEC-04 §5). */
export function snapshotFrom(data: BudgetData, today: string): BudgetSnapshot {
  return {
    incomes: data.incomes.map((i) => i.monthValue),
    expenses: data.expenses.map((e) => e.value),
    debts: data.debts.flatMap((d) => {
      const s = debtStatus(d, today);
      return s.active
        ? [
            {
              id: d.id,
              installment: d.installmentValue,
              remaining: s.remainingNow,
              balance: s.balanceUsed,
            },
          ]
        : [];
    }),
    reserves: data.reserves.map((r) => r.value),
    referenceDate: today,
  };
}

const money = toMoneyString;

/** Formato da API (SPEC-04 §3): decimais como string. */
export function toDto<K extends BudgetKind>(
  kind: K,
  item: BudgetItems[K],
  today: string,
): Record<string, unknown> {
  switch (kind) {
    case 'incomes': {
      const i = item as BudgetItems['incomes'];
      return { id: i.id, description: i.description, monthValue: money(i.monthValue) };
    }
    case 'expenses': {
      const e = item as BudgetItems['expenses'];
      return {
        id: e.id,
        description: e.description,
        category: e.category,
        type: e.type,
        value: money(e.value),
        valueMin: e.valueMin === null ? null : money(e.valueMin),
        valueMax: e.valueMax === null ? null : money(e.valueMax),
      };
    }
    case 'debts': {
      const d = item as BudgetItems['debts'];
      const s = debtStatus(d, today);
      return {
        id: d.id,
        description: d.description,
        category: d.category,
        installmentValue: money(d.installmentValue),
        remainingInstallments: d.remainingInstallments,
        totalInstallments: d.totalInstallments,
        balanceDue: d.balanceDue === null ? null : money(d.balanceDue),
        referenceDate: d.referenceDate,
        remainingNow: s.remainingNow,
        active: s.active,
        balanceUsed: money(s.balanceUsed),
      };
    }
    default: {
      const r = item as BudgetItems['reserves'];
      return { id: r.id, description: r.description, value: money(r.value) };
    }
  }
}

const sum = (xs: Decimal[]) => xs.reduce((a, b) => a.plus(b), ZERO);

const LIMIT_MESSAGE: Record<BudgetKind, string> = {
  incomes: 'Você já cadastrou 20 rendas, o máximo. Exclua ou edite uma delas.',
  expenses: 'Você já cadastrou 100 despesas, o máximo. Exclua ou edite uma delas.',
  debts: 'Você já cadastrou 100 dívidas, o máximo. Exclua ou edite uma delas.',
  reserves: 'Você já cadastrou 20 reservas, o máximo. Exclua ou edite uma delas.',
};

export class BudgetService {
  constructor(
    private readonly repo: BudgetRepository,
    private readonly redis: Redis,
    private readonly events: BudgetEvents,
    private readonly clock: Clock,
  ) {}

  today(): string {
    return businessDate(this.clock.now());
  }

  private ctx(): WriteContext {
    const at = this.clock.now();
    return { at, today: businessDate(at) };
  }

  /** Depois do commit: invalida o cache e avisa quem recalcula a análise (SPEC-04 §4). */
  private async afterWrite(userId: number): Promise<void> {
    await invalidateUserCache(this.redis, userId);
    await this.events.budgetChanged(userId);
  }

  async list<K extends BudgetKind>(userId: number, kind: K) {
    const today = this.today();
    return (await this.repo.list(userId, kind)).map((i) => toDto(kind, i, today));
  }

  async get<K extends BudgetKind>(userId: number, kind: K, id: number) {
    const item = await this.repo.get(userId, kind, id);
    if (!item) throw notFound('Este item não existe ou não é seu.');
    return toDto(kind, item, this.today());
  }

  async create<K extends BudgetKind>(userId: number, kind: K, input: BudgetInputs[K]) {
    if ((await this.repo.count(userId, kind)) >= MAX_ITEMS[kind]) {
      throw new AppError('VALIDATION_ERROR', 400, LIMIT_MESSAGE[kind], { _: LIMIT_MESSAGE[kind] });
    }
    const ctx = this.ctx();
    const item = await this.repo.create(userId, kind, input, ctx);
    await this.afterWrite(userId);
    return toDto(kind, item, ctx.today);
  }

  async update<K extends BudgetKind>(userId: number, kind: K, id: number, input: BudgetInputs[K]) {
    const ctx = this.ctx();
    const item = await this.repo.update(userId, kind, id, input, ctx);
    if (!item) throw notFound('Este item não existe ou não é seu.');
    await this.afterWrite(userId);
    return toDto(kind, item, ctx.today);
  }

  async remove(userId: number, kind: BudgetKind, id: number): Promise<void> {
    if (!(await this.repo.remove(userId, kind, id, this.ctx())))
      throw notFound('Este item não existe ou não é seu.');
    await this.afterWrite(userId);
  }

  async summary(userId: number) {
    const data = await this.repo.all(userId);
    const snap = snapshotFrom(data, this.today());
    return {
      incomeTotal: money(sum(snap.incomes)),
      expenseTotal: money(sum(snap.expenses)),
      installmentTotal: money(sum(snap.debts.map((d) => d.installment))),
      debtBalanceTotal: money(sum(snap.debts.map((d) => d.balance))),
      reserveTotal: money(sum(snap.reserves)),
      counts: {
        incomes: data.incomes.length,
        expenses: data.expenses.length,
        debts: data.debts.length,
        reserves: data.reserves.length,
      },
    };
  }

  /** Snapshot de hoje para o motor (SPEC-04 §5). */
  async buildSnapshot(userId: number, today = this.today()): Promise<BudgetSnapshot> {
    return snapshotFrom(await this.repo.all(userId), today);
  }
}
