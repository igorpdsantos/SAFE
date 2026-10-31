import { Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useContextSeries } from '../api/hooks';
import type { ContextSeries, RiskBand } from '../api/types';
import { EmptyArt } from '../components/Art';
import { LineChartCard } from '../components/charts/LineChartCard';
import { RankBarCard } from '../components/charts/RankBarCard';
import { PerHundred } from '../components/charts/PerHundred';
import { StatTile } from '../components/charts/StatTile';
import { describeChange, extremes, monthName, pct, toPoints } from '../components/charts/viz';
import { useHelp } from '../components/HelpPanel';
import { PageHeader } from '../components/PageHeader';
import { BAND_LABELS, RiskBadge } from '../components/RiskBadge';
import { LoadError, Loading } from '../components/States';
import { Term } from '../components/Term';
import { getGlossaryEntry, type GlossaryId } from '../content/glossary';
import { formatDecimal } from '../lib/format';

const PERIODS = [
  { months: 12, label: '1 ano' },
  { months: 36, label: '3 anos' },
  { months: 60, label: '5 anos' },
];
const BANDS: { band: RiskBand; range: string }[] = [
  { band: 1, range: 'até 0,20' },
  { band: 2, range: '0,21 a 0,40' },
  { band: 3, range: '0,41 a 0,60' },
  { band: 4, range: '0,61 a 0,80' },
  { band: 5, range: 'acima de 0,80' },
];
const WEIGHTS: { id: GlossaryId; label: string; weight: number }[] = [
  { id: 'comprometimento-renda', label: 'Comprometimento da renda', weight: 40 },
  { id: 'capacidade-pagamento', label: 'Folga mensal', weight: 30 },
  { id: 'liquidez', label: 'Reserva de emergência', weight: 20 },
  { id: 'nivel-endividamento', label: 'Tamanho das dívidas', weight: 10 },
];
const TYPE_IDS = [
  'peic_tipo_cartao_de_credito',
  'peic_tipo_carne',
  'peic_tipo_credito_pessoal',
  'peic_tipo_financiamento_de_casa',
  'peic_tipo_financiamento_de_carro',
  'peic_tipo_consignado',
  'peic_tipo_cheque_especial',
  'peic_tipo_outras_dividas',
  'peic_tipo_cheque_pre_datado',
];
const WORDS: GlossaryId[] = [
  'comprometimento-renda',
  'endividamento',
  'inadimplencia',
  'selic',
  'minimo-existencial',
  'reserva',
];

/** "2026-07" → "07/26". */
const monthLabel = (d: string) => `${d.slice(5, 7)}/${d.slice(2, 4)}`;
/** "2026-07" menos n meses. */
function minusMonths(d: string, n: number): string {
  const total = Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7)) - 1 - n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** "Entenda os dados": contexto público e como o SAFE calcula (SPEC-14, RF25, HU24). */
