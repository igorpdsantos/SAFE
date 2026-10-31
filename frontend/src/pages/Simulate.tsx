import { ArrowRight, Siren } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useRegisterSimulation, useSimulate } from '../api/hooks';
import type { Simulation, SimulationFactor } from '../api/types';
import { FieldHelp } from '../components/FieldHelp';
import { ScaleArt } from '../components/Art';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CompareChart } from '../components/FreeFlowChart';
import { MoneyInput } from '../components/MoneyInput';
import { PageHeader } from '../components/PageHeader';
import { RiskBadge } from '../components/RiskBadge';
import { LoadError } from '../components/States';
import { Term } from '../components/Term';
import type { GlossaryId } from '../content/glossary';
import { formatDecimal, formatMoney, formatPercent } from '../lib/format';

const FACTOR_TERM: Record<SimulationFactor['key'], GlossaryId> = {
  cr: 'comprometimento-renda',
  cp: 'capacidade-pagamento',
  lf: 'liquidez',
  ne: 'nivel-endividamento',
};

/** Parcela sem juros: V/n arredondado para cima no centavo (SPEC-08 §4). */
function noInterestInstallment(value: string, n: string): string {
  const cents = Math.round(Number(value) * 100);
  const count = Number(n);
  if (!cents || !count) return '';
  const each = Math.ceil(cents / count);
  return `${Math.floor(each / 100)}.${String(each % 100).padStart(2, '0')}`;
}

function OutcomeBanner({ sim }: { sim: Simulation }) {
  if (sim.outcome === 'CRITICO') {
    const belowMinimum = sim.explanation.includes('valor mínimo de referência');
    return (
      <div className="alert risk-5" role="alert">
        <Siren size={22} aria-hidden="true" />
        <p style={{ margin: 0, color: 'var(--text)' }}>
          <strong>Atenção:</strong>{' '}
          {belowMinimum ? (
            <>
              com esta compra, a renda que sobra depois das parcelas fica abaixo do{' '}
              <Term id="minimo-existencial">mínimo existencial</Term> usado como referência.
            </>
          ) : (
            'com esta compra, sua renda não cobre suas despesas e parcelas.'
          )}
        </p>
      </div>
    );
  }
  if (sim.outcome === 'AGRAVAMENTO') {
    return (
      <div className={`alert risk-${sim.projected.ire.band}`} role="status">
        <RiskBadge band={sim.projected.ire.band} label="Esta compra aumenta o seu risco" />
      </div>
    );
  }
  return (
    <div className="notice" role="status">
      Esta compra não muda significativamente o seu risco. Segundo os critérios do SAFE, seu
      orçamento comporta esta decisão. Isso não é uma recomendação para contratar: a decisão é sua.
    </div>
  );
}

