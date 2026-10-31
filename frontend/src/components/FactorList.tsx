import type { Factor } from '../api/types';
import { formatPercent } from '../lib/format';
import { Term } from './Term';

/** Participação de cada fator no índice; "principal" escrito, não só destacado (SPEC-11 §5). */
export function FactorList({ factors }: { factors: Factor[] }) {
  return (
    <ul className="list">
      {factors.map((f) => (
        <li key={f.key} className="factor">
          <div className="row spread row-tight">
            <span style={{ fontWeight: f.isMain ? 700 : 400 }}>
              {f.name}{' '}
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
