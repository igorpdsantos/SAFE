import type { Decimal } from './decimal.js';
import { ZERO } from './decimal.js';
import {
  INDICATOR_KEYS,
  type Contribution,
  type EngineConfig,
  type IndicatorKey,
  type IreResult,
  type Risks,
} from './types.js';

const order = (k: IndicatorKey) => INDICATOR_KEYS.indexOf(k);

/**
 * Ordena por valor decrescente (desempate fixo cr, cp, lf, ne) e marca os principais:
 * o menor conjunto cuja soma de participação atinge `threshold`. Valor 0 nunca é principal.
 */
export function markMain<T extends { key: IndicatorKey }>(
  items: T[],
  value: (item: T) => Decimal,
  share: (item: T) => Decimal | null,
  threshold: Decimal,
): (T & { isMain: boolean })[] {
  const sorted = [...items].sort(
    (a, b) => value(b).comparedTo(value(a)) || order(a.key) - order(b.key),
  );
  let acc = ZERO;
  return sorted.map((item) => {
    const s = share(item);
    const isMain = s !== null && value(item).greaterThan(0) && acc.lessThan(threshold);
    if (isMain) acc = acc.plus(s);
    return { ...item, isMain };
  });
}

/** "Por que meu risco é este?" (SPEC-05 §3.5). */
export function staticDecomposition(
  r: Risks,
  ire: IreResult,
  cfg: EngineConfig,
): Contribution[] | null {
  if (ire.raw.isZero()) return null;
  const items = INDICATOR_KEYS.map((key) => {
    const weighted = cfg.weights[key].times(r[key]);
    return { key, weighted, share: weighted.div(ire.raw) };
  });
  return markMain(
    items,
    (i) => i.weighted,
    (i) => i.share,
    cfg.mainFactorsShare,
  );
}
