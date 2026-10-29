import { round2, ZERO } from './decimal.js';
import {
  INDICATOR_KEYS,
  type EngineConfig,
  type IreResult,
  type RiskBand,
  type Risks,
} from './types.js';

/** IRE com precisão total; só `rounded` é arredondado, e é ele que define a faixa (SPEC-05 §3.4). */
export function computeIre(r: Risks, cfg: EngineConfig): IreResult {
  const raw = INDICATOR_KEYS.reduce((acc, k) => acc.plus(cfg.weights[k].times(r[k])), ZERO);
  const rounded = round2(raw);
  return { raw, rounded, band: bandOf(rounded, cfg) };
}

export function bandOf(rounded: IreResult['rounded'], cfg: EngineConfig): RiskBand {
  const index = cfg.bandUpperBounds.findIndex((upper) => rounded.lessThanOrEqualTo(upper));
  return (index === -1 ? 5 : index + 1) as RiskBand;
}
