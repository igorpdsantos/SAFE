import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ContextSeries } from '../../api/types';
import { ChartFrame } from './ChartFrame';
import { EmptyChart, type EmptyAction } from './EmptyChart';
import { Sparkline } from './StatTile';
import { SERIES_COLORS, monthName, pct, pp, toPoints } from './viz';

/** 100 pontos (10 × 10): os primeiros N pintados. Cada quadro é independente; não soma com os outros. */
function Waffle({ count, color, label }: { count: number; color: string; label: string }) {
  const cell = 10;
  return (
    <svg viewBox={`0 0 ${cell * 10} ${cell * 10}`} className="waffle" role="img" aria-label={label}>
      {Array.from({ length: 100 }, (_, i) => (
        <circle
          key={i}
          cx={(i % 10) * cell + cell / 2}
          cy={Math.floor(i / 10) * cell + cell / 2}
          r={3.6}
          fill={i < count ? color : 'var(--surface-3)'}
        />
      ))}
    </svg>
  );
}

/**
 * "De cada 100 famílias": o último mês do período em quadros de 100 pontos (valor arredondado
 * para pessoas inteiras; o exato fica ao lado e na tabela) e como cada número mudou.
 */
export function PerHundred({
  title,
  subtitle,
  items,
  insight,
  emptyAction,
}: {
  title: ReactNode;
  subtitle: ReactNode;
  items: { series?: ContextSeries; phrase: string; short: string }[];
  insight?: ReactNode;
  emptyAction?: EmptyAction;
}) {
  const rows = items
    .filter(
      (i): i is { series: ContextSeries; phrase: string; short: string } =>
        !!i.series?.points.length,
    )
    .map((i, k) => {
      const points = toPoints(i.series);
      return {
        ...i,
        points,
        last: points[points.length - 1]!,
        first: points[0]!,
        color: SERIES_COLORS[k % 3]!,
      };
    });
  const month = rows[0]?.last.date;
  const dates = [...new Set(rows.flatMap((r) => r.points.map((p) => p.date)))].sort().reverse();

  return (
    <ChartFrame
      title={title}
      subtitle={
        month ? (
          <>
            {subtitle} Dados de {monthName(month)}.
          </>
        ) : (
          subtitle
        )
      }
      insight={rows.length ? insight : undefined}
      sources={items.flatMap((i) => (i.series ? [i.series] : [])).slice(0, 1)}
      table={
        rows.length ? (
          <table>
            <thead>
              <tr>
                <th scope="col">Mês</th>
                {rows.map((r) => (
                  <th key={r.series.id} scope="col">
                    {r.series.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((d) => (
                <tr key={d}>
                  <td>{monthName(d)}</td>
                  {rows.map((r) => {
                    const p = r.points.find((x) => x.date === d);
                    return <td key={r.series.id}>{p ? pct(p.value) : '—'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <EmptyChart
          message="Não há dados desta pesquisa nos meses escolhidos."
          action={emptyAction}
        />
      ) : (
        <>
          <ul className="per-hundred">
            {rows.map((r) => {
              const n = Math.round(r.last.value);
              return (
                <li key={r.series.id}>
                  <Waffle
                    count={n}
                    color={r.color}
                    label={`${n} de cada 100 famílias ${r.phrase}`}
                  />
                  <div className="stack-xs">
                    <p>
                      <strong className="per-hundred-n">{n}</strong> {r.phrase}
                    </p>
                    <p className="small muted">{pct(r.last.value)} das famílias</p>
                  </div>
                </li>
              );
            })}
          </ul>
          {rows[0]!.points.length > 1 && (
            <div className="stack-sm">
              <h4 className="small muted">Como mudou desde {monthName(rows[0]!.first.date)}</h4>
              <ul className="change-rows">
                {rows.map((r) => {
                  const delta = r.last.value - r.first.value;
                  const Icon =
                    Math.abs(delta) < 0.05 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
                  return (
                    <li key={r.series.id}>
                      <span className="change-name">
                        <span className="line-key" style={{ color: r.color }} aria-hidden="true" />
                        {r.short}
                      </span>
                      <Sparkline points={r.points} />
                      <span className="change-delta">
                        <Icon size={16} aria-hidden="true" />
                        {Math.abs(delta) < 0.05 ? 'estável' : pp(delta)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </ChartFrame>
  );
}
