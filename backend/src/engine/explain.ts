import { ZERO, type Decimal } from './decimal.js';
import { formatDecimalPtBr, formatMoneyPtBr, formatPercentPtBr } from './format.js';
import type { EngineConfig, IndicatorKey } from './types.js';

export interface ExplainInput {
  deltaIre: Decimal;
  factors: readonly {
    key: IndicatorKey;
    before: Decimal | null;
    after: Decimal | null;
    share: Decimal | null;
    isMain: boolean;
  }[];
  residualIncomeAfter: Decimal;
  belowMinimum: boolean;
  cfg: EngineConfig;
}

type Factor = ExplainInput['factors'][number];

/** Template de cada indicador (SPEC-08 §2.6). A reserva nunca muda com a compra. */
function phrase(f: Factor): string | null {
  const before = f.before ?? ZERO;
  const after = f.after ?? ZERO;
  switch (f.key) {
    case 'cr':
      return `elevaria o comprometimento da sua renda com dívidas de ${formatPercentPtBr(before)} para ${formatPercentPtBr(after)}`;
    case 'cp':
      return after.lessThanOrEqualTo(0)
        ? `deixaria sua renda sem folga: faltariam ${formatMoneyPtBr(after.abs())} por mês`
        : `reduziria sua folga mensal de ${formatMoneyPtBr(before)} para ${formatMoneyPtBr(after)}`;
    case 'ne':
      return `aumentaria o total das suas dívidas de ${formatDecimalPtBr(before, 1)} para ${formatDecimalPtBr(after, 1)} meses de renda`;
    case 'lf':
      return null;
  }
}

function joinPt(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

/** Explicação em linguagem simples, só com os principais fatores (SPEC-08 §2.6). */
export function explain(input: ExplainInput): string {
  const sentences: string[] = [];
  if (input.deltaIre.isZero()) {
    sentences.push('Esta decisão não altera o seu índice de risco.');
  } else {
    const main = input.factors.filter((f) => f.isMain);
    const phrases = main.map(phrase).filter((p): p is string => p !== null);
    sentences.push(`Esta compra ${joinPt(phrases)}.`);
    const total = main.reduce((acc, f) => acc.plus(f.share ?? ZERO), ZERO);
    sentences.push(
      main.length >= 2
        ? `Esses fatores respondem por ${formatPercentPtBr(total)} do aumento do risco.`
        : `Esse fator responde por ${formatPercentPtBr(total)} do aumento do risco.`,
    );
  }
  if (input.belowMinimum) {
    sentences.push(
      `Depois das parcelas, sobrariam ${formatMoneyPtBr(input.residualIncomeAfter)} da sua renda, abaixo do valor mínimo de referência de ${formatMoneyPtBr(input.cfg.minimumExistential)}.`,
    );
  }
  return sentences.join(' ');
}
