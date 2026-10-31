import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useHistory } from '../api/hooks';
import { EmptyArt } from '../components/Art';
import { ChartFrame } from '../components/charts/ChartFrame';
import { StatTile } from '../components/charts/StatTile';
import { VizTooltip } from '../components/charts/VizTooltip';
import { index01 } from '../components/charts/viz';
import { RiskBadge } from '../components/RiskBadge';
import { LoadError, Loading } from '../components/States';
import { Term } from '../components/Term';
import { formatDate, formatDecimal } from '../lib/format';

const PERIODS = [3, 6, 12];
/** Faixas do índice (status do sistema): o fundo do gráfico, com o nome escrito no eixo. */
const BANDS: [number, number, string, string][] = [
  [0, 0.2, 'var(--risk-1-bg)', 'Baixo'],
  [0.2, 0.4, 'var(--risk-2-bg)', 'Moderado'],
  [0.4, 0.6, 'var(--risk-3-bg)', 'Atenção'],
  [0.6, 0.8, 'var(--risk-4-bg)', 'Alto'],
  [0.8, 1, 'var(--risk-5-bg)', 'Crítico'],
];
const TREND: Record<string, string> = {
  MELHORANDO: 'melhorando',
  ESTAVEL: 'estável',
  PIORANDO: 'piorando',
};
/** "2026-10-30" → "30/10". */
const dayMonth = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const signed = (v: number) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatDecimal(String(Math.abs(v)), 2)}`;

/** Evolução do índice de risco (SPEC-09 §3), no padrão dos gráficos da /entenda. */
export function Evolution() {
  const [months, setMonths] = useState(12);
  const q = useHistory(months);
  const points = q.data?.points ?? [];
  const last = points[points.length - 1];
  const series = {
    id: 'ire',
    name: 'Índice de risco',
    points: points.map((p) => ({ date: p.date, value: p.ire })),
  };

  return (
    <div className="stack-lg reveal">
      <div className="stack-sm ctx-top">
        <header className="ctx-head">
          <div className="stack-xs">
            <p className="eyebrow">Sua trajetória</p>
            <h1>
              Evolução do seu <Term id="ire">índice de risco</Term> (IRE)
            </h1>
            <p className="muted">Cada ponto é um dia em que algo mudou no seu orçamento.</p>
          </div>
          <div className="ctx-filters">
            <div className="seg" role="group" aria-label="Período">
              {PERIODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={m === months}
                  onClick={() => setMonths(m)}
                >
                  {m} meses
                </button>
              ))}
            </div>
          </div>
        </header>
      </div>

      {q.isLoading && <Loading />}
      {q.isError && <LoadError error={q.error} />}
      {q.data && points.length === 0 && (
        <div className="empty">
          <div className="art">
            <EmptyArt kind="chart" />
          </div>
          <p>
            Ainda não há histórico. Ele começa a ser registrado quando você cadastra seus dados.
          </p>
        </div>
      )}
      {q.data && last && (
        <>
          <div className="kpi-row" aria-label="Manchetes da evolução">
            <StatTile
              label="Seu índice mais recente"
              series={series}
              format={index01}
              deltaFormat={signed}
              labelFormat={dayMonth}
              stableBelow={0.005}
              plain={() => 'Numa escala de 0 (sem risco) a 1'}
              unit="índice de 0 a 1"
            />
            <article className="card stat-tile">
              <span className="stat-label">Faixa atual</span>
              <span>
                <RiskBadge band={last.band} label={last.label} />
              </span>
              <span className="stat-plain">
                {q.data.trend === 'INSUFICIENTE'
                  ? 'Ainda sem tendência'
                  : `Seu risco está ${TREND[q.data.trend]}`}
              </span>
              <div className="stat-bottom">
                <span className="stat-foot">
                  {points.length} {points.length === 1 ? 'registro' : 'registros'} nos últimos{' '}
                  {months} meses
                </span>
              </div>
            </article>
          </div>

          <ChartFrame
            title="O seu índice ao longo do tempo"
            subtitle={
              <>
                As cores do fundo são as <Term id="faixa-risco">faixas de risco</Term>, com o nome
                escrito à esquerda.
              </>
            }
            insight={
              q.data.trend === 'INSUFICIENTE'
                ? 'Ainda não há dados suficientes para mostrar uma tendência.'
                : `Seu risco está ${TREND[q.data.trend]} nos últimos ${months} meses.`
            }
            sourceNote="Calculado pelo SAFE a cada mudança no seu orçamento."
            table={
              <table>
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Índice</th>
                    <th scope="col">Faixa</th>
                  </tr>
                </thead>
                <tbody>
                  {[...points].reverse().map((p) => (
                    <tr key={p.date}>
                      <td>{formatDate(p.date)}</td>
                      <td>{formatDecimal(p.ire)}</td>
                      <td>
                        <RiskBadge band={p.band} label={p.label} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <div className="chart-plot" style={{ minHeight: 300 }} aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <LineChart
                  data={points.map((p) => ({ date: p.date, ire: Number(p.ire) }))}
                  margin={{ top: 12, right: 48, bottom: 0, left: 0 }}
                >
                  {BANDS.map(([y1, y2, fill]) => (
                    <ReferenceArea key={y1} y1={y1} y2={y2} fill={fill} fillOpacity={0.7} />
                  ))}
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={dayMonth}
                    tick={{ fontSize: 12, fill: 'var(--muted)' }}
                    axisLine={{ stroke: 'var(--chart-grid)' }}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={[0, 1]}
                    ticks={[0.1, 0.3, 0.5, 0.7, 0.9]}
                    tickFormatter={(v: number) => BANDS.find(([a, b]) => v > a && v < b)?.[3] ?? ''}
                    width={72}
                    tick={{ fontSize: 12, fill: 'var(--muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
                    content={
                      <VizTooltip
                        names={{ ire: 'Índice de risco' }}
                        colors={{ ire: 'var(--series-1)' }}
                        format={index01}
                        labelFormat={formatDate}
                      />
                    }
                  />
                  <Line
                    dataKey="ire"
                    stroke="var(--series-1)"
                    strokeWidth={2}
                    dot={
                      points.length <= 14
                        ? { r: 4, strokeWidth: 2, stroke: 'var(--surface)' }
                        : false
                    }
                    activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                  <ReferenceDot
                    x={last.date}
                    y={Number(last.ire)}
                    r={4}
                    fill="var(--series-1)"
                    stroke="var(--surface)"
                    strokeWidth={2}
                    ifOverflow="visible"
                    label={{
                      value: index01(Number(last.ire)),
                      position: 'right',
                      offset: 8,
                      fontSize: 12,
                      fontWeight: 650,
                      fill: 'var(--text)',
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>
        </>
      )}
    </div>
  );
}
