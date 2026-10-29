import { Decimal, round2 } from '../engine/decimal.js';

export { Decimal, round2 };

const MONEY = /^\d{1,13}(\.\d{1,2})?$/;
const SIGNED_MONEY = /^-?\d{1,13}(\.\d{1,2})?$/;

export class InvalidMoneyError extends Error {
  constructor(readonly input: string) {
    super('Valor monetário inválido');
    this.name = 'InvalidMoneyError';
  }
}

/**
 * Converte o texto da API em Decimal. Aceita "1600", "1600.5" e "1600.50";
 * rejeita vírgula, notação científica, mais de 2 casas e (por padrão) negativo.
 */
export function parseMoney(input: string, opts: { allowNegative?: boolean } = {}): Decimal {
  const pattern = opts.allowNegative ? SIGNED_MONEY : MONEY;
  if (typeof input !== 'string' || !pattern.test(input)) throw new InvalidMoneyError(input);
  return new Decimal(input);
}

/** Dinheiro no JSON: string com 2 casas ("1600.00"). */
export function toMoneyString(value: Decimal): string {
  return value.toFixed(2, Decimal.ROUND_HALF_UP);
}

/** Razões e riscos no JSON: string com 4 casas ("0.1925"). */
export function toRatioString(value: Decimal): string {
  return value.toFixed(4, Decimal.ROUND_HALF_UP);
}
