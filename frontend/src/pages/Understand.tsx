import { Info } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useContextSeries } from '../api/hooks';
import type { ContextSeries, RiskBand } from '../api/types';
import { EmptyArt } from '../components/Art';
import { useHelp } from '../components/HelpPanel';
import { PageHeader } from '../components/PageHeader';
import { BAND_LABELS, RiskBadge } from '../components/RiskBadge';
import { LoadError, Loading } from '../components/States';
import { Term } from '../components/Term';
import { getGlossaryEntry, type GlossaryId } from '../content/glossary';
import { formatDate, formatDecimal } from '../lib/format';

const COLORS = ['var(--brand)', 'var(--gold)', 'var(--risk-4)'];
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

/** Gráfico de linhas de uma ou mais séries, com tabela e fonte (SPEC-14 §4). */
function SeriesCard({
  title,
  help,
  series,
}: {
  title: ReactNode;
  help: string;
  series: ContextSeries[];
}) {
  const shown = series.filter((s) => s.points.length > 0);
  const dates = [...new Set(shown.flatMap((s) => s.points.map((p) => p.date)))].sort();
  const data = dates.map((date) => {
    const row: Record<string, string | number | null> = { date: monthLabel(date) };
    shown.forEach((s) => {
      const p = s.points.find((x) => x.date === date);
      row[s.id] = p ? Number(p.value) : null;
    });
    return row;
  });
  const sources = [...new Map(series.map((s) => [s.source, s])).values()];
  // Faixa estreita (ex.: 48 a 50) pede uma casa decimal no eixo para não repetir rótulos.
  const values = shown.flatMap((s) => s.points.map((p) => Number(p.value)));
  const axisPlaces = Math.max(...values) - Math.min(...values) < 10 ? 1 : 0;

  return (
    <section className="card stack">
      <div className="stack-xs">
        <h2>{title}</h2>
        <p className="small muted">{help}</p>
      </div>
      {shown.length === 0 ? (
        <p className="muted">
          Não há dados desta fonte no período escolhido. Escolha um período maior.
        </p>
      ) : (
        <div style={{ width: '100%', height: 260 }} aria-hidden="true">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--muted)' }} minTickGap={16} />
              <YAxis
                width={44}
                tick={{ fontSize: 12, fill: 'var(--muted)' }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
                tickFormatter={(v: number) => formatDecimal(String(v), axisPlaces)}
              />
              <Tooltip
                formatter={(v, name) => [
                  `${formatDecimal(String(v), 1)}%`,
                  shown.find((s) => s.id === name)?.name ?? String(name),
                ]}
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  color: 'var(--text)',
                }}
              />
              {shown.length > 1 && (
                <Legend formatter={(id) => shown.find((s) => s.id === id)?.name ?? String(id)} />
              )}
              {shown.map((s, i) => (
                <Line
                  key={s.id}
                  dataKey={s.id}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2.5}
                  dot={data.length <= 14 ? { r: 3 } : false}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="stack-xs">
        {sources.map((s) => (
          <p key={s.source} className="small muted">
            <strong>Fonte:</strong> {s.source} · {s.unit} · extraído em {formatDate(s.extractedAt)}
          </p>
        ))}
      </div>
      {shown.length > 0 && (
        <details className="more">
          <summary>Ver tabela</summary>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Mês</th>
                  {shown.map((s) => (
                    <th key={s.id} scope="col">
                      {s.name} ({s.unit})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...dates].reverse().map((date) => (
                  <tr key={date}>
                    <td>{monthLabel(date)}</td>
                    {shown.map((s) => {
                      const p = s.points.find((x) => x.date === date);
                      return <td key={s.id}>{p ? formatDecimal(p.value, 1) : '—'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
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

      <div className="chart-grid">
        <SeriesCard
          title="Quantas famílias têm dívidas"
          help="Pesquisa mensal da Confederação Nacional do Comércio (CNC) com as famílias. Ter dívida é comum; o aperto aparece em quem está com conta atrasada."
          series={pick('peic_endividadas', 'peic_em_atraso', 'peic_sem_condicao')}
        />
        <SeriesCard
          title={
            <>
              Quanto da renda vai para dívidas{' '}
              <span className="keep">
                (<Term id="comprometimento-renda">comprometimento</Term>)
              </span>
            </>
          }
          help="O que as famílias dizem na pesquisa da CNC e o que o Banco Central mede nos bancos. Os números diferem pelo método; compare a direção."
          series={pick('peic_renda_comprometida', 'bcb_comprometimento')}
        />
        <SeriesCard
          title={
            <>
              Tamanho das dívidas{' '}
              <span className="keep">
                (<Term id="endividamento">endividamento</Term>)
              </span>
            </>
          }
          help="Tudo o que as famílias devem aos bancos comparado com o que ganham em 12 meses."
          series={pick('bcb_endividamento')}
        />
        <SeriesCard
          title={
            <>
              Taxa básica de juros{' '}
              <span className="keep">
                (<Term id="selic">Selic</Term>)
              </span>
            </>
          }
          help="A referência para o custo do crédito no Brasil. Quando sobe, os empréstimos tendem a ficar mais caros."
          series={pick('bcb_selic')}
        />
      </div>

      <section className="card stack" aria-labelledby="como-calcula">
        <div className="stack-xs">
          <h2 id="como-calcula">Como o SAFE calcula seu risco</h2>
          <p className="muted">
            O <Term id="ire">índice de risco</Term> (IRE) vai de 0 a 1 e junta quatro sinais do seu
            orçamento, cada um com um peso.
          </p>
        </div>
        <ul className="factor-bars">
          {WEIGHTS.map((w) => (
            <li key={w.id} className="factor">
              <div className="row spread row-tight">
                <span style={{ fontWeight: 650 }}>
                  <Term id={w.id}>{w.label}</Term>
                </span>
                <span>{w.weight}% do índice</span>
              </div>
              <div className="bar" aria-hidden="true">
                <span style={{ width: `${w.weight * 2.5}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <div className="stack-sm">
          <h3>As cinco faixas</h3>
          <ul className="row row-tight" style={{ listStyle: 'none', padding: 0 }}>
            {BANDS.map((b) => (
              <li key={b.band} className="stack-xs">
                <RiskBadge band={b.band} label={BAND_LABELS[b.band]} />
                <span className="small muted">{b.range}</span>
              </li>
            ))}
          </ul>
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
