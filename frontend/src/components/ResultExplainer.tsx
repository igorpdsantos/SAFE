import type { ReactNode } from 'react';

/** Número com tradução em frase e interpretação (SPEC-15 §4.4). */
export function ResultExplainer({
  title,
  value,
  meaning,
  interpretation,
}: {
  title: ReactNode;
  value: ReactNode;
  meaning: ReactNode;
  interpretation?: ReactNode;
}) {
  return (
    <div className="stack" style={{ gap: 0 }}>
      <div className="small muted" style={{ fontWeight: 600 }}>
        {title}
      </div>
      <div className="tile-value" style={{ marginTop: '0.35rem' }}>
        {value}
      </div>
      <p className="tile-meaning" style={{ marginTop: '0.4rem' }}>
        {meaning}
      </p>
      {interpretation && (
        <p className="small" style={{ margin: '0.3rem 0 0', fontWeight: 650 }}>
          {interpretation}
        </p>
      )}
    </div>
  );
}
