import { formatDecimal } from '../lib/format';

/** Barra do risco normalizado de um indicador, com o texto "risco 0,20 de 1". */
export function RiskBar({ risk }: { risk: string }) {
  return (
    <div>
      <div className="bar" aria-hidden="true">
        <span style={{ width: `${Math.min(Number(risk), 1) * 100}%` }} />
      </div>
      <p className="small muted" style={{ margin: '0.25rem 0 0' }}>
        Risco {formatDecimal(risk)} de 1
      </p>
    </div>
  );
}
