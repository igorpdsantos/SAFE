import type { Alert, RiskBand } from '../api/types';
import { BAND_ICONS } from './RiskBadge';

/** Alerta com ícone + texto + "Marcar como lido"; anunciado para leitores de tela (SPEC-11 §5). */
export function AlertBanner({
  alert,
  onRead,
  busy,
}: {
  alert: Alert;
  onRead: () => void;
  busy?: boolean;
}) {
  const band = Math.min(Math.max(alert.severity, 1), 5) as RiskBand;
  const Icon = BAND_ICONS[band];
  return (
    <div className={`alert risk-${band}`} role="alert">
      <Icon size={24} aria-hidden="true" />
      <p style={{ margin: 0, flex: 1, minWidth: 200, color: 'var(--text)', fontWeight: 550 }}>
        {alert.message}
      </p>
      <button type="button" className="btn btn-link" onClick={onRead} disabled={busy}>
        Marcar como lido
      </button>
    </div>
  );
}
