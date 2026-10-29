import type { Factor } from '../api/types';
import { formatPercent } from '../lib/format';
import { Term } from './Term';

/** Participação de cada fator no índice; "principal" escrito, não só destacado (SPEC-11 §5). */
export function FactorList({ factors }: { factors: Factor[] }) {
  return (
    <ul className="list">
      {factors.map((f) => (
        <li key={f.key} style={{ display: 'block' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
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
          <div className="bar" aria-hidden="true" style={{ marginTop: 6 }}>
            <span style={{ width: `${Number(f.share) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
