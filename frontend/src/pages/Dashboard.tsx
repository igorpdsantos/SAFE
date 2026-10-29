import { CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAnalysis, useBudgetList, useMarkAlertRead } from '../api/hooks';
import type { IndicatorKey } from '../api/types';
import { AlertBanner } from '../components/AlertBanner';
import { FactorList } from '../components/FactorList';
import { useHelp } from '../components/HelpPanel';
import { IndicatorCard } from '../components/IndicatorCard';
import { IreGauge } from '../components/IreGauge';
import { Onboarding } from '../components/Onboarding';
import { RiskBadge } from '../components/RiskBadge';
import { LoadError, Loading } from '../components/States';
import { Term } from '../components/Term';
import { formatDecimal, formatMoney } from '../lib/format';

const ORDER: IndicatorKey[] = ['cr', 'cp', 'lf', 'ne'];

/** Checklist quando ainda falta a renda (SPEC-07 §5, estado sem dados). */
function EmptyChecklist() {
  const incomes = useBudgetList('incomes');
  const expenses = useBudgetList('expenses');
  const debts = useBudgetList('debts');
  const reserves = useBudgetList('reserves');
  const steps = [
    {
      kind: 'incomes',
      label: 'Cadastre sua renda',
      why: 'Quanto você recebe por mês. Sem ela não há cálculo.',
      done: !!incomes.data?.length,
    },
    {
      kind: 'expenses',
      label: 'Cadastre suas despesas',
      why: 'Aluguel, mercado, contas: o que sai todo mês.',
      done: !!expenses.data?.length,
    },
    {
      kind: 'debts',
      label: 'Cadastre suas dívidas',
      why: 'Parcelas que você já paga. Se não tem, pode pular.',
      done: !!debts.data?.length,
    },
    {
      kind: 'reserves',
      label: 'Cadastre sua reserva',
      why: 'Dinheiro guardado para emergências. Pode ser zero.',
      done: !!reserves.data?.length,
    },
  ];
  return (
    <section className="card stack" aria-labelledby="start-title">
      <h2 id="start-title">Vamos começar</h2>
      <p>
        Para calcular seu <Term id="ire">índice de risco</Term> (IRE), precisamos conhecer seu
        orçamento.
      </p>
      <ol className="list">
        {steps.map((s) => (
          <li key={s.kind}>
            <div>
              <strong>
                {s.done && (
                  <CircleCheck
                    size={16}
                    aria-hidden="true"
                    style={{ color: 'var(--risk-1)', verticalAlign: -3 }}
                  />
                )}{' '}
                {s.label}
              </strong>
              <p className="small muted" style={{ margin: 0 }}>
                {s.done ? 'Feito. ' : ''}
                {s.why}
              </p>
            </div>
            <Link className="btn" to={`/orcamento?aba=${s.kind}`}>
              {s.done ? 'Ver' : 'Cadastrar'}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Dashboard() {
  const analysis = useAnalysis();
  const markRead = useMarkAlertRead();
  const help = useHelp();
  const [onboarding, setOnboarding] = useState(false);

  const header = (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <h1 style={{ margin: 0 }}>Seu orçamento hoje</h1>
      <button type="button" className="btn btn-link" onClick={() => setOnboarding(true)}>
        Como funciona
      </button>
    </div>
  );

  if (analysis.isLoading) return <Loading />;
  const noIncome =
    analysis.error instanceof ApiError && analysis.error.code === 'INSUFFICIENT_DATA';
  if (noIncome) {
    return (
      <div className="stack">
        {header}
        <Onboarding forceOpen={onboarding} onClose={() => setOnboarding(false)} />
        <EmptyChecklist />
      </div>
    );
  }
  if (analysis.isError || !analysis.data) return <LoadError error={analysis.error} />;
  const a = analysis.data;
  const top = a.alerts[0];

  return (
    <div className="stack">
      {header}
      <Onboarding forceOpen={onboarding} onClose={() => setOnboarding(false)} />
      <div aria-live="polite">
        {top && (
          <AlertBanner
            alert={top}
            busy={markRead.isPending}
            onRead={() => markRead.mutate(top.id)}
          />
        )}
      </div>

      <section className="card stack" aria-labelledby="ire-title">
        <h2 id="ire-title">
          Seu <Term id="ire">índice de risco</Term> (IRE)
        </h2>
        <div className="row" style={{ alignItems: 'baseline' }}>
          <span className="big">{formatDecimal(a.ire.value)}</span>
          <span className="muted">de 1</span>
          <RiskBadge band={a.ire.band} label={a.ire.label} />
        </div>
        <IreGauge value={a.ire.value} label={a.ire.label} />
        <p style={{ margin: 0 }}>
          <strong>O que fazer:</strong> {a.ire.recommendation}
        </p>
        <div>
          <button type="button" className="btn btn-link" onClick={() => help.open('faixa-risco')}>
            O que isso significa?
          </button>
        </div>
      </section>

      <section aria-labelledby="ind-title" className="stack">
        <h2 id="ind-title">Os 4 sinais que formam seu índice</h2>
        <div className="grid">
          {ORDER.map((k) => (
            <IndicatorCard key={k} indicatorKey={k} view={a.indicators[k]} />
          ))}
        </div>
      </section>

      <section className="card stack" aria-labelledby="why-title">
        <h2 id="why-title">Por que meu risco é este?</h2>
        {a.factors ? (
          <>
            <p className="small muted" style={{ margin: 0 }}>
              Quanto cada sinal pesa no seu índice. Os principais explicam pelo menos 75% do
              resultado.
            </p>
            <FactorList factors={a.factors} />
          </>
        ) : (
          <p style={{ margin: 0 }}>Não há fatores de risco no momento.</p>
        )}
      </section>

      <section className="card stack" aria-labelledby="totals-title">
        <h2 id="totals-title">Seus números</h2>
        <div className="grid">
          <div>
            <div className="small muted">
              <Term id="renda-liquida">Renda líquida</Term>
            </div>
            <strong>{formatMoney(a.totals.income)}</strong>
          </div>
          <div>
            <div className="small muted">Despesas do mês</div>
            <strong>{formatMoney(a.totals.expenses)}</strong>
          </div>
          <div>
            <div className="small muted">
              <Term id="parcela">Parcelas</Term> do mês
            </div>
            <strong>{formatMoney(a.totals.installments)}</strong>
          </div>
          <div>
            <div className="small muted">Renda depois das parcelas</div>
            <strong>{formatMoney(a.residualIncome)}</strong>
          </div>
        </div>
        <div className="row">
          <Link className="btn" to="/orcamento">
            Editar orçamento
          </Link>
          <Link className="btn btn-primary" to="/simular">
            Simular uma compra
          </Link>
        </div>
      </section>
    </div>
  );
}
