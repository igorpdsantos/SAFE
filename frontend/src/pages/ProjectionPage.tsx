import { CircleAlert } from 'lucide-react';
import { useProjection } from '../api/hooks';
import { EmptyArt } from '../components/Art';
import { ColumnChartCard } from '../components/charts/ColumnChartCard';
import { LineChartCard } from '../components/charts/LineChartCard';
import { StatTile } from '../components/charts/StatTile';
import { money, moneyAxis, moneyDelta, type VizSeries } from '../components/charts/viz';
import { PageHeader } from '../components/PageHeader';
import { LoadError, Loading } from '../components/States';
import { Term } from '../components/Term';

/** "nov/2026" → "nov/26" (eixo). */
const shortLabel = (label: string) => label.replace(/\/20(\d\d)$/, '/$1');
const same = (label: string) => label;
const SOURCE = 'Calculado pelo SAFE com o seu orçamento de hoje.';

/** Projeção dos próximos meses (SPEC-06 §4): sobra e dinheiro guardado em gráficos separados. */
export function ProjectionPage() {
  const q = useProjection();
  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <LoadError error={q.error} />;
  const p = q.data;
  const first = p.points[0];
  const last = p.points[p.points.length - 1];
  if (!first || !last) return <LoadError error={q.error} />;

  const free: VizSeries = {
    id: 'free',
    name: 'Sobra do mês',
    points: p.points.map((x) => ({ date: x.label, value: x.free })),
  };
  const balance: VizSeries = {
    id: 'balance',
    name: 'Dinheiro guardado',
    points: p.points.map((x) => ({ date: x.label, value: x.balance })),
  };
  const lowest = p.points.reduce((a, b) => (Number(b.free) < Number(a.free) ? b : a));
  const firstNegative = p.firstNonPositiveFreeMonth
    ? p.points[p.firstNonPositiveFreeMonth - 1]
    : null;
  const firstBalance = p.firstNegativeBalanceMonth
    ? p.points[p.firstNegativeBalanceMonth - 1]
    : null;
  // Primeiro mês em que a sobra muda (normalmente porque uma dívida terminou).
  const change = p.points.find((x) => x.free !== first.free);
  const freeInsight = (
    <>
      Em {first.label}, sobram {money(Number(first.free))} depois das contas e parcelas.
      {change && (
        <>
          {' '}
          A partir de {change.label}, a sobra passa a {money(Number(change.free))}
          {change.debtsActive < first.debtsActive ? ', porque uma dívida termina' : ''}.
        </>
      )}
    </>
  );
  const balanceInsight = (
    <>
      Se tudo continuar igual, em {last.label} você teria {money(Number(last.balance))} guardados:
      sua reserva de hoje mais as sobras de cada mês.
    </>
  );

  return (
    <div className="stack-lg reveal">
      <PageHeader
        eyebrow="Os próximos meses"
        title={
          <>
            <Term id="projecao">Projeção</Term> dos próximos {p.horizon} meses
          </>
        }
        lead="Como fica o seu dinheiro se tudo continuar como está hoje."
        art={<EmptyArt kind="chart" />}
      />

      <div className="kpi-row" aria-label="Manchetes da projeção">
        <StatTile
          label="Sobra no próximo mês"
          series={{ ...free, points: free.points.slice(0, 1) }}
          format={money}
          labelFormat={same}
          plain={() => 'Depois das despesas e parcelas'}
          unit="por mês"
        />
        <StatTile
          label="Menor sobra do período"
          series={{ ...free, points: [{ date: lowest.label, value: lowest.free }] }}
          format={money}
          labelFormat={same}
          plain={() => (Number(lowest.free) <= 0 ? 'Mês sem sobra' : 'O mês mais apertado')}
          unit="por mês"
        />
        <StatTile
          label="Dinheiro guardado no fim"
          series={balance}
          format={money}
          deltaFormat={moneyDelta}
          labelFormat={same}
          stableBelow={0.5}
          plain={() => 'Reserva de hoje mais as sobras'}
          unit="acumulado"
        />
      </div>

      {(firstNegative || firstBalance) && (
        <div className="stack-sm">
          {firstNegative && (
            <p className="alert risk-4">
              <CircleAlert size={20} aria-hidden="true" />
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                Em {firstNegative.label} sua sobra fica negativa ou zerada.
              </span>
            </p>
          )}
          {firstBalance && (
            <p className="alert risk-5">
              <CircleAlert size={20} aria-hidden="true" />
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                Em {firstBalance.label} o dinheiro guardado acabaria, se tudo continuar igual.
              </span>
            </p>
          )}
        </div>
      )}

      <div className="chart-grid">
        <ColumnChartCard
          title="Quanto sobra em cada mês"
          subtitle="O que fica da renda depois das despesas e das parcelas."
          series={free}
          format={money}
          tickFormat={moneyAxis}
          xLabel={shortLabel}
          insight={freeInsight}
          sourceNote={SOURCE}
          table={
            <table>
              <thead>
                <tr>
                  <th scope="col">Mês</th>
                  <th scope="col">Sobra do mês</th>
                  <th scope="col">Dinheiro guardado</th>
                  <th scope="col">Dívidas ativas</th>
                </tr>
              </thead>
              <tbody>
                {p.points.map((x) => {
                  const bad = Number(x.free) <= 0;
                  return (
                    <tr key={x.month}>
                      <td>{x.label}</td>
                      <td
                        style={{
                          color: bad ? 'var(--danger)' : undefined,
                          fontWeight: bad ? 700 : 400,
                        }}
                      >
                        {money(Number(x.free))} {bad && '(sem sobra)'}
                      </td>
                      <td>{money(Number(x.balance))}</td>
                      <td>{x.debtsActive}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          }
        />
        <LineChartCard
          title="Quanto você teria guardado"
          subtitle={
            <>
              Sua <Term id="reserva">reserva</Term> de hoje mais as sobras somadas mês a mês.
            </>
          }
          series={[balance]}
          format={money}
          tickFormat={moneyAxis}
          xLabel={shortLabel}
          labelFormat={same}
          insight={balanceInsight}
          sourceNote={SOURCE}
          showTable={false}
        />
      </div>

      {p.assumptions && (
        <p className="ctx-note">
          <CircleAlert size={16} aria-hidden="true" />
          <span>
            <strong>Premissas:</strong> consideramos que sua renda e suas despesas continuam iguais
            todos os meses e que cada dívida deixa de contar assim que termina a última parcela
            informada ({p.assumptions.join('; ').toLowerCase()}).
          </span>
        </p>
      )}
    </div>
  );
}
