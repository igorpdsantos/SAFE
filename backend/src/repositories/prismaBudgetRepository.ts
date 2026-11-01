import { Decimal } from '../engine/decimal.js';
import { audit } from '../lib/audit.js';
import type { FieldCipher } from '../lib/crypto.js';
import type { Db, PrismaClient } from '../lib/prisma.js';
import {
  ENTITY_NAME,
  type BudgetInputs,
  type BudgetItems,
  type BudgetKind,
  type Debt,
  type DebtCategory,
  type Expense,
  type ExpenseCategory,
  type ExpenseType,
  type Income,
  type Reserve,
} from '../modules/budget/types.js';
import {
  changedFields,
  type BudgetData,
  type BudgetRepository,
  type WriteContext,
} from './budgetRepository.js';

type Num = { toString(): string };
const dec = (v: Num) => new Decimal(v.toString());
const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const fromDate = (d: Date) => d.toISOString().slice(0, 10);

interface KindSpec<K extends BudgetKind> {
  list(db: Db, userId: number): Promise<unknown[]>;
  find(db: Db, userId: number, id: number): Promise<unknown>;
  count(db: Db, userId: number): Promise<number>;
  create(db: Db, data: Record<string, unknown>): Promise<unknown>;
  update(db: Db, id: number, data: Record<string, unknown>): Promise<unknown>;
  remove(db: Db, id: number): Promise<unknown>;
  toData(
    input: BudgetInputs[K],
    enc: (t: string | null) => Uint8Array<ArrayBuffer> | null,
  ): Record<string, unknown>;
  fromRow(row: unknown, dec: (b: Uint8Array | null) => string | null): BudgetItems[K];
}

type Row = Record<string, unknown> & { id: number; description: Uint8Array | null };
const asRow = (r: unknown) => r as Row;
const order = { orderBy: { id: 'asc' as const } };

