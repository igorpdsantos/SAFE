import { useEffect, useState } from 'react';
import { formatDecimal } from '../lib/format';

const CX = 150;
const CY = 150;
const R = 118;
/** Fronteiras das faixas (SPEC-05): 0,20 · 0,40 · 0,60 · 0,80. */
const SEGMENTS = [0, 0.2, 0.4, 0.6, 0.8, 1];

function point(t: number, r = R) {
  const a = Math.PI * (1 - t);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const;
}

function arc(from: number, to: number) {
  const [x1, y1] = point(from);
  const [x2, y2] = point(to);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/**
 * Mostrador do índice de 0 a 1, com as cinco faixas e o valor escrito (SPEC-11 §5).
 * A cor é só apoio: o valor e a faixa vêm em texto e no rótulo acessível (RNF05).
 */
export function IreGauge({ value, label }: { value: string; label: string }) {
  const target = Math.min(Math.max(Number(value), 0), 1);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  return (
    <div className="dial">
      <svg
        viewBox="0 0 300 170"
        role="img"
        aria-label={`Índice de risco ${formatDecimal(value)} de 1, ${label}`}
      >
        <path d={arc(0, 1)} stroke="rgb(255 255 255 / 10%)" strokeWidth="26" fill="none" />
        {SEGMENTS.slice(0, -1).map((from, i) => (
          <path
            key={from}
            d={arc(from + 0.006, SEGMENTS[i + 1]! - 0.006)}
            style={{ stroke: `var(--dial-${i + 1})` }}
            strokeWidth="18"
            fill="none"
            opacity={target >= from ? 1 : 0.35}
          />
        ))}
        {SEGMENTS.slice(1, -1).map((t) => {
          const [x1, y1] = point(t, R - 16);
          const [x2, y2] = point(t, R - 24);
          return (
            <line
              key={t}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgb(255 255 255 / 45%)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
        <g className="dial-needle" style={{ transform: `rotate(${shown * 180}deg)` }}>
          <path
            d={`M${CX} ${CY - 5} L${CX - R + 30} ${CY} L${CX} ${CY + 5} Z`}
            style={{ fill: 'var(--on-pine)' }}
          />
        </g>
        <circle cx={CX} cy={CY} r="11" style={{ fill: 'var(--on-pine)' }} />
        <circle cx={CX} cy={CY} r="4" style={{ fill: 'var(--gold)' }} />
      </svg>
      <div className="dial-scale" aria-hidden="true">
        <span>0 · risco baixo</span>
        <span>1 · crítico</span>
      </div>
    </div>
  );
}
