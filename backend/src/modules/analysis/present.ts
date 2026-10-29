import { Decimal } from '../../engine/decimal.js';
import { formatDecimalPtBr, formatMoneyPtBr, formatPercentPtBr } from '../../engine/format.js';
import { BAND_LABELS, INDICATOR_NAMES } from '../../engine/labels.js';
import type {
  Contribution,
  Diagnosis,
  IndicatorKey,
  IreResult,
  Totals,
} from '../../engine/types.js';
import { toMoneyString, toRatioString } from '../../lib/decimal.js';

/** "1,5 mês" / "3,0 meses": singular abaixo de 2. */
export function monthsText(value: Decimal, suffix = ''): string {
  const unit = value.lessThan(2) ? 'mês' : 'meses';
  return `${formatDecimalPtBr(value, 1)} ${unit}${suffix}`;
}

export function ireDto(ire: IreResult) {
  const band = BAND_LABELS[ire.band];
  return {
    raw: toRatioString(ire.raw),
    value: ire.rounded.toFixed(2),
    band: ire.band,
    label: band.label,
    color: band.color,
    icon: band.icon,
    recommendation: band.recommendation,
  };
}

export function totalsDto(t: Totals) {
  return {
    income: toMoneyString(t.income),
    expenses: toMoneyString(t.expenses),
    installments: toMoneyString(t.installments),
    debtBalance: toMoneyString(t.balance),
    reserve: toMoneyString(t.reserve),
  };
}

/** Nível do comprometimento da renda (HU09 critério 6): OK < 30%, ATENCAO 30–50%, ALTO > 50%. */
export function crLevel(cr: Decimal): 'OK' | 'ATENCAO' | 'ALTO' {
  if (cr.lessThan('0.30')) return 'OK';
  return cr.lessThanOrEqualTo('0.50') ? 'ATENCAO' : 'ALTO';
}

/** Texto pt-BR do valor bruto de cada indicador (usado no dashboard e na simulação). */
export function indicatorDisplay(key: IndicatorKey, value: Decimal | null): string {
  switch (key) {
    case 'cr':
      return formatPercentPtBr(value ?? new Decimal(0), 2);
    case 'cp':
      return formatMoneyPtBr(value ?? new Decimal(0));
    case 'lf':
      return value === null ? 'Sem despesas cadastradas' : monthsText(value);
    case 'ne':
      return monthsText(value ?? new Decimal(0), ' de renda');
  }
}

export function indicatorsDto(d: Diagnosis) {
  const { indicators: i, risks: r } = d;
  return {
    cr: {
      value: toRatioString(i.cr),
      display: indicatorDisplay('cr', i.cr),
      risk: toRatioString(r.cr),
      saturated: r.saturated.cr,
      level: crLevel(i.cr),
      exceedsIncome: i.cr.greaterThan(1),
    },
    cp: {
      value: toMoneyString(i.cp),
      display: indicatorDisplay('cp', i.cp),
      risk: toRatioString(r.cp),
      saturated: r.saturated.cp,
    },
    lf: {
      value: i.lf === null ? null : toRatioString(i.lf),
      display: indicatorDisplay('lf', i.lf),
      risk: toRatioString(r.lf),
      saturated: r.saturated.lf,
    },
    ne: {
      value: toRatioString(i.ne),
      display: indicatorDisplay('ne', i.ne),
      risk: toRatioString(r.ne),
      saturated: r.saturated.ne,
    },
  };
}

export function factorsDto(contributions: Contribution[] | null) {
  return (
    contributions?.map((c) => ({
      key: c.key,
      name: INDICATOR_NAMES[c.key],
      points: toRatioString(c.weighted),
      share: toRatioString(c.share),
      isMain: c.isMain,
    })) ?? null
  );
}
