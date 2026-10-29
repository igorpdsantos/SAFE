import { z } from 'zod';
import { Decimal } from '../../engine/decimal.js';
import { InvalidMoneyError, parseMoney } from '../../lib/decimal.js';
import {
  DEBT_CATEGORIES,
  EXPENSE_CATEGORIES,
  EXPENSE_TYPES,
  type BudgetInputs,
  type BudgetKind,
} from './types.js';

const MAX_MONEY = new Decimal('10000000.00');

/** Valor em reais como texto ("1600.00"), com mensagem que diz o que fazer (SPEC-15 L9). */
function money(opts: { positive: boolean; example: string }) {
  const hint = opts.positive
    ? `Digite um valor maior que zero, por exemplo ${opts.example}`
    : `Digite um valor de zero ou mais, por exemplo ${opts.example}`;
  return z.string({ error: hint }).transform((text, ctx) => {
    let value: Decimal;
    try {
      value = parseMoney(text);
    } catch (err) {
      if (!(err instanceof InvalidMoneyError)) throw err;
      ctx.addIssue({ code: 'custom', message: hint });
      return z.NEVER;
    }
    if (opts.positive && !value.greaterThan(0)) {
      ctx.addIssue({ code: 'custom', message: hint });
      return z.NEVER;
    }
    if (value.greaterThan(MAX_MONEY)) {
      ctx.addIssue({ code: 'custom', message: 'O valor máximo aceito é 10.000.000,00' });
      return z.NEVER;
    }
    return value;
  });
}

/** Descrição opcional: 1–60 caracteres depois do trim, sem quebra de linha. Vazia vira null. */
const description = z
  .string({ error: 'A descrição deve ser um texto' })
  .nullish()
  .transform((v, ctx) => {
    const text = (v ?? '').trim();
    if (text === '') return null;
    if (/[\r\n]/.test(text)) {
      ctx.addIssue({ code: 'custom', message: 'Escreva a descrição em uma linha só' });
      return z.NEVER;
    }
    if (text.length > 60) {
      ctx.addIssue({ code: 'custom', message: 'Use no máximo 60 caracteres na descrição' });
      return z.NEVER;
    }
    return text;
  });

const int = (min: number, max: number, message: string) =>
  z
    .number({ error: message })
    .int({ error: message })
    .min(min, { error: message })
    .max(max, { error: message });

export const incomeSchema = z.object({
  description,
  monthValue: money({ positive: true, example: '2.500,00' }),
});

export const expenseSchema = z.object({
  description,
  category: z.enum(EXPENSE_CATEGORIES, { error: 'Escolha uma categoria da lista' }),
  type: z.enum(EXPENSE_TYPES, { error: 'Escolha se a despesa é fixa ou variável' }),
  value: money({ positive: false, example: '150,00' }),
});

export const debtSchema = z
  .object({
    description,
    category: z.enum(DEBT_CATEGORIES, { error: 'Escolha uma categoria da lista' }),
    installmentValue: money({ positive: true, example: '200,00' }),
    remainingInstallments: int(
      0,
      600,
      'Digite quantas parcelas faltam, de 0 a 600, por exemplo 10',
    ),
    totalInstallments: int(
      1,
      600,
      'Digite o total de parcelas, de 1 a 600, por exemplo 12',
    ).nullish(),
    balanceDue: money({ positive: false, example: '2.000,00' }).nullish(),
  })
  .superRefine((d, ctx) => {
    if (d.totalInstallments != null && d.totalInstallments < d.remainingInstallments) {
      ctx.addIssue({
        code: 'custom',
        path: ['totalInstallments'],
        message: 'O total de parcelas não pode ser menor que as parcelas que faltam',
      });
    }
  })
  .transform((d) => ({
    ...d,
    totalInstallments: d.totalInstallments ?? null,
    balanceDue: d.balanceDue ?? null,
  }));

export const reserveSchema = z.object({
  description,
  value: money({ positive: false, example: '1.000,00' }),
});

export const SCHEMAS: { [K in BudgetKind]: z.ZodType<BudgetInputs[K], unknown> } = {
  incomes: incomeSchema,
  expenses: expenseSchema,
  debts: debtSchema,
  reserves: reserveSchema,
};
