import { Decimal } from './decimal.js';

/** Insere o separador de milhar pt-BR numa parte inteira já em texto. */
function groupThousands(integer: string): string {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Número em pt-BR com `places` casas, a partir do Decimal (sem passar por `number`). */
export function formatDecimalPtBr(value: Decimal, places: number): string {
  const fixed = value.toFixed(places, Decimal.ROUND_HALF_UP);
  const negative = fixed.startsWith('-');
  const [int = '0', frac] = (negative ? fixed.slice(1) : fixed).split('.');
  const body = groupThousands(int) + (frac ? `,${frac}` : '');
  return negative && !/^[0,.]+$/.test(body) ? `-${body}` : body;
}

/** "R$ 1.600,00" */
export function formatMoneyPtBr(value: Decimal): string {
  const text = formatDecimalPtBr(value, 2);
  return text.startsWith('-') ? `-R$ ${text.slice(1)}` : `R$ ${text}`;
}

/** Razão → "25,0%" (1 casa por padrão). */
export function formatPercentPtBr(ratio: Decimal, places = 1): string {
  return `${formatDecimalPtBr(ratio.times(100), places)}%`;
}
