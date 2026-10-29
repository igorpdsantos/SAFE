// npm run eval:simulation-check — propriedades da simulação em 200 cenários + 9 de mínimo existencial (PA4).
import { Decimal } from '../../backend/src/engine/decimal.js';
import { simulate } from '../../backend/src/engine/simulation.js';
import type { BudgetSnapshot } from '../../backend/src/engine/types.js';
import { rng, writeResult } from './lib.js';

const rand = rng(2026);
const int = (min: number, max: number) => Math.floor(min + (max - min + 1) * rand());
const d = (v: number | string) => new Decimal(v);
const EPS = d('1e-9');

interface Case {
  nome: string;
  snapshot: BudgetSnapshot;
  input: { value: Decimal; installments: number; installmentValue: Decimal };
  esperaMinimo?: boolean;
}

const cases: Case[] = [];
for (let i = 1; i <= 200; i++) {
  const renda = int(1000, 20000);
  const parcelas = rand() < 0.3 ? 0 : int(50, Math.round(renda * 0.6));
  const p = int(20, Math.round(renda * 0.5));
  const n = int(1, 48);
  cases.push({
    nome: `aleatorio-${i}`,
    snapshot: {
      incomes: [d(renda)],
      expenses: [d(int(0, Math.round(renda * 1.1)))],
      debts: parcelas
        ? [
            {
              id: 1,
              installment: d(parcelas),
              remaining: int(1, 60),
              balance: d(parcelas * int(1, 60)),
            },
          ]
        : [],
      reserves: [d(int(0, renda * 8))],
      referenceDate: '2026-10-29',
    },
    input: { value: d(p * n), installments: n, installmentValue: d(p) },
  });
}

// Renda residual depois da compra de 599,99 / 600 / 600,01 em 3 perfis (renda, parcelas atuais).
for (const [renda, atuais] of [
  [2000, 0],
  [3500, 1200],
  [8000, 5000],
] as const) {
  for (const residual of ['599.99', '600.00', '600.01']) {
    const p = d(renda).minus(atuais).minus(residual);
    cases.push({
      nome: `minimo-${renda}-${residual}`,
      snapshot: {
        incomes: [d(renda)],
        expenses: [d(0)],
        debts: atuais
          ? [{ id: 1, installment: d(atuais), remaining: 12, balance: d(atuais * 12) }]
          : [],
        reserves: [d(100000)],
        referenceDate: '2026-10-29',
      },
      input: { value: p, installments: 1, installmentValue: p },
      esperaMinimo: residual === '599.99',
    });
  }
}

const failures: Record<string, unknown>[] = [];
for (const c of cases) {
  const r = simulate(c.snapshot, c.input);
  const sum = r.factors.reduce((acc, f) => acc.plus(f.delta), d(0));
  const lf = r.factors.find((f) => f.key === 'lf')!.delta;
  const checks: [string, boolean][] = [
    ['ΔIRE ≥ 0', r.deltaIre.greaterThanOrEqualTo(0)],
    ['ΔC_lf = 0', lf.isZero()],
    ['|Σ ΔC − ΔIRE| < 1e-9', sum.minus(r.deltaIre).abs().lessThan(EPS)],
  ];
  if (c.esperaMinimo !== undefined) {
    const detected = r.residualIncomeAfter.lessThan(600);
    checks.push([
      'detecção do mínimo existencial',
      detected === c.esperaMinimo && (!c.esperaMinimo || r.outcome === 'CRITICO'),
    ]);
  }
  for (const [check, ok] of checks) if (!ok) failures.push({ cenario: c.nome, verificacao: check });
}

const file = writeResult('simulation-check', failures, ['cenario', 'verificacao']);
console.log(`Cenários verificados: ${cases.length} (200 aleatórios + 9 de mínimo existencial)`);
console.log(`Falhas: ${failures.length}`);
console.log(`Resultados → ${file}`);
if (failures.length > 0) process.exit(1);
