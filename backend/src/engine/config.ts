import { Decimal } from './decimal.js';
import type { EngineConfig } from './types.js';

const d = (v: string) => new Decimal(v);

function deepFreeze<T>(obj: T): T {
  for (const value of Object.values(obj as object)) {
    if (value && typeof value === 'object' && !(value instanceof Decimal)) deepFreeze(value);
  }
  return Object.freeze(obj);
}

/** Parâmetros do artigo (PRD §5.3–§6.4). Num único objeto para a análise de sensibilidade. */
export const DEFAULT_CONFIG: EngineConfig = deepFreeze({
  weights: { cr: d('0.40'), cp: d('0.30'), lf: d('0.20'), ne: d('0.10') },
  caps: { cr: d('0.50'), ne: d('12'), lf: d('6'), cpShare: d('0.30') },
  bandUpperBounds: [d('0.20'), d('0.40'), d('0.60'), d('0.80')] as const,
  delta: d('0.05'),
  minimumExistential: d('600.00'),
  mainFactorsShare: d('0.75'),
});

export interface ConfigOverrides {
  weights?: Partial<EngineConfig['weights']>;
  caps?: Partial<EngineConfig['caps']>;
  bandUpperBounds?: EngineConfig['bandUpperBounds'];
  delta?: Decimal;
  minimumExistential?: Decimal;
  mainFactorsShare?: Decimal;
}

/** Cria uma configuração nova a partir de outra; nunca altera a original. */
export function withConfig(
  overrides: ConfigOverrides,
  base: EngineConfig = DEFAULT_CONFIG,
): EngineConfig {
  return deepFreeze({
    weights: { ...base.weights, ...overrides.weights },
    caps: { ...base.caps, ...overrides.caps },
    bandUpperBounds: overrides.bandUpperBounds ?? base.bandUpperBounds,
    delta: overrides.delta ?? base.delta,
    minimumExistential: overrides.minimumExistential ?? base.minimumExistential,
    mainFactorsShare: overrides.mainFactorsShare ?? base.mainFactorsShare,
  });
}
