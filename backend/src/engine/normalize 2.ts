import { Decimal, ONE, ZERO } from './decimal.js';
import type { EngineConfig, Indicators, Risks, Totals } from './types.js';

const clamp01 = (v: Decimal) => Decimal.min(Decimal.max(v, ZERO), ONE);

/** Converte cada indicador em risco [0, 1] e marca quando o corte agiu (SPEC-05 §3.3). */
export function normalize(ind: Indicators, t: Totals, cfg: EngineConfig): Risks {
  const { caps } = cfg;
  const cpComfort = caps.cpShare.times(t.income);

  const cr = Decimal.min(ind.cr.div(caps.cr), ONE);
  const ne = Decimal.min(ind.ne.div(caps.ne), ONE);
  const lf = ind.lf === null ? ZERO : Decimal.max(ONE.minus(ind.lf.div(caps.lf)), ZERO); // D-10
  const cp = clamp01(ONE.minus(ind.cp.div(cpComfort))); // D-06: teto em 1

  return {
    cr,
    cp,
    lf,
    ne,
    saturated: {
      cr: ind.cr.greaterThanOrEqualTo(caps.cr),
      ne: ind.ne.greaterThanOrEqualTo(caps.ne),
      lf: ind.lf !== null && ind.lf.greaterThanOrEqualTo(caps.lf),
      cp: ind.cp.lessThanOrEqualTo(0) || ind.cp.greaterThanOrEqualTo(cpComfort),
    },
  };
}
