#!/usr/bin/env node
// Painel do TASKS.md: total por fase e por trilha, e o que está em andamento.
// Uso: node scripts/tasks-status.mjs [caminho/para/TASKS.md]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const file = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'TASKS.md');
const lines = readFileSync(file, 'utf8').split('\n');

const TASK = /^- \[( |~|x)\] \*\*(T-\d\d\.\d+)\*\* `(A\+B|A|B)`\s*(.*)$/;
const phases = [];
const lanes = {};
const doing = [];
let phase = null;

for (const line of lines) {
  if (line.startsWith('## Fase')) {
    phase = { name: line.replace(/^## /, '').replace(/ — .*/, '').replace(/ \(.*/, ''), total: 0, done: 0, doing: 0 };
    phases.push(phase);
    continue;
  }
  const m = TASK.exec(line);
  if (!m || !phase) continue;
  const [, mark, id, lane, rest] = m;
  const l = (lanes[lane] ??= { total: 0, done: 0, doing: 0 });
  phase.total++; l.total++;
  if (mark === 'x') { phase.done++; l.done++; }
  if (mark === '~') { phase.doing++; l.doing++; doing.push(`${id} [${lane}] ${rest.slice(0, 90)}`); }
}

const pct = (d, t) => (t ? Math.round((d / t) * 100) : 0) + '%';
const row = (name, s) => `${name.padEnd(48)} ${String(s.done).padStart(3)}/${String(s.total).padEnd(3)} ${pct(s.done, s.total).padStart(4)}  fazendo: ${s.doing}`;

console.log('\nPOR FASE');
for (const p of phases) console.log(row(p.name, p));
const all = phases.reduce((a, p) => ({ total: a.total + p.total, done: a.done + p.done, doing: a.doing + p.doing }), { total: 0, done: 0, doing: 0 });
console.log(row('TOTAL', all));

console.log('\nPOR TRILHA');
for (const k of ['A', 'B', 'A+B']) if (lanes[k]) console.log(row(`Trilha ${k}`, lanes[k]));

console.log('\nEM ANDAMENTO');
console.log(doing.length ? doing.map((d) => '  ' + d).join('\n') : '  —');

const perLane = {};
for (const d of doing) { const k = d.match(/\[(A\+B|A|B)\]/)[1]; perLane[k] = (perLane[k] ?? 0) + 1; }
for (const [k, n] of Object.entries(perLane)) if (n > 1 && k !== 'A+B') console.log(`\n⚠ Trilha ${k} tem ${n} tarefas [~]; o limite é 1.`);
console.log('');
