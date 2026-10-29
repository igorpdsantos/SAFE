import { DEFAULT_CONFIG } from './config.js';
import { Decimal, ZERO } from './decimal.js';
import { markMain } from './decomposition.js';
import { diagnose } from './diagnose.js';
import { SimulationValidationError } from './errors.js';
import { explain } from './explain.js';
import { formatMoneyPtBr } from './format.js';
import { project, type Projection } from './projection.js';
import {
  INDICATOR_KEYS,
  type BudgetSnapshot,
  type Diagnosis,
  type EngineConfig,
  type IndicatorKey,
} from './types.js';

export interface SimulationInput {
  value: Decimal; // V
  installments: number; // n
  installmentValue: Decimal; // p
}

export type Outcome = 'SEM_AGRAVAMENTO' | 'AGRAVAMENTO' | 'CRITICO';

export interface FactorDelta {
  key: IndicatorKey;
  before: Decimal | null; // valor bruto (lf pode ser null)
  after: Decimal | null;
  riskBefore: Decimal;
  riskAfter: Decimal;
  delta: Decimal; // ΔC_i = W_i·(R_after − R_before)
  share: Decimal | null; // π_i (null se ΔIRE = 0)
  isMain: boolean;
  unchanged: boolean;
  saturatedBoth: boolean;
}

export interface SimulationResult {
  input: SimulationInput;
  financialCost: Decimal;
  current: Diagnosis;
  projected: Diagnosis;
  deltaIre: Decimal;
  factors: FactorDelta[];
  outcome: Outcome;
  alertSeverity: 0 | 1 | 2 | 3 | 4 | 5;
  residualIncomeAfter: Decimal;
  projection: { without: Projection; with: Projection };
  explanation: string;
}

export const MAX_INSTALLMENTS = 600;
const CENT = new Decimal('0.01');

/** Regras de entrada da SPEC-08 §2.1 (E01, E02), com tolerância de 1 centavo por parcela (D-11). */
export function validateSimulation(i: SimulationInput): void {
  const fields: Record<string, string> = {};
  if (!i.value.greaterThan(0))
    fields.value = 'Digite o valor da compra, maior que zero. Ex.: 1.200,00';
  if (
    !Number.isInteger(i.installments) ||
    i.installments < 1 ||
    i.installments > MAX_INSTALLMENTS
  ) {
    fields.installments = 'Digite um número inteiro de parcelas, de 1 a 600. Ex.: 12';
  }
  if (!i.installmentValue.greaterThan(0)) {
    fields.installmentValue = 'Digite o valor de cada parcela, maior que zero. Ex.: 100,00';
  }
  if (Object.keys(fields).length > 0) {
    throw new SimulationValidationError('VALIDATION', 'Confira os campos destacados.', fields);
  }
  const total = i.installmentValue.times(i.installments);
  const tolerance = CENT.times(i.installments);
  if (total.lessThan(i.value.minus(tolerance))) {
    throw new SimulationValidationError(
      'INCONSISTENT',
      `O total das parcelas (${formatMoneyPtBr(total)}) é menor que o valor da compra (${formatMoneyPtBr(i.value)}). Confira os valores.`,
    );
  }
}

const sameValue = (a: Decimal | null, b: Decimal | null) =>
  a === null || b === null ? a === b : a.equals(b);

/** "E se eu comprar?": compara o risco de hoje com o do mês de maior exposição (SPEC-08 §2). */
export function simulate(
  s: BudgetSnapshot,
  i: SimulationInput,
  cfg: EngineConfig = DEFAULT_CONFIG,
): SimulationResult {
  validateSimulation(i);
  const current = diagnose(s, cfg);
  const scenario: BudgetSnapshot = {
    ...s,
    debts: [
      ...s.debts,
      {
        id: 'sim',
        installment: i.installmentValue,
        remaining: i.installments,
        balance: i.installmentValue.times(i.installments),
      },
    ],
  };
  const projected = diagnose(scenario, cfg);
  const deltaIre = projected.ire.raw.minus(current.ire.raw);

  const raw = INDICATOR_KEYS.map((key) => {
    const delta = cfg.weights[key].times(projected.risks[key].minus(current.risks[key]));
    const before = current.indicators[key];
    const after = projected.indicators[key];
    return {
      key,
      before,
      after,
      riskBefore: current.risks[key],
      riskAfter: projected.risks[key],
      delta,
      share: deltaIre.greaterThan(0) ? delta.div(deltaIre) : null,
      unchanged: delta.isZero(),
      saturatedBoth:
        current.risks.saturated[key] && projected.risks.saturated[key] && !sameValue(before, after),
    };
  });
  const factors = markMain(
    raw,
    (f) => f.delta,
    (f) => f.share,
    cfg.mainFactorsShare,
  );

  const residualIncomeAfter = current.totals.income.minus(
    current.totals.installments.plus(i.installmentValue),
  );
  let outcome: Outcome = 'SEM_AGRAVAMENTO';
  let alertSeverity: SimulationResult['alertSeverity'] = 0;
  const belowMinimum = residualIncomeAfter.lessThan(cfg.minimumExistential);
  if (projected.indicators.cp.lessThanOrEqualTo(0) || belowMinimum) {
    outcome = 'CRITICO';
    alertSeverity = 5;
  } else if (deltaIre.greaterThanOrEqualTo(cfg.delta) || projected.ire.band > current.ire.band) {
    outcome = 'AGRAVAMENTO';
    alertSeverity = projected.ire.band;
  }

  const financialCost = Decimal.max(i.installmentValue.times(i.installments).minus(i.value), ZERO);
  return {
    input: i,
    financialCost,
    current,
    projected,
    deltaIre,
    factors,
    outcome,
    alertSeverity,
    residualIncomeAfter,
    projection: {
      without: project(s),
      with: project(s, { installment: i.installmentValue, n: i.installments }),
    },
    explanation: explain({ deltaIre, factors, residualIncomeAfter, belowMinimum, cfg }),
  };
}