export function Understand() {
  const q = useContextSeries();
  const help = useHelp();
  const [months, setMonths] = useState(36);
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);

  const all = useMemo(() => q.data ?? [], [q.data]);
  const dates = useMemo(
    () => [...new Set(all.flatMap((s) => s.points.map((p) => p.date)))].sort(),
    [all],
  );
  if (q.isLoading) return <Loading />;
  if (q.isError || !q.data) return <LoadError error={q.error} />;

  const last = dates[dates.length - 1] ?? '2026-01';
  const from = custom?.from ?? minusMonths(last, months - 1);
  const to = custom?.to ?? last;
  const pick = (...ids: string[]) =>
    ids
      .map((id) => all.find((s) => s.id === id))
      .filter((s): s is ContextSeries => !!s)
      .map((s) => ({ ...s, points: s.points.filter((p) => p.date >= from && p.date <= to) }));
  const one = (id: string) => pick(id)[0];
  const points = (id: string) => {
    const s = one(id);
    return s ? toPoints(s) : [];
  };
  // O ranking é a foto de um mês: o mais recente da pesquisa até o fim do período escolhido.
  const types = TYPE_IDS.map((id) => all.find((s) => s.id === id))
    .filter((s): s is ContextSeries => !!s)
    .map((s) => ({ ...s, points: s.points.filter((p) => p.date <= to).slice(-1) }));
  const survey = all.find((s) => s.id === 'peic_endividadas')?.points ?? [];
  const showSurvey =
    survey.length > 0
      ? {
          label: 'Mostrar os meses da pesquisa',
          onClick: () => setCustom({ from: survey[0]!.date, to: survey[survey.length - 1]!.date }),
        }
      : undefined;
  const ranked = types
    .map((s) => ({ name: s.name, p: s.points[s.points.length - 1] }))
    .filter((x) => x.p)
    .sort((a, b) => Number(b.p!.value) - Number(a.p!.value));
  const typesMonth = ranked[0]?.p?.date;
  const typesInsight =
    ranked.length > 1
      ? `${ranked[0]!.name} aparece em ${pct(Number(ranked[0]!.p!.value))} das famílias com dívidas, cerca de ${Math.round(Number(ranked[0]!.p!.value) / Number(ranked[1]!.p!.value))} vezes o segundo tipo (${ranked[1]!.name.toLowerCase()}, ${pct(Number(ranked[1]!.p!.value))}).`
      : undefined;
  const income = points('bcb_comprometimento_sa');
  const incomeLast = income[income.length - 1];
  const incomeInsight = incomeLast ? (
    <>
      Em {monthName(incomeLast.date)}, de cada R$ 100 de renda, cerca de R${' '}
      {Math.round(incomeLast.value)} iam para parcelas de dívidas.{' '}
      {describeChange('Pelo Banco Central', income)} A linha verde já vem sem o efeito do 13º e das
      festas (ajuste sazonal do Banco Central); a série original está na tabela.
    </>
  ) : undefined;
  const debt = points('bcb_endividamento');
  const debtLast = debt[debt.length - 1];
  const debtInsight = debtLast ? (
    <>
      Em {monthName(debtLast.date)}, tudo o que as famílias deviam aos bancos equivalia a{' '}
      {pct(debtLast.value)} da renda de um ano, ou seja, cerca de{' '}
      {formatDecimal(String(Math.round((debtLast.value * 12) / 10) / 10), 1).replace(/,0$/, '')}{' '}
      meses de renda. {describeChange('Endividamento', debt)}
    </>
  ) : undefined;
  const selic = points('bcb_selic');
  const selicPeak = selic.length ? extremes(selic).max : null;
  const selicLast = selic[selic.length - 1];
  const rateInsight =
    selicPeak && selicLast
      ? `O maior valor do período foi ${pct(selicPeak.value)} em ${monthName(selicPeak.date)}; em ${monthName(selicLast.date)}, a taxa está em ${pct(selicLast.value)}.`
      : undefined;

  return (
    <div className="stack-lg reveal">
      <PageHeader
        eyebrow="Contexto"
        title="Entenda os dados"
        lead="Como estão as dívidas das famílias brasileiras e como o SAFE calcula o seu risco."
        art={<EmptyArt kind="chart" />}
      />

      <p className="alert risk-2" role="note">
        <Info size={20} aria-hidden="true" />
        <span style={{ color: 'var(--text)' }}>
          Dados públicos agregados da população brasileira. Não representam a sua situação
          individual nem são recomendação de investimento.
        </span>
      </p>

      <div className="stack-sm">
        <div
          className="tabs"
          role="group"
          aria-label="Período"
          style={{ maxWidth: 420, gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 0 }}
        >
          {PERIODS.map((p) => (
            <button
              key={p.months}
              type="button"
              className="tab"
              aria-pressed={!custom && months === p.months}
              onClick={() => {
                setCustom(null);
                setMonths(p.months);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <details className="more" style={{ borderTop: 0, paddingTop: 0 }}>
          <summary>Escolher os meses</summary>
          <div className="row">
            <div className="field">
              <label htmlFor="ctx-from">De</label>
              <select
                id="ctx-from"
                className="input"
                value={from}
                onChange={(e) =>
                  setCustom({ from: e.target.value, to: e.target.value > to ? e.target.value : to })
                }
              >
                {dates.map((d) => (
                  <option key={d} value={d}>
                    {monthLabel(d)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ctx-to">Até</label>
              <select
                id="ctx-to"
                className="input"
                value={to}
                onChange={(e) =>
                  setCustom({
                    from: e.target.value < from ? e.target.value : from,
                    to: e.target.value,
                  })
                }
              >
                {dates.map((d) => (
                  <option key={d} value={d}>
                    {monthLabel(d)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </details>
        <p className="small muted" role="status">
          Mostrando de {monthLabel(from)} a {monthLabel(to)}.
        </p>
      </div>

      <div className="kpi-row" aria-label="Manchetes do período">
        <StatTile
          label="Famílias com dívidas"
          series={one('peic_endividadas')}
          plain={(v) => `${Math.round(v)} de cada 100 famílias`}
        />
        <StatTile
          label="Famílias com contas em atraso"
          series={one('peic_em_atraso')}
          plain={(v) => `${Math.round(v)} de cada 100 famílias`}
        />
        <StatTile
          label="Renda que vai para parcelas"
          series={one('bcb_comprometimento_sa')}
          plain={(v) => `R$ ${Math.round(v)} de cada R$ 100 de renda`}
          unit="% da renda mensal"
        />
        <StatTile
          label="Taxa básica de juros"
          series={one('bcb_selic')}
          plain={() => 'Referência para os juros do país'}
        />
      </div>

      <section className="viz-section stack" aria-labelledby="sec-familias">
        <header>
          <p className="eyebrow">1 · As famílias</p>
          <h2 id="sec-familias">Quantas famílias têm dívidas, e de que tipo</h2>
        </header>
        <div className="chart-grid">
          <PerHundred
            title="De cada 100 famílias"
            subtitle="Pesquisa mensal da Confederação Nacional do Comércio (CNC). Ter dívida é comum; o aperto aparece em quem está com conta atrasada."
            items={[
              { series: one('peic_endividadas'), phrase: 'têm dívidas', short: 'Têm dívidas' },
              {
                series: one('peic_em_atraso'),
                phrase: 'estão com contas ou dívidas atrasadas',
                short: 'Com contas atrasadas',
              },
              {
                series: one('peic_sem_condicao'),
                phrase: 'dizem que não vão conseguir pagar o atraso',
                short: 'Não vão conseguir pagar',
              },
            ]}
            insight={describeChange('Famílias com dívidas', points('peic_endividadas'))}
            emptyAction={showSurvey}
          />
          <RankBarCard
            title="Que tipo de dívida as famílias têm"
            subtitle={`Entre as famílias com dívidas${typesMonth ? `, em ${monthName(typesMonth)}` : ''}. A soma passa de 100% porque a mesma família pode ter mais de um tipo.`}
            series={types}
            emptyAction={showSurvey}
            insight={typesInsight}
          />
        </div>
      </section>

      <section className="viz-section stack" aria-labelledby="sec-renda">
        <header>
          <p className="eyebrow">2 · A renda e as dívidas</p>
          <h2 id="sec-renda">Quanto da renda as dívidas ocupam</h2>
        </header>
        <div className="chart-grid">
          <LineChartCard
            title={
              <>
                Renda que vai para dívidas{' '}
                <span className="keep">
                  (<Term id="comprometimento-renda">comprometimento</Term>)
                </span>
              </>
            }
            subtitle="O que o Banco Central mede nos bancos e o que as famílias dizem (CNC), na mesma escala. Os métodos são diferentes: compare a direção, não a altura."
            series={pick('bcb_comprometimento_sa', 'peic_renda_comprometida')}
            tableExtra={pick('bcb_comprometimento')}
            insight={incomeInsight}
          />
          <LineChartCard
            title={
              <>
                Tamanho das dívidas{' '}
                <span className="keep">
                  (<Term id="endividamento">endividamento</Term>)
                </span>
              </>
            }
            subtitle="Tudo o que as famílias devem aos bancos, em % do que ganham em 12 meses."
            series={pick('bcb_endividamento')}
            insight={debtInsight}
          />
        </div>
      </section>

      <section className="viz-section stack" aria-labelledby="sec-juros">
        <header>
          <p className="eyebrow">3 · Os juros</p>
          <h2 id="sec-juros">
            Quanto custa o dinheiro{' '}
            <span className="keep">
              (<Term id="selic">Selic</Term>)
            </span>
          </h2>
        </header>
        <div className="chart-grid">
          <LineChartCard
            title="Taxa básica de juros, em % ao ano"
            subtitle="A referência para o custo do crédito no Brasil. Quando sobe, os empréstimos tendem a ficar mais caros."
            series={pick('bcb_selic')}
            insight={rateInsight}
            markPeak
            wide
            height={300}
          />
        </div>
      </section>

      <section className="card stack-md" aria-labelledby="como-calcula">
        <div className="stack-xs">
          <h2 id="como-calcula">Como o SAFE calcula seu risco</h2>
          <p className="muted">
            O <Term id="ire">índice de risco</Term> (IRE) vai de 0 a 1 e junta quatro sinais do seu
            orçamento, cada um com um peso.
          </p>
        </div>
        <div className="stack-sm">
          <h3>Os quatro sinais e seus pesos</h3>
          <ul className="weights">
            {WEIGHTS.map((w) => (
              <li key={w.id}>
                <span className="weight-name">
                  <Term id={w.id}>{w.label}</Term>
                </span>
                <span className="bar" aria-hidden="true">
                  <span style={{ width: `${w.weight * 2.5}%` }} />
                </span>
                <span className="weight-value">{w.weight}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="stack-sm">
          <h3>As cinco faixas</h3>
          <ol className="band-scale">
            {BANDS.map((b) => (
              <li key={b.band}>
                <RiskBadge band={b.band} label={BAND_LABELS[b.band]} />
                <span className="small muted">{b.range}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="stack-sm">
          <h3>Limitações</h3>
          <ul className="bullets small">
            <li>
              Os pesos e limites são escolhas do modelo, sem ajuste com dados reais de atraso. O
              índice ordena situações; não é diagnóstico nem previsão.
            </li>
            <li>Usa só o que você informa.</li>
            <li>
              O <Term id="minimo-existencial">mínimo existencial</Term> é o mesmo valor para todos
              (R$ 600).
            </li>
            <li>Os limites são relativos à renda: 30% pesa igual para qualquer salário.</li>
          </ul>
        </div>
      </section>

      <section className="card stack" aria-labelledby="palavras">
        <h2 id="palavras">Palavras para entender os gráficos</h2>
        <dl className="grid-2 grid-tight">
          {WORDS.map((id) => {
            const e = getGlossaryEntry(id);
            return (
              <div key={id} className="notice stack-xs">
                <dt>
                  <button
                    type="button"
                    className="btn btn-link flush"
                    onClick={() => help.open(id)}
                  >
                    {e.term}
                  </button>
                </dt>
                <dd className="small">{e.short}</dd>
              </div>
            );
          })}
        </dl>
      </section>
    </div>
  );
}
