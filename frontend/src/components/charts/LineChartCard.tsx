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
import { formatDecimal } from '../../lib/format';
import { ChartFrame } from './ChartFrame';
import { EmptyChart, type EmptyAction } from './EmptyChart';
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
  type VizSeries,
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
  emptyAction,
  markPeak,
  wide,
  height = 280,
  tableExtra = [],
  format = pct,
  tickFormat,
  xLabel = monthShort,
  labelFormat = monthName,
  sourceNote,
  tableOrder = 'desc',
  showTable = true,
}: {
  title: ReactNode;
  subtitle: ReactNode;
  series: VizSeries[];
  insight?: ReactNode;
  /** Saída oferecida quando o período não tem dados desta fonte. */
  emptyAction?: EmptyAction;
  markPeak?: boolean;
  wide?: boolean;
  height?: number;
  /** Séries que entram só na tabela (ex.: a versão original de uma série ajustada). */
  tableExtra?: VizSeries[];
  /** Formato dos valores (rótulos, tooltip, tabela). Padrão: percentual. */
  format?: (v: number) => string;
  /** Formato das marcas do eixo Y. Padrão: número com as casas da escala. */
  tickFormat?: (v: number) => string;
  /** Rótulo curto do eixo X e rótulo longo (tooltip e tabela). Padrão: meses "AAAA-MM". */
  xLabel?: (key: string) => string;
  labelFormat?: (key: string) => string;
  sourceNote?: ReactNode;
  /** Tabela do mais recente para o mais antigo (padrão) ou na ordem do tempo. */
  tableOrder?: 'asc' | 'desc';
  showTable?: boolean;
}) {
  const shown = series.filter((s) => s.points.length > 0);
  const colors = Object.fromEntries(shown.map((s, i) => [s.id, SERIES_COLORS[i % 3]!]));
  const names = Object.fromEntries(shown.map((s) => [s.id, s.name]));
  // Datas "AAAA-MM" se ordenam como texto; rótulos prontos (ex.: "nov/2026") mantêm a ordem recebida.
  const keys = [...new Set(shown.flatMap((s) => s.points.map((p) => p.date)))];
  const dates = keys.every((k) => /^\d{4}-\d{2}/.test(k)) ? keys.sort() : keys;
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
  // Valores em reais têm rótulos mais largos ("R$ 26.000,00", "R$ 1,5 mil").
  const wideLabels = format !== pct;
  const lastPoint = (s: VizSeries): Point | undefined => toPoints(s).at(-1);
  const single = shown.length === 1 ? shown[0]! : null;
  const peak = single && markPeak ? extremes(toPoints(single)).max : null;
  const lastDate = (s: VizSeries) => lastPoint(s)?.date;

  const table = (
    <table>
      <thead>
        <tr>
          <th scope="col">Mês</th>
          {[...shown, ...tableExtra].map((s) => (
            <th key={s.id} scope="col">
              {s.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(tableOrder === 'desc' ? [...rows].reverse() : rows).map((r) => (
          <tr key={String(r.date)}>
            <td>{labelFormat(String(r.date))}</td>
            {shown.map((s) => (
              <td key={s.id}>{r[s.id] == null ? '—' : format(Number(r[s.id]))}</td>
            ))}
            {tableExtra.map((s) => {
              const p = s.points.find((x) => x.date === r.date);
              return <td key={s.id}>{p ? format(Number(p.value)) : '—'}</td>;
            })}
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
      sources={[...series, ...tableExtra]}
      table={shown.length && showTable ? table : undefined}
      sourceNote={sourceNote}
      wide={wide}
    >
      {shown.length === 0 ? (
        <EmptyChart
          message="Não há dados desta pesquisa nos meses escolhidos."
          action={emptyAction}
        />
      ) : (
        <div className="chart-plot" style={{ minHeight: height }} aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%" minHeight={height}>
            <ComposedChart
              data={rows}
              margin={{ top: 16, right: wideLabels ? 104 : 56, bottom: 0, left: 0 }}
            >
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="date"
                tickFormatter={xLabel}
                tick={{ fontSize: 12, fill: 'var(--muted)' }}
                axisLine={{ stroke: 'var(--chart-grid)' }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={domain}
                width={wideLabels ? 76 : 44}
                ticks={ticks}
                tick={{ fontSize: 12, fill: 'var(--muted)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={tickFormat ?? ((v: number) => formatDecimal(String(v), places))}
              />
              <Tooltip
                cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
                content={
                  <VizTooltip
                    names={names}
                    colors={colors}
                    format={format}
                    labelFormat={labelFormat}
                  />
                }
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
                      value: format(p.value),
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
                    value: `pico: ${format(peak.value)}`,
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
      {shown.length > 0 && domain[0] > 0 && (
        <p className="chart-note">
          O eixo começa em{' '}
          {(tickFormat ?? ((v: number) => formatDecimal(String(v), places)))(domain[0])} para
          mostrar melhor a variação.
        </p>
      )}
    </ChartFrame>
  );
}
