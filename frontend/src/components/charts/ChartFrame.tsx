import { Lightbulb } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatDate } from '../../lib/format';
import type { VizSeries } from './viz';

/**
 * Moldura de todo gráfico: título e pergunta, legenda (2+ séries), o gráfico, a frase do que
 * observar, a fonte com a data de extração e a tabela (o gráfico nunca é o único acesso ao número).
 */
export function ChartFrame({
  title,
  subtitle,
  legend,
  insight,
  sources = [],
  sourceNote,
  table,
  wide,
  children,
}: {
  title: ReactNode;
  subtitle: ReactNode;
  legend?: { name: string; color: string; kind?: 'line' | 'swatch' }[];
  insight?: ReactNode;
  sources?: VizSeries[];
  /** Origem quando o dado é do próprio usuário (ex.: "Calculado com o seu orçamento"). */
  sourceNote?: ReactNode;
  table?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const unique = [...new Map(sources.filter((s) => s.source).map((s) => [s.source, s])).values()];
  return (
    <section className={wide ? 'card stack chart-card chart-wide' : 'card stack chart-card'}>
      <div className="chart-head">
        <h3>{title}</h3>
        <p className="small muted">{subtitle}</p>
      </div>
      {legend && legend.length > 1 && (
        <ul className="chart-legend" aria-label="Legenda">
          {legend.map((l) => (
            <li key={l.name}>
              <span
                className={l.kind === 'swatch' ? 'swatch' : 'line-key'}
                style={l.kind === 'swatch' ? { background: l.color } : { color: l.color }}
                aria-hidden="true"
              />
              {l.name}
            </li>
          ))}
        </ul>
      )}
      {children}
      {insight && (
        <p className="chart-insight">
          <Lightbulb size={16} aria-hidden="true" />
          <span>{insight}</span>
        </p>
      )}
      <div className="chart-foot stack-sm">
        <div className="stack-xs">
          {unique.map((s) => (
            <p key={s.source} className="chart-source">
              Fonte: {s.source}
              {s.unit ? ` · ${s.unit}` : ''}
              {s.extractedAt ? ` · extraído em ${formatDate(s.extractedAt)}` : ''}
            </p>
          ))}
          {sourceNote && <p className="chart-source">{sourceNote}</p>}
        </div>
        {table && (
          <details className="more">
            <summary>Ver tabela</summary>
            <div className="table-wrap">{table}</div>
          </details>
        )}
      </div>
    </section>
  );
}
