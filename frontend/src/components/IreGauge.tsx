import { formatDecimal } from '../lib/format';

/** Barra de 0 a 1 com as fronteiras das faixas e o valor em texto (SPEC-11 §5). */
export function IreGauge({ value, label }: { value: string; label: string }) {
  const pct = Math.min(Math.max(Number(value), 0), 1) * 100;
  return (
    <div>
      <div
        className="gauge"
        role="img"
        aria-label={`Índice de risco ${formatDecimal(value)} de 1, ${label}`}
      >
        <span className="gauge-marker" style={{ left: `${pct}%` }} />
      </div>
      <div className="gauge-scale" aria-hidden="true">
        <span>0</span>
        <span>0,20</span>
        <span>0,40</span>
        <span>0,60</span>
        <span>0,80</span>
        <span>1</span>
      </div>
    </div>
  );
}
