import { formatDecimal } from '../lib/format';

/** Barra do risco normalizado de um indicador, com o texto "Risco 0,20 de 1". */
export function RiskBar({ risk }: { risk: string }) {
  const pct = Math.min(Number(risk), 1) * 100;
  return (
    <div className="stack-sm">
      <div className="bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="small muted">Risco {formatDecimal(risk)} de 1</p>
    </div>
  );
}
