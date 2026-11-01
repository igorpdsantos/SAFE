import type { Factor, IndicatorKey } from '../api/types';
import type { GlossaryId } from '../content/glossary';
import { formatPercent } from '../lib/format';
import { Term } from './Term';

const FACTOR_TERM: Record<IndicatorKey, GlossaryId> = {
  cr: 'comprometimento-renda',
  cp: 'capacidade-pagamento',
  lf: 'liquidez',
  ne: 'nivel-endividamento',
};

/** Participação de cada fator no índice; "principal" escrito, não só destacado (SPEC-11 §5). */
export function FactorList({ factors }: { factors: Factor[] }) {
  return (
    <ul className="list">
      {factors.map((f) => (
        <li key={f.key} className="factor">
          <div className="row spread row-tight">
            <span style={{ fontWeight: f.isMain ? 700 : 400 }}>
              <Term id={FACTOR_TERM[f.key]}>{f.name}</Term>{' '}
              {f.isMain && (
                <span className="badge">
                  <Term id="fator-principal">principal</Term>
                </span>
              )}
            </span>
            <span>{formatPercent(f.share)} do risco</span>
          </div>
          <div className="bar" aria-hidden="true">
            <span
              style={{
                width: `${Number(f.share) * 100}%`,
                // Ênfase: os fatores principais em destaque, o resto em cinza.
                background: f.isMain ? 'var(--series-1)' : 'var(--series-muted)',
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
