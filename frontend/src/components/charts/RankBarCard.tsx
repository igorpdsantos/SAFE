import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ContextSeries } from '../../api/types';
import { ChartFrame } from './ChartFrame';
import { EmptyChart, type EmptyAction } from './EmptyChart';
import { pct } from './viz';

/**
 * Ranking em barras horizontais com ÊNFASE: o primeiro na cor de destaque, o resto em cinza.
 * Barras ≤ 24px, ponta arredondada de 4px, valor na ponta.
 */
export function RankBarCard({
  title,
  subtitle,
  series,
  insight,
  emptyAction,
}: {
  title: ReactNode;
  subtitle: ReactNode;
  series: ContextSeries[];
  insight?: ReactNode;
  /** Saída oferecida quando o período não tem dados desta fonte. */
  emptyAction?: EmptyAction;
}) {
  const rows = series
    .map((s) => ({ s, p: s.points[s.points.length - 1] }))
    .filter((x) => !!x.p)
    .map(({ s, p }) => ({ name: s.name, value: Number(p!.value) }))
    .sort((a, b) => b.value - a.value);

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      insight={insight}
      sources={series.slice(0, 1)}
      table={
        rows.length ? (
          <table>
            <thead>
              <tr>
                <th scope="col">Tipo de dívida</th>
                <th scope="col">% das famílias endividadas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td>{pct(r.value)}</td>
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
        <div className="chart-plot" style={{ minHeight: rows.length * 34 + 8 }} aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 0, right: 56, bottom: 0, left: 0 }}
            >
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="name"
                width={156}
                tick={{ fontSize: 12, fill: 'var(--text)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'var(--surface-2)' }}
                content={({ active, payload }) =>
                  active && payload?.[0] ? (
                    <div className="viz-tooltip">
                      <strong>{pct(Number(payload[0].value))}</strong>{' '}
                      <span className="muted">das famílias endividadas</span>
                      <div className="when">{String(payload[0].payload.name)}</div>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="value" barSize={18} radius={[0, 4, 4, 0]}>
                {rows.map((r, i) => (
                  <Cell key={r.name} fill={i === 0 ? 'var(--series-1)' : 'var(--series-muted)'} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v) => pct(Number(v))}
                  style={{ fontSize: 12, fill: 'var(--text)', fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartFrame>
  );
}
