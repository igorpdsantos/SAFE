import { ArrowRight, Calculator, Check, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAnalysis, useBudgetList, useMarkAlertRead } from '../api/hooks';
import type { BudgetKind, IndicatorKey, VariableScenario } from '../api/types';
import { AlertBanner } from '../components/AlertBanner';
import { FactorList } from '../components/FactorList';
import { useHelp } from '../components/HelpPanel';
import { IndicatorCard } from '../components/IndicatorCard';
import { IreGauge } from '../components/IreGauge';
import { Onboarding } from '../components/Onboarding';
import { PageHeader } from '../components/PageHeader';
import { RiskBadge } from '../components/RiskBadge';
import { LoadError, Loading } from '../components/States';
import { Term } from '../components/Term';
import { formatDecimal, formatMoney } from '../lib/format';

const ORDER: IndicatorKey[] = ['cr', 'cp', 'lf', 'ne'];

const SCENARIOS: { key: VariableScenario; label: string }[] = [
  { key: 'worst', label: 'Pior cenário' },
  { key: 'average', label: 'Cenário médio' },
  { key: 'best', label: 'Melhor cenário' },
];

const SCENARIO_NOTE: Record<VariableScenario, string> = {
  worst: 'Considera o maior valor de cada despesa variável.',
  average: 'Considera a média entre o menor e o maior valor de cada despesa variável.',
  best: 'Considera o menor valor de cada despesa variável.',
};

