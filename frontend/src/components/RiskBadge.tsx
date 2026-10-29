import {
  CircleCheck,
  Info,
  OctagonAlert,
  Siren,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import type { RiskBand } from '../api/types';

export const BAND_ICONS: Record<RiskBand, LucideIcon> = {
  1: CircleCheck,
  2: Info,
  3: TriangleAlert,
  4: OctagonAlert,
  5: Siren,
};

export const BAND_LABELS: Record<RiskBand, string> = {
  1: 'Baixo risco',
  2: 'Risco moderado',
  3: 'Risco de atenção',
  4: 'Risco alto',
  5: 'Risco crítico',
};

/** Faixa de risco com cor + ícone + rótulo, nunca só a cor (RNF05). */
export function RiskBadge({ band, label }: { band: RiskBand; label?: string }) {
  const Icon = BAND_ICONS[band];
  return (
    <span className={`risk risk-${band}`}>
      <Icon size={18} aria-hidden="true" />
      {label ?? BAND_LABELS[band]}
    </span>
  );
}
