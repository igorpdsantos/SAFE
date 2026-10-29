// npm run eval:baseline [-- --limit=0.30] — regra simples só de CR vs IRE em 3 níveis (PA3).
import { Decimal } from '../../backend/src/engine/decimal.js';
import { diagnose } from '../../backend/src/engine/diagnose.js';
import { readPersonas, snapshotOf, writeResult } from './lib.js';

const arg = process.argv.find((a) => a.startsWith('--limit='));
const low = new Decimal(arg ? arg.split('=')[1]! : '0.30');
const high = new Decimal('0.50');
const LEVEL = ['baixo', 'médio', 'alto'] as const;

const crLevel = (cr: Decimal) => (cr.lessThan(low) ? 0 : cr.lessThanOrEqualTo(high) ? 1 : 2);
const ireLevel = (band: number) => (band <= 2 ? 0 : band === 3 ? 1 : 2);

const pct = (d: Decimal) => `${d.times(100).toFixed(0)}%`;

const rows = readPersonas().map((p) => {
  const d = diagnose(snapshotOf(p));
  const regra = crLevel(d.indicators.cr);
  const indice = ireLevel(d.ire.band);
  const reasons: string[] = [`CR ${pct(d.indicators.cr)}`];
  if (d.risks.lf.greaterThanOrEqualTo('0.99')) reasons.push('reserva zero');
  if (d.indicators.cp.lessThanOrEqualTo(0)) reasons.push('sem folga mensal');
  else if (d.risks.cp.greaterThan('0.5')) reasons.push('folga apertada');
  if (d.risks.ne.greaterThan('0.5'))
    reasons.push(`dívidas de ${d.indicators.ne.toFixed(1)} rendas`);
  if (d.risks.lf.isZero()) reasons.push('reserva completa');
  return {
    id: p.id,
    CR: pct(d.indicators.cr),
    regra_CR: LEVEL[regra],
    IRE: d.ire.rounded.toFixed(2),
    nivel_IRE: LEVEL[indice],
    diverge: regra !== indice ? 'sim' : 'não',
    motivo: regra !== indice ? reasons.join(', ') : '',
  };
});

const divergent = rows.filter((r) => r.diverge === 'sim');
const file = writeResult('baseline', rows, [
  'id',
  'CR',
  'regra_CR',
  'IRE',
  'nivel_IRE',
  'diverge',
  'motivo',
]);
console.log(`Regra simples (CR < ${low.times(100)}% / ≤ 50% / > 50%) × IRE em 3 níveis`);
console.log(`Divergências: ${divergent.length} de ${rows.length}`);
for (const r of divergent)
  console.log(`  ${r.id}: regra ${r.regra_CR}, IRE ${r.nivel_IRE} (${r.motivo})`);
console.log(`Resultados → ${file}`);
