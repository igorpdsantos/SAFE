// npm run eval:sensitivity — estabilidade da faixa a mudanças nos pesos e nos limites (PA2).
import { DEFAULT_CONFIG, withConfig } from '../../backend/src/engine/config.js';
import { Decimal } from '../../backend/src/engine/decimal.js';
import { diagnose } from '../../backend/src/engine/diagnose.js';
import {
  INDICATOR_KEYS,
  type EngineConfig,
  type IndicatorKey,
} from '../../backend/src/engine/types.js';
import { readPersonas, snapshotOf, writeResult } from './lib.js';

const personas = readPersonas();
const snaps = personas.map(snapshotOf);
const base = snaps.map((s) => diagnose(s).ire.band);

/** M = proporção de personas que mudam de faixa (artigo, Eq. mudanca-faixa). */
function changes(cfg: EngineConfig) {
  const moved = snaps.flatMap((s, i) =>
    diagnose(s, cfg).ire.band !== base[i] ? [personas[i]!.id] : [],
  );
  return { M: moved.length / snaps.length, moved };
}

const rows: Record<string, unknown>[] = [];
const sanity = changes(DEFAULT_CONFIG);
rows.push({
  cenario: 'sem perturbação (sanidade)',
  parametro: '-',
  delta: '0%',
  M: sanity.M.toFixed(3),
  mudaram: sanity.moved.join(' '),
});

for (const k of INDICATOR_KEYS) {
  for (const delta of [-0.2, -0.1, 0.1, 0.2]) {
    const raw = Object.fromEntries(
      INDICATOR_KEYS.map((key) => [
        key,
        DEFAULT_CONFIG.weights[key].times(key === k ? 1 + delta : 1),
      ]),
    ) as Record<IndicatorKey, Decimal>;
    const total = INDICATOR_KEYS.reduce((acc, key) => acc.plus(raw[key]), new Decimal(0));
    const weights = Object.fromEntries(
      INDICATOR_KEYS.map((key) => [key, raw[key].div(total)]),
    ) as Record<IndicatorKey, Decimal>;
    const r = changes(withConfig({ weights }));
    rows.push({
      cenario: 'peso',
      parametro: k,
      delta: `${delta > 0 ? '+' : ''}${delta * 100}%`,
      M: r.M.toFixed(3),
      mudaram: r.moved.join(' '),
    });
  }
}

for (const shift of [-0.05, -0.02, 0.02, 0.05]) {
  const bounds = DEFAULT_CONFIG.bandUpperBounds.map((b) =>
    b.plus(shift),
  ) as unknown as EngineConfig['bandUpperBounds'];
  const r = changes(withConfig({ bandUpperBounds: bounds }));
  rows.push({
    cenario: 'limites das faixas',
    parametro: 'todos',
    delta: `${shift > 0 ? '+' : ''}${shift.toFixed(2)}`,
    M: r.M.toFixed(3),
    mudaram: r.moved.join(' '),
  });
}

const file = writeResult('sensitivity', rows, ['cenario', 'parametro', 'delta', 'M', 'mudaram']);
console.log(`Sanidade (sem perturbação): M = ${sanity.M}`);
const weightRows = rows.filter((r) => r.cenario === 'peso');
console.log(
  `Pesos ±10/±20%: M máximo = ${Math.max(...weightRows.map((r) => Number(r.M))).toFixed(3)}`,
);
console.log(`Resultados → ${file}`);
