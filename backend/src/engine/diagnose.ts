import { DEFAULT_CONFIG } from './config.js';
import { staticDecomposition } from './decomposition.js';
import { computeIndicators, totals } from './indicators.js';
import { computeIre } from './ire.js';
import { normalize } from './normalize.js';
import type { BudgetSnapshot, Diagnosis, EngineConfig } from './types.js';

/** Diagnóstico completo da situação (SPEC-05 §3.6). */
export function diagnose(s: BudgetSnapshot, cfg: EngineConfig = DEFAULT_CONFIG): Diagnosis {
  const t = totals(s);
  const indicators = computeIndicators(t);
  const risks = normalize(indicators, t, cfg);
  const ire = computeIre(risks, cfg);
  const residualIncome = t.income.minus(t.installments);
  return {
    totals: t,
    indicators,
    risks,
    ire,
    contributions: staticDecomposition(risks, ire, cfg),
    residualIncome,
    critical: {
      negativeCapacity: indicators.cp.lessThanOrEqualTo(0),
      belowMinimumExistential: residualIncome.lessThan(cfg.minimumExistential),
    },
  };
}
