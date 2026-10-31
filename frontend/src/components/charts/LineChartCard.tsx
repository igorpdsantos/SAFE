import type { ReactNode } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ContextSeries } from '../../api/types';
import { formatDecimal } from '../../lib/format';
import { ChartFrame } from './ChartFrame';
import { VizTooltip } from './VizTooltip';
import {
  SERIES_COLORS,
  extremes,
  monthName,
  monthShort,
  pct,
  toPoints,
  yScale,
  type Point,
} from './viz';

/**
 * Linhas ao longo do tempo, UMA escala só. Valor no fim de cada linha; com uma série, área
 * suave (~10%) e, se pedido, o pico marcado. Legenda só com 2+ séries.
 */
export function LineChartCard({
  title,
  subtitle,
  series,
  insight,
  markPeak,
  wide,
  height = 280,
}: {
  title: ReactNode;
  subtitle: ReactNode;
  series: ContextSeries[];
  insight?: ReactNode;
  markPeak?: boolean;
  wide?: boolean;
  height?: number;
}) {
  const shown = series.filter((s) => s.points.length > 0);
  const colors = Object.fromEntries(shown.map((s, i) => [s.id, SERIES_COLORS[i % 3]!]));
  const names = Object.fromEntries(shown.map((s) => [s.id, s.name]));
  const dates = [...new Set(shown.flatMap((s) => s.points.map((p) => p.date)))].sort();
  const rows = dates.map((date) => {
    const row: Record<string, string | number | null> = { date };
    for (const s of shown) {
      const p = s.points.find((x) => x.date === date);
      row[s.id] = p ? Number(p.value) : null;
    }
    return row;
  });
  const all = shown.flatMap((s) => toPoints(s).map((p) => p.value));
  const { domain, ticks, places } = all.length
    ? yScale(all)
    : { domain: [0, 1] as [number, number], ticks: [0, 1], places: 0 };
  const lastPoint = (s: ContextSeries): Point | undefined => toPoints(s).at(-1);
  const single = shown.length === 1 ? shown[0]! : null;
  const peak = single && markPeak ? extremes(toPoints(single)).max : null;
  const lastDate = (s: ContextSeries) => lastPoint(s)?.date;

  const table = (
    <table>
      <thead>
        <tr>
          <th scope="col">Mês</th>
          {shown.map((s) => (
            <th key={s.id} scope="col">
              {s.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[...rows].reverse().map((r) => (
          <tr key={String(r.date)}>
            <td>{monthName(String(r.date))}</td>
            {shown.map((s) => (
              <td key={s.id}>{r[s.id] == null ? '—' : pct(Number(r[s.id]))}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      legend={shown.map((s) => ({ name: s.name, color: colors[s.id]! }))}
      insight={insight}
      sources={series}
      table={shown.length ? table : undefined}
      wide={wide}
    >
      {shown.length === 0 ? (
        <p className="muted">
          Não há dados desta fonte no período escolhido. Escolha um período maior.
        </p>
      ) : (
        <div style={{ width: '100%', height }} aria-hidden="true">
          <ResponsiveContainer>
            <ComposedChart data={rows} margin={{ top: 16, right: 56, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="date"
                tickFormatter={monthShort}
                tick={{ fontSize: 12, fill: 'var(--muted)' }}
                axisLine={{ stroke: 'var(--chart-grid)' }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={domain}
                width={44}
                ticks={ticks}
                tick={{ fontSize: 12, fill: 'var(--muted)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatDecimal(String(v), places)}
              />
              <Tooltip
                cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
                content={<VizTooltip names={names} colors={colors} />}
              />
              {single && (
                <Area
                  dataKey={single.id}
                  stroke="none"
                  fill={colors[single.id]}
                  fillOpacity={0.1}
                  isAnimationActive={false}
                  tooltipType="none"
                />
              )}
              {shown.map((s) => (
                <Line
                  key={s.id}
                  dataKey={s.id}
                  stroke={colors[s.id]}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}
                  connectNulls={false}
                />
              ))}
              {shown.map((s) => {
                const p = lastPoint(s);
                return p ? (
                  <ReferenceDot
                    key={`fim-${s.id}`}
                    x={p.date}
                    y={p.value}
                    r={4}
                    fill={colors[s.id]}
                    stroke="var(--surface)"
                    strokeWidth={2}
                    ifOverflow="visible"
                    label={{
                      value: pct(p.value),
                      position: 'right',
                      offset: 8,
                      fontSize: 12,
                      fontWeight: 650,
                      fill: 'var(--text)',
                    }}
                  />
                ) : null;
              })}
              {peak && single && peak.date !== lastDate(single) && (
                <ReferenceDot
                  x={peak.date}
                  y={peak.value}
                  r={4}
                  fill={colors[single.id]}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  ifOverflow="visible"
                  label={{
                    value: `pico: ${pct(peak.value)}`,
                    position: 'top',
                    fontSize: 12,
                    fill: 'var(--muted)',
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartFrame>
  );
}