/** Checklist quando ainda falta a renda (SPEC-07 §5): um passo de cada vez, só o próximo em destaque. */
function EmptyChecklist() {
  const incomes = useBudgetList('incomes');
  const expenses = useBudgetList('expenses');
  const debts = useBudgetList('debts');
  const reserves = useBudgetList('reserves');
  const steps: { kind: BudgetKind; label: string; why: string; done: boolean }[] = [
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
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  return (
    <section className="card stack" aria-labelledby="start-title">
      <div className="stack-sm">
        <div className="row spread">
          <h2 id="start-title">Vamos começar</h2>
          <span className="small muted">
            {doneCount} de {steps.length} feitos
          </span>
        </div>
        <div className="progress" aria-hidden="true">
          <span style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
      </div>
      <p>
        Para calcular seu <Term id="ire">índice de risco</Term> (IRE), precisamos conhecer seu
        orçamento. Leva poucos minutos.
      </p>
      <ol className="steps">
        {steps.map((s, i) => {
          const isNext = s === next;
          return (
            <li
              key={s.kind}
              className={`step${s.done ? ' is-done' : ''}${isNext ? ' is-next' : ''}`}
            >
              <span className="step-num" aria-hidden="true">
                {s.done ? <Check size={18} /> : i + 1}
              </span>
              <div className="step-body">
                <strong>{s.label}</strong>
                <p className="small muted">
                  {s.done ? 'Feito. ' : ''}
                  {s.why}
                </p>
              </div>
              <Link
                className={isNext ? 'btn btn-primary' : 'btn'}
                to={`/orcamento?aba=${s.kind}`}
                aria-label={`${s.done ? 'Ver' : 'Cadastrar'}: ${s.label.replace('Cadastre ', '')}`}
              >
                {s.done ? 'Ver' : 'Cadastrar'}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function Dashboard() {
  const analysis = useAnalysis();
  const markRead = useMarkAlertRead();
  const help = useHelp();
  const [onboarding, setOnboarding] = useState(false);
  const [scenario, setScenario] = useState<VariableScenario>('worst');

  const header = (
    <PageHeader eyebrow="Painel" title="Seu orçamento hoje">
      <button type="button" className="btn btn-link flush" onClick={() => setOnboarding(true)}>
        Como funciona
      </button>
    </PageHeader>
  );

  if (analysis.isLoading) return <Loading />;
  const noIncome =
    analysis.error instanceof ApiError && analysis.error.code === 'INSUFFICIENT_DATA';
  if (noIncome) {
    return (
      <div className="stack-lg reveal">
        {header}
        <Onboarding forceOpen={onboarding} onClose={() => setOnboarding(false)} />
        <EmptyChecklist />
      </div>
    );
  }
  if (analysis.isError || !analysis.data) return <LoadError error={analysis.error} />;
  const a = analysis.data;
  const m = a.monthlyNumbers;
  const top = a.alerts[0];

  return (
    <div className="stack-lg reveal">
      {header}
      <Onboarding forceOpen={onboarding} onClose={() => setOnboarding(false)} />
      {top && (
        <div aria-live="polite">
          <AlertBanner
            alert={top}
            busy={markRead.isPending}
            onRead={() => markRead.mutate(top.id)}
          />
        </div>
      )}

      <section className="hero dash-hero" aria-labelledby="ire-title">
        <div>
          <IreGauge value={a.ire.value} label={a.ire.label} />
          <div className="dial-value">
            <span className="big">{formatDecimal(a.ire.value)}</span>
            <span className="of">de 1</span>
          </div>
        </div>
        <div className="stack">
          <div className="stack-sm">
            <h2 id="ire-title" className="eyebrow" style={{ color: 'var(--mint)' }}>
              Seu <Term id="ire">índice de risco</Term> (IRE)
            </h2>
            <RiskBadge band={a.ire.band} label={a.ire.label} />
          </div>
          <p className="verdict">{a.ire.recommendation}</p>
          <div className="row">
            <Link className="btn btn-light btn-lg" to="/simular">
              <Calculator size={20} aria-hidden="true" /> Simular uma compra
            </Link>
            <button
              type="button"
              className="btn btn-ghost-light"
              onClick={() => help.open('faixa-risco')}
            >
              O que isso significa?
            </button>
          </div>
        </div>
      </section>

      <section aria-labelledby="ind-title">
        <h2 id="ind-title" className="section-title">
          Os 4 sinais que formam seu índice
        </h2>
        <div className="tiles">
          {ORDER.map((k) => (
            <IndicatorCard key={k} indicatorKey={k} view={a.indicators[k]} />
          ))}
        </div>
      </section>

      <div className="grid-2">
        <section className="card stack" aria-labelledby="why-title">
          <div className="stack-xs">
            <h2 id="why-title">Por que meu risco é este?</h2>
            {a.factors && (
              <p className="small muted">
                Quanto cada sinal pesa no seu índice. Os principais explicam pelo menos 75% do
                resultado.
              </p>
            )}
          </div>
          {a.factors ? (
            <FactorList factors={a.factors} />
          ) : (
            <p>Não há fatores de risco no momento.</p>
          )}
        </section>

        <section className="card stack" aria-labelledby="totals-title">
          <div className="row spread">
            <h2 id="totals-title">Seus números</h2>
            <Link className="btn btn-link" to="/orcamento">
              <Wallet size={16} aria-hidden="true" /> Editar orçamento
            </Link>
          </div>
          <dl className="numbers">
            <div>
              <dt className="small muted">
                <Term id="renda-liquida">Renda líquida</Term> mensal
              </dt>
              <dd>{formatMoney(a.totals.income)}</dd>
            </div>
            <div>
              <dt className="small muted">
                <Term id="despesa-fixa">Despesas fixas</Term> mensais
              </dt>
              <dd>{formatMoney(m.fixedExpenses)}</dd>
            </div>
            <div>
              <dt className="small muted">
                <Term id="despesa-variavel">Despesas variáveis</Term> mensais
              </dt>
              <dd>
                {m.variableExpensesMin === '0.00' && m.variableExpensesMax === '0.00'
                  ? formatMoney('0.00')
                  : `${formatMoney(m.variableExpensesMin)} a ${formatMoney(m.variableExpensesMax)}`}
              </dd>
            </div>
            <div>
              <dt className="small muted">
                <Term id="parcela">Parcelas</Term> do mês
              </dt>
              <dd>{formatMoney(a.totals.installments)}</dd>
            </div>
          </dl>
          <div className="stack-sm">
            <div
              className="seg seg-stretch"
              role="group"
              aria-label="Cenário das despesas variáveis"
            >
              {SCENARIOS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={scenario === s.key}
                  onClick={() => setScenario(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <dl className="numbers">
              <div className="numbers-total">
                <dt className="numbers-total-label">
                  <span>Renda depois de despesas e parcelas</span>
                  <span className="small muted">{SCENARIO_NOTE[scenario]}</span>
                </dt>
                <dd>{formatMoney(m.freeAfterExpenses[scenario])}</dd>
              </div>
            </dl>
          </div>
          <Link className="btn btn-link" to="/projecao" style={{ alignSelf: 'flex-start' }}>
            Ver os próximos meses <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}
