import type { IndicatorKey, RiskBand } from './types.js';

export interface BandLabel {
  label: string;
  color: `risk-${RiskBand}`;
  icon: 'check-circle' | 'info' | 'alert-triangle' | 'alert-octagon' | 'siren';
  recommendation: string;
}

/** Rótulo, cor, ícone e recomendação de cada faixa (SPEC-05 §5, PRD §5.5). Nunca só cor (RNF05). */
export const BAND_LABELS: Record<RiskBand, BandLabel> = {
  1: {
    label: 'Baixo risco',
    color: 'risk-1',
    icon: 'check-circle',
    recommendation:
      'Seu orçamento está equilibrado. Segundo os critérios do SAFE, ele comporta novos compromissos, mas isso não é garantia. A decisão é sua.',
  },
  2: {
    label: 'Risco moderado',
    color: 'risk-2',
    icon: 'info',
    recommendation: 'Tenha prudência e planeje antes de assumir novas dívidas de longo prazo.',
  },
  3: {
    label: 'Risco de atenção',
    color: 'risk-3',
    icon: 'alert-triangle',
    recommendation: 'Seu orçamento está perto do limite. Evite aumentar suas dívidas agora.',
  },
  4: {
    label: 'Risco alto',
    color: 'risk-4',
    icon: 'alert-octagon',
    recommendation: 'Evite novas contratações e reveja suas prioridades de gasto.',
  },
  5: {
    label: 'Risco crítico',
    color: 'risk-5',
    icon: 'siren',
    recommendation:
      'O foco agora é conter os danos. Procure renegociar suas dívidas e cortar gastos que não são essenciais.',
  },
};

export const INDICATOR_NAMES: Record<IndicatorKey, string> = {
  cr: 'Comprometimento da renda',
  cp: 'Folga mensal (capacidade de pagamento)',
  lf: 'Reserva de emergência (liquidez)',
  ne: 'Tamanho total das dívidas (nível de endividamento)',
};
