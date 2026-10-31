import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartFrame } from './ChartFrame';
import { extremes, toPoints, yScale, type VizSeries } from './viz';

/**
 * Colunas por mês (ex.: a sobra de cada mês). Valor ≤ 0 aparece na cor de alerta do sistema e
 * sempre com o texto "sem sobra" na tabela e no tooltip; o menor mês leva rótulo.
 */
export function ColumnChartCard({
  title,
  subtitle,
  series,
  format,
  tickFormat,
  xLabel,
  insight,
  sourceNote,
  table,
  wide,
  height = 260,
}: {
  title: ReactNode;
  subtitle: ReactNode;
  series: VizSeries;
  format: (v: number) => string;
  tickFormat: (v: number) => string;
  xLabel: (key: string) => string;
  insight?: ReactNode;
  sourceNote?: ReactNode;
  table?: ReactNode;
  wide?: boolean;
  height?: number;
}) {
  const points = toPoints(series);
  const rows = points.map((p) => ({ key: p.date, value: p.value }));
  const { domain, ticks } = yScale([0, ...points.map((p) => p.value)]);
  const low = points.length ? extremes(points).min : null;

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      insight={insight}
      sourceNote={sourceNote}
      table={table}
      wide={wide}
      legend={
        points.some((p) => p.value <= 0)
          ? [
              { name: 'Sobra no mês', color: 'var(--series-1)', kind: 'swatch' },
              { name: 'Mês sem sobra', color: 'var(--danger)', kind: 'swatch' },
            ]
          : undefined
      }
    >
      <div className="chart-plot" style={{ minHeight: height }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" minHeight={height}>
          <BarChart data={rows} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="key"
              tickFormatter={xLabel}
              tick={{ fontSize: 12, fill: 'var(--muted)' }}
              axisLine={{ stroke: 'var(--chart-grid)' }}
              tickLine={false}
              minTickGap={12}
            />
            <YAxis
              domain={domain}
              ticks={ticks}
              width={76}
              tick={{ fontSize: 12, fill: 'var(--muted)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={tickFormat}
            />
            <ReferenceLine y={0} stroke="var(--muted)" />
            <Tooltip
              cursor={{ fill: 'var(--surface-2)' }}
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="viz-tooltip">
                    <div className="when">{String(payload[0].payload.key)}</div>
                    <strong>{format(Number(payload[0].value))}</strong>
                    {Number(payload[0].value) <= 0 && <span className="muted"> · sem sobra</span>}
                  </div>
                ) : null
              }
            />
            <Bar dataKey="value" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.key} fill={r.value <= 0 ? 'var(--danger)' : 'var(--series-1)'} />
              ))}
              <LabelList
                dataKey="value"
                content={(props) => {
                  const { x, y, width, index } = props as {
                    x?: number;
                    y?: number;
                    width?: number;
                    index?: number;
                  };
                  if (index == null || !low || rows[index]?.key !== low.date) return null;
                  return (
                    <text
                      x={Number(x) + Number(width) / 2}
                      y={Number(y) - 6}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={650}
                      fill="var(--text)"
                    >
                      menor: {format(low.value)}
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
