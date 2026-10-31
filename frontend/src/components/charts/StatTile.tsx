import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { ContextSeries } from '../../api/types';
import { monthName, pct, pp, toPoints, type Point } from './viz';

/** Mini-gráfico: linha em cinza, o último ponto em destaque. */
function Sparkline({ points }: { points: Point[] }) {
  if (points.length < 2) return null;
  const w = 200;
  const h = 36;
  const vs = points.map((p) => p.value);
  const lo = Math.min(...vs);
  const span = Math.max(...vs) - lo || 1;
  const xy = points.map((p, i) => [
    (i / (points.length - 1)) * (w - 8) + 4,
    h - 4 - ((p.value - lo) / span) * (h - 8),
  ]);
  const [lx, ly] = xy[xy.length - 1]!;
  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={xy.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none"
        stroke="var(--series-muted)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={lx}
        cy={ly}
        r={3.5}
        fill="var(--series-1)"
        stroke="var(--surface)"
        strokeWidth={2}
      />
    </svg>
  );
}

/**
 * Manchete de um indicador: rótulo, valor do último mês, variação no período (neutra: a seta diz
 * a direção, não se é bom ou ruim) e mini-gráfico.
 */
export function StatTile({ label, series }: { label: string; series?: ContextSeries }) {
  const points = series ? toPoints(series) : [];
  const last = points[points.length - 1];
  const first = points[0];
  if (!series || !last || !first) return null;
  const delta = last.value - first.value;
  const Icon = Math.abs(delta) < 0.05 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  return (
    <article className="card stat-tile">
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {pct(last.value)} <small>{monthName(last.date)}</small>
      </span>
      {points.length > 1 && (
        <span className="stat-delta">
          <Icon size={16} aria-hidden="true" />
          {Math.abs(delta) < 0.05 ? 'estável' : pp(delta)} desde {monthName(first.date)}
        </span>
      )}
      <div className="stat-bottom stack-xs">
        <Sparkline points={points} />
        <span className="stat-foot">{series.unit}</span>
      </div>
    </article>
  );
}