function Result({ sim }: { sim: Simulation }) {
  const delta = Number(sim.deltaIre);
  return (
    <div className="stack" aria-live="polite" id="resultado">
      <OutcomeBanner sim={sim} />

      <section className="hero stack" aria-labelledby="b1">
        <h2 id="b1" className="eyebrow" style={{ color: 'var(--mint)' }}>
          Seu risco hoje e com esta compra
        </h2>
        <div className="compare">
          <div className="compare-side">
            <span className="small muted">Hoje</span>
            <span className="big">{formatDecimal(sim.current.ire.value)}</span>
            <RiskBadge band={sim.current.ire.band} label={sim.current.ire.label} />
          </div>
          <span className="compare-arrow" aria-hidden="true">
            <ArrowRight size={22} />
          </span>
          <div className="compare-side">
            <span className="small muted">Com esta compra</span>
            <span className="big">{formatDecimal(sim.projected.ire.value)}</span>
            <RiskBadge band={sim.projected.ire.band} label={sim.projected.ire.label} />
          </div>
        </div>
        <p className="small" style={{ margin: 0 }}>
          Variação do <Term id="ire">índice de risco</Term> (IRE):{' '}
          <span className="delta">+{formatDecimal(sim.deltaIre, 2)}</span> numa escala de 0 a 1.
        </p>
      </section>

      <section className="card stack" aria-labelledby="b3">
        <h2 id="b3" style={{ margin: 0 }}>
          O que muda, em palavras
        </h2>
        <p style={{ fontSize: '1.12rem', margin: 0 }}>{sim.explanation}</p>
        <div className="grid-2" style={{ gap: '0.75rem' }}>
          <div className="notice">
            {Number(sim.financialCost) > 0 ? (
              <>
                <Term id="custo-financeiro">Custo a mais do parcelamento</Term>: você pagará{' '}
                <strong>{formatMoney(sim.financialCost)}</strong> a mais que o valor da compra.
              </>
            ) : (
              'As parcelas somam o valor da compra: não há custo a mais.'
            )}
          </div>
          <div className="notice">
            Depois das parcelas, sobram <strong>{formatMoney(sim.residualIncomeAfter)}</strong> da
            sua renda por mês.
          </div>
        </div>
        {delta === 0 && <p style={{ margin: 0 }}>Esta decisão não altera o índice.</p>}
        {sim.factors.some((f) => f.isMain) && (
          <div className="stack" style={{ gap: 0 }}>
            <h3 style={{ margin: '0 0 0.6rem' }}>O que mais pesou</h3>
            <ul className="factor-bars">
              {sim.factors
                .filter((f) => f.isMain)
                .map((f) => (
                  <li key={f.key}>
                    <div className="row">
                      <span style={{ fontWeight: 650 }}>
                        <Term id={FACTOR_TERM[f.key]}>{f.name}</Term>
                      </span>
                      <span>
                        {f.before} → {f.after}
                        {f.share !== null && (
                          <span className="muted"> · {formatPercent(f.share)} do aumento</span>
                        )}
                      </span>
                    </div>
                    <div className="bar" aria-hidden="true" style={{ marginTop: 6 }}>
                      <span style={{ width: `${Number(f.share ?? 0) * 100}%` }} />
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <details className="more">
          <summary id="b2">Ver todos os sinais, antes e depois</summary>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Sinal</th>
                  <th scope="col">Antes</th>
                  <th scope="col">Depois</th>
                  <th scope="col">Pontos no índice</th>
                  <th scope="col">Participação no aumento</th>
                </tr>
              </thead>
              <tbody>
                {sim.factors.map((f) => (
                  <tr key={f.key} style={{ fontWeight: f.isMain ? 700 : 400 }}>
                    <th scope="row" style={{ color: 'var(--text)', fontSize: '1rem' }}>
                      <Term id={FACTOR_TERM[f.key]}>{f.name}</Term>{' '}
                      {f.isMain && <span className="badge">principal</span>}
                    </th>
                    <td>{f.before}</td>
                    <td>{f.after}</td>
                    <td>{f.unchanged ? '—' : `+${formatDecimal(f.points, 3)}`}</td>
                    <td>
                      {f.saturatedBoth ? (
                        <span className="badge">
                          <Term id="no-limite-escala">no limite da escala</Term>
                        </span>
                      ) : f.unchanged ? (
                        <span className="muted">não alterado por esta decisão</span>
                      ) : f.share !== null ? (
                        formatPercent(f.share)
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <details className="more">
          <summary id="b4">
            Ver a sobra do mês nos próximos meses (<Term id="projecao">projeção</Term>)
          </summary>
          <CompareChart
            without={sim.projection.without.points}
            withPurchase={sim.projection.with.points}
          />
          <details className="more">
            <summary>Ver a tabela com os valores</summary>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Mês</th>
                    <th scope="col">Sem a compra</th>
                    <th scope="col">Com a compra</th>
                  </tr>
                </thead>
                <tbody>
                  {sim.projection.with.points.map((p, i) => {
                    const negative = Number(p.free) <= 0;
                    return (
                      <tr key={p.month}>
                        <td>{p.label}</td>
                        <td>{formatMoney(sim.projection.without.points[i]?.free ?? null)}</td>
                        <td style={{ color: negative ? 'var(--danger)' : undefined }}>
                          {formatMoney(p.free)} {negative && '(sem sobra)'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </details>
      </section>
      <p className="small muted">Simulação: nada foi salvo no seu orçamento. A decisão é sua.</p>
    </div>
  );
}

interface SimulationInput {
  value: string;
  installments: number;
  installmentValue: string;
}

/** D-12: depois de fazer a compra de verdade, a pessoa pode levá-la para o orçamento. */
function RegisterDebt({ sim, input }: { sim: Simulation; input: SimulationInput }) {
  const [asking, setAsking] = useState(false);
  const register = useRegisterSimulation();

  if (register.isSuccess)
    return (
      <p className="notice" role="status">
        Pronto: a dívida de {formatMoney(input.installmentValue)} por mês, em {input.installments}{' '}
        parcelas, entrou no seu orçamento e o seu índice foi recalculado.{' '}
        <Link to="/orcamento?aba=debts">Ver ou editar em Dívidas</Link>
      </p>
    );

  return (
    <section className="card stack" aria-labelledby="register-title">
      <h2 id="register-title">Já fez esta compra?</h2>
      <p className="small" style={{ margin: 0 }}>
        Se você fechou a compra, pode registrá-la como dívida no seu orçamento. Assim o seu índice
        de risco passa a contar com ela.
      </p>
      {register.isError && <LoadError error={register.error} />}
      <div>
        <button type="button" className="btn" onClick={() => setAsking(true)}>
          Registrar como dívida
        </button>
      </div>
      {asking && (
        <ConfirmDialog
          title="Registrar esta compra como dívida?"
          confirmLabel={register.isPending ? 'Registrando…' : 'Registrar dívida'}
          confirmDisabled={register.isPending}
          onCancel={() => setAsking(false)}
          onConfirm={() => register.mutate(sim.id, { onSettled: () => setAsking(false) })}
        >
          <p style={{ margin: 0 }}>
            Vamos adicionar ao seu orçamento uma dívida de {formatMoney(input.installmentValue)} por
            mês, em {input.installments} parcelas, na categoria crediário. Você pode editar ou
            excluir depois em Orçamento, na aba Dívidas.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}

/** "E se eu comprar?" (SPEC-08 §4). */
export function Simulate() {
  const [value, setValue] = useState('');
  const [installments, setInstallments] = useState('');
  const [installmentValue, setInstallmentValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<unknown>(null);
  const simulate = useSimulate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneral(null);
    try {
      await simulate.mutateAsync({
        value,
        installments: Number(installments || 0),
        installmentValue,
      });
      // No celular o resultado fica embaixo do formulário: leva a pessoa até ele.
      if (window.matchMedia?.('(max-width: 980px)').matches) {
        requestAnimationFrame(() =>
          document.getElementById('resultado')?.scrollIntoView({ block: 'start' }),
        );
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setErrors(
          err.code === 'INCONSISTENT_SIMULATION' ? { installmentValue: err.message } : err.fields,
        );
      } else setGeneral(err);
    }
  };

  return (
    <div className="reveal">
      <PageHeader
        eyebrow="E se eu comprar?"
        title={
          <>
            Simular uma compra (<Term id="simulacao">simulação</Term>)
          </>
        }
        lead="Antes de comprar parcelado ou pegar um empréstimo, veja o que acontece com o seu risco. Nada muda nos seus dados."
      />

      <div className="sim-layout">
        <form className="card stack" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="sim-value">Valor da compra à vista</label>
            <FieldHelp
              id="sim-value-help"
              what="O preço da compra ou o valor do empréstimo."
              why="Comparamos com o total das parcelas para mostrar o custo a mais."
            />
            <MoneyInput
              id="sim-value"
              aria-describedby="sim-value-help"
              aria-invalid={!!errors.value}
              placeholder="Ex.: 1.200,00"
              value={value}
              onChange={setValue}
            />
            {errors.value && <span className="field-error">{errors.value}</span>}
          </div>
          <div className="field">
            <label htmlFor="sim-n">Número de parcelas</label>
            <FieldHelp
              id="sim-n-help"
              what="Em quantas vezes você vai pagar."
              why="Mostra por quanto tempo a parcela vai pesar no seu orçamento."
            />
            <input
              id="sim-n"
              className="input"
              inputMode="numeric"
              autoComplete="off"
              aria-describedby="sim-n-help"
              aria-invalid={!!errors.installments}
              placeholder="Ex.: 12"
              value={installments}
              onChange={(e) => setInstallments(e.target.value.replace(/\D/g, '').slice(0, 3))}
            />
            {errors.installments && <span className="field-error">{errors.installments}</span>}
          </div>
          <div className="field">
            <label htmlFor="sim-p">
              Valor de cada <Term id="parcela">parcela</Term>
            </label>
            <FieldHelp
              id="sim-p-help"
              what="Quanto você vai pagar por mês, com os juros incluídos."
              why="É o valor que entra no seu orçamento todo mês."
            />
            <MoneyInput
              id="sim-p"
              aria-describedby="sim-p-help"
              aria-invalid={!!errors.installmentValue}
              placeholder="Ex.: 100,00"
              value={installmentValue}
              onChange={setInstallmentValue}
            />
            {errors.installmentValue && (
              <span className="field-error">{errors.installmentValue}</span>
            )}
            <div>
              <button
                type="button"
                className="btn btn-link"
                onClick={() => setInstallmentValue(noInterestInstallment(value, installments))}
                disabled={!value || !installments}
              >
                Calcular parcela sem juros
              </button>
            </div>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            A simulação considera que a compra não usa sua reserva e não muda suas despesas. O risco
            com a compra considera o mês em que todas as parcelas estão ativas ao mesmo tempo.
          </p>
          <div className="row">
            <button type="submit" className="btn btn-primary btn-lg" disabled={simulate.isPending}>
              {simulate.isPending ? 'Simulando…' : 'Simular compra'}
            </button>
            {simulate.data && (
              <button
                type="button"
                className="btn"
                onClick={() => document.getElementById('sim-value')?.focus()}
              >
                Simular outros valores
              </button>
            )}
          </div>
        </form>

        <div className="stack">
          {general !== null && <LoadError error={general} />}
          {simulate.data ? (
            <Result sim={simulate.data} />
          ) : (
            general === null && (
              <div className="empty-sim">
                <div className="art">
                  <ScaleArt />
                </div>
                <div>
                  <h2 style={{ marginBottom: '0.35rem' }}>O resultado aparece aqui</h2>
                  <p className="muted" style={{ margin: 0, maxWidth: '38ch' }}>
                    Preencha os três campos e toque em "Simular compra". Você vê seu risco hoje e
                    com a compra, lado a lado.
                  </p>
                </div>
              </div>
            )
          )}
          {simulate.data && simulate.variables && (
            <RegisterDebt key={simulate.data.id} sim={simulate.data} input={simulate.variables} />
          )}
        </div>
      </div>
    </div>
  );
}
