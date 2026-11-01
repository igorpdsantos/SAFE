import { describe, expect, it } from 'vitest';
import { Decimal } from '../engine/decimal.js';
import { diagnose } from '../engine/diagnose.js';
import { snapshotFrom } from '../modules/budget/service.js';
import { InMemoryBudgetRepository } from './inMemoryBudgetRepository.js';

const d = (v: string) => new Decimal(v);
const ctx = { at: new Date('2026-10-29T15:00:00Z'), today: '2026-10-29' };

describe('T-04.2 – InMemoryBudgetRepository', () => {
  it('isola usuários e audita só nomes de campos', async () => {
    const repo = new InMemoryBudgetRepository();
    const item = await repo.create(1, 'incomes', { description: null, monthValue: d('4000') }, ctx);
    expect(await repo.get(2, 'incomes', item.id)).toBeNull();
    expect(
      await repo.update(2, 'incomes', item.id, { description: null, monthValue: d('1') }, ctx),
    ).toBeNull();
    expect(await repo.remove(2, 'incomes', item.id)).toBe(false);
    await repo.update(1, 'incomes', item.id, { description: 'x', monthValue: d('4000') }, ctx);
    expect(repo.audits.map((a) => [a.operation, a.fields])).toEqual([
      ['CREATE', ['description', 'monthValue']],
      ['UPDATE', ['description']],
    ]);
  });

  it('gera o snapshot do caso do artigo e o motor dá 0,1925', async () => {
    const repo = new InMemoryBudgetRepository();
    await repo.create(1, 'incomes', { description: null, monthValue: d('4000') }, ctx);
    await repo.create(
      1,
      'expenses',
      {
        description: null,
        category: 'MORADIA',
        type: 'FIXA',
        value: d('2000'),
        valueMin: null,
        valueMax: null,
      },
      ctx,
    );
    await repo.create(
      1,
      'debts',
      {
        description: null,
        category: 'CREDIARIO',
        installmentValue: d('400'),
        remainingInstallments: 10,
        totalInstallments: null,
        balanceDue: d('6000'),
      },
      ctx,
    );
    await repo.create(1, 'reserves', { description: null, value: d('6000') }, ctx);
    const snap = snapshotFrom(await repo.all(1), '2026-10-29');
    expect(diagnose(snap).ire.raw.toString()).toBe('0.1925');
    expect(snapshotFrom(await repo.all(2), '2026-10-29').incomes).toEqual([]);
  });
});