/* eslint-disable @typescript-eslint/no-explicit-any -- os delegates do Prisma têm tipos de argumento por modelo */
const SPECS: { [K in BudgetKind]: KindSpec<K> } = {
  incomes: {
    list: (db, userId) => db.income.findMany({ where: { userId }, ...order }),
    find: (db, userId, id) => db.income.findFirst({ where: { id, userId } }),
    count: (db, userId) => db.income.count({ where: { userId } }),
    create: (db, data) => db.income.create({ data: data as any }),
    update: (db, id, data) => db.income.update({ where: { id }, data }),
    remove: (db, id) => db.income.delete({ where: { id } }),
    toData: (i, enc) => ({ description: enc(i.description), monthValue: i.monthValue.toFixed(2) }),
    fromRow: (r, d): Income => {
      const row = asRow(r);
      return {
        id: row.id,
        description: d(row.description),
        monthValue: dec(row.monthValue as Num),
      };
    },
  },
  expenses: {
    list: (db, userId) => db.expense.findMany({ where: { userId }, ...order }),
    find: (db, userId, id) => db.expense.findFirst({ where: { id, userId } }),
    count: (db, userId) => db.expense.count({ where: { userId } }),
    create: (db, data) => db.expense.create({ data: data as any }),
    update: (db, id, data) => db.expense.update({ where: { id }, data }),
    remove: (db, id) => db.expense.delete({ where: { id } }),
    toData: (i, enc) => ({
      description: enc(i.description),
      category: i.category,
      type: i.type,
      value: i.value.toFixed(2),
      valueMin: i.valueMin === null ? null : i.valueMin.toFixed(2),
      valueMax: i.valueMax === null ? null : i.valueMax.toFixed(2),
    }),
    fromRow: (r, d): Expense => {
      const row = asRow(r);
      return {
        id: row.id,
        description: d(row.description),
        category: row.category as ExpenseCategory,
        type: row.type as ExpenseType,
        value: dec(row.value as Num),
        valueMin: row.valueMin == null ? null : dec(row.valueMin as Num),
        valueMax: row.valueMax == null ? null : dec(row.valueMax as Num),
      };
    },
  },
  debts: {
    list: (db, userId) => db.debt.findMany({ where: { userId }, ...order }),
    find: (db, userId, id) => db.debt.findFirst({ where: { id, userId } }),
    count: (db, userId) => db.debt.count({ where: { userId } }),
    create: (db, data) => db.debt.create({ data: data as any }),
    update: (db, id, data) => db.debt.update({ where: { id }, data }),
    remove: (db, id) => db.debt.delete({ where: { id } }),
    toData: (i, enc) => ({
      description: enc(i.description),
      category: i.category,
      installmentValue: i.installmentValue.toFixed(2),
      remainingInstallments: i.remainingInstallments,
      totalInstallments: i.totalInstallments,
      balanceDue: i.balanceDue === null ? null : i.balanceDue.toFixed(2),
    }),
    fromRow: (r, d): Debt => {
      const row = asRow(r);
      return {
        id: row.id,
        description: d(row.description),
        category: row.category as DebtCategory,
        installmentValue: dec(row.installmentValue as Num),
        remainingInstallments: row.remainingInstallments as number,
        totalInstallments: (row.totalInstallments as number | null) ?? null,
        balanceDue: row.balanceDue === null ? null : dec(row.balanceDue as Num),
        referenceDate: fromDate(row.referenceDate as Date),
      };
    },
  },
  reserves: {
    list: (db, userId) => db.reserve.findMany({ where: { userId }, ...order }),
    find: (db, userId, id) => db.reserve.findFirst({ where: { id, userId } }),
    count: (db, userId) => db.reserve.count({ where: { userId } }),
    create: (db, data) => db.reserve.create({ data: data as any }),
    update: (db, id, data) => db.reserve.update({ where: { id }, data }),
    remove: (db, id) => db.reserve.delete({ where: { id } }),
    toData: (i, enc) => ({ description: enc(i.description), value: i.value.toFixed(2) }),
    fromRow: (r, d): Reserve => {
      const row = asRow(r);
      return { id: row.id, description: d(row.description), value: dec(row.value as Num) };
    },
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Repositório real: Postgres via Prisma, descrição cifrada com AES-256-GCM (SPEC-04 §2.2). */
export class PrismaBudgetRepository implements BudgetRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cipher: FieldCipher,
  ) {}

  private enc = (text: string | null) =>
    text === null ? null : new Uint8Array(this.cipher.encrypt(text));
  private dec = (data: Uint8Array | null) => (data === null ? null : this.cipher.decrypt(data));

  async list<K extends BudgetKind>(userId: number, kind: K): Promise<BudgetItems[K][]> {
    const spec = SPECS[kind] as KindSpec<K>;
    const rows = await spec.list(this.prisma, userId);
    return rows.map((r) => spec.fromRow(r, this.dec));
  }

  async get<K extends BudgetKind>(
    userId: number,
    kind: K,
    id: number,
  ): Promise<BudgetItems[K] | null> {
    const spec = SPECS[kind] as KindSpec<K>;
    const row = await spec.find(this.prisma, userId, id);
    return row ? spec.fromRow(row, this.dec) : null;
  }

  count(userId: number, kind: BudgetKind): Promise<number> {
    return SPECS[kind].count(this.prisma, userId);
  }

  async create<K extends BudgetKind>(
    userId: number,
    kind: K,
    input: BudgetInputs[K],
    ctx: WriteContext,
  ): Promise<BudgetItems[K]> {
    const spec = SPECS[kind] as KindSpec<K>;
    return this.prisma.$transaction(async (tx) => {
      const data = {
        ...spec.toData(input, this.enc),
        userId,
        createdAt: ctx.at,
        updatedAt: ctx.at,
      };
      if (kind === 'debts') Object.assign(data, { referenceDate: toDate(ctx.today) });
      const row = await spec.create(tx, data);
      const item = spec.fromRow(row, this.dec);
      await audit(tx, {
        userId,
        operation: 'CREATE',
        entity: ENTITY_NAME[kind],
        entityId: item.id,
        fields: Object.keys(input),
        at: ctx.at,
      });
      return item;
    });
  }

  async update<K extends BudgetKind>(
    userId: number,
    kind: K,
    id: number,
    input: BudgetInputs[K],
    ctx: WriteContext,
  ): Promise<BudgetItems[K] | null> {
    const spec = SPECS[kind] as KindSpec<K>;
    return this.prisma.$transaction(async (tx) => {
      const current = await spec.find(tx, userId, id);
      if (!current) return null;
      const before = spec.fromRow(current, this.dec);
      const data: Record<string, unknown> = { ...spec.toData(input, this.enc), updatedAt: ctx.at };
      // D-03: mudou o número de parcelas restantes → a contagem recomeça hoje.
      if (
        kind === 'debts' &&
        (before as Debt).remainingInstallments !==
          (input as BudgetInputs['debts']).remainingInstallments
      ) {
        data.referenceDate = toDate(ctx.today);
      }
      const item = spec.fromRow(await spec.update(tx, id, data), this.dec);
      await audit(tx, {
        userId,
        operation: 'UPDATE',
        entity: ENTITY_NAME[kind],
        entityId: id,
        fields: changedFields(before, input),
        at: ctx.at,
      });
      return item;
    });
  }

  async remove(userId: number, kind: BudgetKind, id: number, ctx: WriteContext): Promise<boolean> {
    const spec = SPECS[kind];
    return this.prisma.$transaction(async (tx) => {
      if (!(await spec.find(tx, userId, id))) return false;
      await spec.remove(tx, id);
      await audit(tx, {
        userId,
        operation: 'DELETE',
        entity: ENTITY_NAME[kind],
        entityId: id,
        at: ctx.at,
      });
      return true;
    });
  }

  async all(userId: number): Promise<BudgetData> {
    const [incomes, expenses, debts, reserves] = await Promise.all([
      this.list(userId, 'incomes'),
      this.list(userId, 'expenses'),
      this.list(userId, 'debts'),
      this.list(userId, 'reserves'),
    ]);
    return { incomes, expenses, debts, reserves };
  }
}
