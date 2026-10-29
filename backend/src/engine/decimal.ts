import { Decimal as DecimalJs } from 'decimal.js';

/**
 * Decimal do SAFE: 40 dígitos e arredondamento half-up (SPEC-01 §4.1).
 * Clone próprio para que nenhuma configuração global de terceiros mude o motor.
 */
export const Decimal = DecimalJs.clone({ precision: 40, rounding: DecimalJs.ROUND_HALF_UP });
export type Decimal = InstanceType<typeof Decimal>;

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

/** Arredonda half-up em 2 casas: só para faixa, exibição e persistência (D-05). */
export function round2(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
