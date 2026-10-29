// npm run generate-personas — gera evaluation/personas.csv (SPEC-12 §2).
// Semente fixa e regras explícitas: rodar de novo produz exatamente o mesmo arquivo.
import { writeFileSync } from 'node:fs';
import { PERSONAS_CSV, rng, toCsv, type Persona } from './lib.js';

const SEED = 2026;
const rand = rng(SEED);
const between = (min: number, max: number) => min + (max - min) * rand();
const round = (v: number, step: number) => Math.round(v / step) * step;
const money = (v: number) => v.toFixed(2);
const brl = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Draft {
  renda: number;
  despesas: number;
  parcelas: number;
  saldo: number;
  reserva: number;
  regra: string;
}

function describe(d: Draft): string {
  return `Renda ${brl(d.renda)}; despesas ${brl(d.despesas)}; parcelas ${brl(d.parcelas)}; falta pagar ${brl(d.saldo)}; reserva ${brl(d.reserva)}`;
}

/** Perfil por comprometimento da renda (CR), despesas (D/renda) e reserva em meses de despesa. */
function profile(
  label: string,
  cr: [number, number],
  dShare: [number, number],
  months: [number, number],
  term: [number, number],
): Draft {
  const renda = round(between(2500, 9000), 100);
  const crTarget = between(...cr);
  const parcelas = round(renda * crTarget, 10);
  const despesas = round(renda * between(...dShare), 10);
  const reservaMeses = between(...months);
  const reserva = round(despesas * reservaMeses, 100);
  const prazo = Math.round(between(...term));
  return {
    renda,
    despesas,
    parcelas,
    saldo: parcelas * prazo,
    reserva,
    regra: `${label}: CR alvo ${crTarget.toFixed(2)}; D = ${Math.round((despesas / renda) * 100)}% da renda; reserva ${reservaMeses.toFixed(1)} meses de D; saldo = parcela × ${prazo}`,
  };
}

const drafts: Draft[] = [
  ...Array.from({ length: 8 }, () => profile('baixo', [0.05, 0.25], [0.4, 0.55], [3, 9], [6, 24])),
  ...Array.from({ length: 8 }, () =>
    profile('moderado', [0.25, 0.4], [0.45, 0.6], [1, 4], [10, 36]),
  ),
  ...Array.from({ length: 8 }, () => profile('alto', [0.4, 0.7], [0.45, 0.65], [0, 1], [12, 60])),
  // Casos-limite (SPEC-12 §2)
  {
    renda: 4000,
    despesas: 2200,
    parcelas: 600,
    saldo: 7200,
    reserva: 0,
    regra: 'limite: reserva zero',
  },
  {
    renda: 1500,
    despesas: 900,
    parcelas: 300,
    saldo: 3600,
    reserva: 300,
    regra: 'limite: renda baixa (R$ 1.500)',
  },
  {
    renda: 3500,
    despesas: 1800,
    parcelas: 1050,
    saldo: 6300,
    reserva: 1000,
    regra: 'limite: muitas dívidas pequenas (7 × R$ 150, 6 parcelas cada)',
  },
  {
    renda: 5000,
    despesas: 2500,
    parcelas: 900,
    saldo: 100000,
    reserva: 2000,
    regra: 'limite: uma dívida grande (saldo de 20 rendas)',
  },
  {
    renda: 3000,
    despesas: 3000,
    parcelas: 0,
    saldo: 0,
    reserva: 1500,
    regra: 'limite: despesas = renda',
  },
  {
    renda: 3200,
    despesas: 2000,
    parcelas: 0,
    saldo: 0,
    reserva: 0,
    regra: 'limite: sem dívidas e reserva zero',
  },
];

const rows: Persona[] = drafts.map((d, i) => ({
  id: `P${String(i + 1).padStart(2, '0')}`,
  descricao: describe(d),
  renda: money(d.renda),
  despesas: money(d.despesas),
  parcelas: money(d.parcelas),
  saldo_devedor: money(d.saldo),
  reserva: money(d.reserva),
  regra_geracao: d.regra,
}));

const header = [
  'id',
  'descricao',
  'renda',
  'despesas',
  'parcelas',
  'saldo_devedor',
  'reserva',
  'regra_geracao',
];
writeFileSync(
  PERSONAS_CSV,
  `# personas fictícias do SAFE · seed=${SEED} · regras em evaluation/scripts/generate-personas.ts\n${toCsv(rows as unknown as Record<string, unknown>[], header)}`,
);
console.log(`personas.csv: ${rows.length} personas (seed ${SEED})`);
