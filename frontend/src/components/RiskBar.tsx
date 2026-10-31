import { formatDecimal } from '../lib/format';

/** Barra do risco normalizado de um indicador, com o texto "Risco 0,20 de 1". */
export function RiskBar({ risk }: { risk: string }) {
  const pct = Math.min(Number(risk), 1) * 100;
  return (
    <div>
      <div className="bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="small muted" style={{ margin: '0.35rem 0 0' }}>
        Risco {formatDecimal(risk)} de 1
      </p>
    </div>
  );
}
