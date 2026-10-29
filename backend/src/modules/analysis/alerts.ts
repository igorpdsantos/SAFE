import type { Diagnosis } from '../../engine/types.js';
import { formatMoneyPtBr } from '../../engine/format.js';
import type { EngineConfig } from '../../engine/types.js';

export type AlertType =
  'FAIXA_3' | 'FAIXA_4' | 'FAIXA_5' | 'CAPACIDADE_NEGATIVA' | 'MINIMO_EXISTENCIAL';

/** Textos da SPEC-07 §4: sempre com o que fazer, sem julgar. */
export function alertMessage(type: AlertType, cfg: EngineConfig): string {
  switch (type) {
    case 'FAIXA_3':
      return 'Seu orçamento está se aproximando do limite. Evite assumir novas dívidas agora.';
    case 'FAIXA_4':
      return 'Seu risco está alto. O ideal é não contratar novos créditos e rever prioridades.';
    case 'FAIXA_5':
      return 'Seu risco é crítico. Priorize renegociar suas dívidas.';
    case 'CAPACIDADE_NEGATIVA':
      return 'Suas despesas e parcelas já passam da sua renda mensal. Veja quais gastos dá para reduzir.';
    case 'MINIMO_EXISTENCIAL':
      return `Depois das parcelas, sobra menos de ${formatMoneyPtBr(cfg.minimumExistential)} da sua renda, o valor mínimo de referência usado pelo SAFE. Evite novas parcelas.`;
  }
}

/** Alertas que a situação atual exige, com severidade (D-14, SPEC-07 §2). */
export function requiredAlerts(d: Diagnosis): { type: AlertType; severity: number }[] {
  const out: { type: AlertType; severity: number }[] = [];
  if (d.ire.band >= 3) out.push({ type: `FAIXA_${d.ire.band}` as AlertType, severity: d.ire.band });
  if (d.critical.negativeCapacity) out.push({ type: 'CAPACIDADE_NEGATIVA', severity: 5 });
  if (d.critical.belowMinimumExistential) out.push({ type: 'MINIMO_EXISTENCIAL', severity: 5 });
  return out;
}

export const ALL_ALERT_TYPES: AlertType[] = [
  'FAIXA_3',
  'FAIXA_4',
  'FAIXA_5',
  'CAPACIDADE_NEGATIVA',
  'MINIMO_EXISTENCIAL',
];
