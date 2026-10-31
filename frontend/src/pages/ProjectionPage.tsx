import { CircleAlert } from 'lucide-react';
import { useProjection } from '../api/hooks';
import { EmptyArt } from '../components/Art';
import { ProjectionChart } from '../components/FreeFlowChart';
import { PageHeader } from '../components/PageHeader';
import { LoadError, Loading } from '../components/States';
import { Term } from '../components/Term';
import { formatMoney } from '../lib/format';

/** Projeção dos próximos meses (SPEC-06 §4). */
export function ProjectionPage() {
  const q = useProjection();
  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <LoadError error={q.error} />;
  const p = q.data;
  const frees = p.points.map((x) => Number(x.free));
  const min = Math.min(...frees);
  const max = Math.max(...frees);
  const firstNegative = p.firstNonPositiveFreeMonth
    ? p.points[p.firstNonPositiveFreeMonth - 1]
    : null;
  const firstBalance = p.firstNegativeBalanceMonth
    ? p.points[p.firstNegativeBalanceMonth - 1]
    : null;

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
      <section className="card stack">
        <p style={{ margin: 0, fontSize: '1.15rem' }}>
          Nos próximos {p.horizon} meses, sua sobra mensal fica entre{' '}
          <strong>{formatMoney(String(min))}</strong> e <strong>{formatMoney(String(max))}</strong>.
        </p>
        {firstNegative && (
          <p className="alert risk-4" style={{ margin: 0 }}>
            <CircleAlert size={20} aria-hidden="true" />
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>
              Em {firstNegative.label} sua sobra fica negativa ou zerada.
            </span>
          </p>
        )}
        {firstBalance && (
          <p className="alert risk-5" style={{ margin: 0 }}>
            <CircleAlert size={20} aria-hidden="true" />
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>
              Em {firstBalance.label} o dinheiro guardado acabaria, se tudo continuar igual.
            </span>
          </p>
        )}
        <ProjectionChart points={p.points} />
        <p className="small muted" style={{ margin: 0 }}>
          <strong>Sobra do mês:</strong> o que fica depois das despesas e parcelas.{' '}
          <strong>Saldo acumulado:</strong> sua <Term id="reserva">reserva</Term> mais as sobras
          somadas mês a mês.
        </p>
        <details className="more">
          <summary id="tbl">Ver mês a mês</summary>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Mês</th>
                  <th scope="col">Sobra do mês</th>
                  <th scope="col">Saldo acumulado</th>
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
                        {formatMoney(x.free)} {bad && '(sem sobra)'}
                      </td>
                      <td>{formatMoney(x.balance)}</td>
                      <td>{x.debtsActive}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      {p.assumptions && (
        <section className="notice small">
          <strong>Premissas:</strong> {p.assumptions.join('; ')}.
        </section>
      )}
    </div>
  );
}
