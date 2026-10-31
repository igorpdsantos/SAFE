import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useHistory } from '../api/hooks';
import { EmptyArt } from '../components/Art';
import { PageHeader } from '../components/PageHeader';
import { RiskBadge } from '../components/RiskBadge';
import { LoadError, Loading } from '../components/States';
import { Term } from '../components/Term';
import { formatDate, formatDecimal } from '../lib/format';

const PERIODS = [3, 6, 12];
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

/** Evolução do índice de risco (SPEC-09 §3). */
export function Evolution() {
  const [months, setMonths] = useState(12);
  const q = useHistory(months);

  return (
    <div className="stack-lg reveal">
      <PageHeader
        eyebrow="Sua trajetória"
        title={
          <>
            Evolução do seu <Term id="ire">índice de risco</Term> (IRE)
          </>
        }
        lead="Cada ponto é um dia em que algo mudou no seu orçamento."
      />
      <div
        className="tabs"
        role="group"
        aria-label="Período"
        style={{ maxWidth: 420, gridTemplateColumns: 'repeat(3, 1fr)' }}
      >
        {PERIODS.map((m) => (
          <button
            key={m}
            type="button"
            className="tab"
            aria-pressed={m === months}
            onClick={() => setMonths(m)}
          >
            {m} meses
          </button>
        ))}
      </div>
      {q.isLoading && <Loading />}
      {q.isError && <LoadError error={q.error} />}
      {q.data && q.data.points.length === 0 && (
        <div className="empty">
          <div className="art">
            <EmptyArt kind="chart" />
          </div>
          <p>
            Ainda não há histórico. Ele começa a ser registrado quando você cadastra seus dados.
          </p>
        </div>
      )}
      {q.data && q.data.points.length > 0 && (
        <>
          <section className="card stack">
            <p style={{ margin: 0, fontSize: '1.15rem' }}>
              {q.data.trend === 'INSUFICIENTE'
                ? 'Ainda não há dados suficientes para mostrar uma tendência.'
                : `Seu risco está ${TREND[q.data.trend]} nos últimos ${months} meses.`}
            </p>
            <p className="small muted" style={{ margin: 0 }}>
              A linha mostra seu índice em cada dia em que algo mudou. As faixas coloridas do fundo
              são as <Term id="faixa-risco">faixas de risco</Term>, com o nome escrito à esquerda.
            </p>
            <div style={{ width: '100%', height: 300 }} aria-hidden="true">
              <ResponsiveContainer>
                <LineChart
                  data={q.data.points.map((p) => ({
                    date: formatDate(p.date),
                    ire: Number(p.ire),
                    label: p.label,
                  }))}
                  margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
                >
                  {BANDS.map(([y1, y2, fill]) => (
                    <ReferenceArea key={y1} y1={y1} y2={y2} fill={fill} fillOpacity={1} />
                  ))}
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                  <YAxis
                    domain={[0, 1]}
                    ticks={[0.1, 0.3, 0.5, 0.7, 0.9]}
                    tickFormatter={(v: number) => BANDS.find(([a, b]) => v > a && v < b)?.[3] ?? ''}
                    width={80}
                    tick={{ fontSize: 12, fill: 'var(--muted)' }}
                  />
                  <Tooltip
                    formatter={(v, _n, item) => [
                      `${formatDecimal(String(v))} · ${item.payload.label}`,
                      'Índice',
                    ]}
                  />
                  <Line dataKey="ire" stroke="var(--brand)" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <details className="more">
              <summary>Ver todos os registros</summary>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Data</th>
                      <th scope="col">Índice</th>
                      <th scope="col">Faixa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.points.map((p) => (
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
              </div>
            </details>
          </section>
        </>
      )}
    </div>
  );
}
