import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Decimal } from '../../backend/src/engine/decimal.js';
import type { BudgetSnapshot } from '../../backend/src/engine/types.js';

export const EVAL_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PERSONAS_CSV = join(EVAL_DIR, 'personas.csv');

/** Gerador pseudoaleatório com semente (mulberry32): mesma semente, mesmos números. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function commit(): string {
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'desconhecido';
  }
}

const today = () => new Date().toISOString().slice(0, 10);
const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows: Record<string, unknown>[], header: string[]): string {
  return (
    [header.join(','), ...rows.map((r) => header.map((h) => csvCell(r[h])).join(','))].join('\n') +
    '\n'
  );
}

/** Grava em results/<nome>-AAAAMMDD.csv com cabeçalho de commit e data (SPEC-12 §4). */
export function writeResult(
  name: string,
  rows: Record<string, unknown>[],
  header: string[],
): string {
  const dir = join(EVAL_DIR, 'results');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${name}-${today().replace(/-/g, '')}.csv`);
  writeFileSync(file, `# commit: ${commit()} · data: ${today()}\n${toCsv(rows, header)}`);
  return file;
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter((l) => l.trim() !== '' && !l.startsWith('#'));
  const split = (line: string) => {
    const out: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') quoted = false;
        else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const [head, ...rest] = lines;
  const cols = split(head ?? '');
  return rest.map((l) => Object.fromEntries(split(l).map((v, i) => [cols[i]!, v])));
}

export interface Persona {
  id: string;
  descricao: string;
  renda: string;
  despesas: string;
  parcelas: string;
  saldo_devedor: string;
  reserva: string;
  regra_geracao: string;
}

export function readPersonas(): Persona[] {
  return parseCsv(readFileSync(PERSONAS_CSV, 'utf8')) as unknown as Persona[];
}

/** Persona → snapshot do motor (uma dívida agregada; o número de parcelas não muda o IRE). */
export function snapshotOf(p: Persona): BudgetSnapshot {
  const d = (v: string) => new Decimal(v);
  return {
    incomes: [d(p.renda)],
    expenses: [d(p.despesas)],
    debts: d(p.parcelas).greaterThan(0)
      ? [{ id: 1, installment: d(p.parcelas), remaining: 12, balance: d(p.saldo_devedor) }]
      : [],
    reserves: [d(p.reserva)],
    referenceDate: '2026-10-29',
  };
}

export const fmt = (v: Decimal | null, places = 4) => (v === null ? '' : v.toFixed(places));
