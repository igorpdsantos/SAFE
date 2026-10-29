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
      <div className="small muted">{title}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{value}</div>
      <p className="small" style={{ margin: '0.25rem 0 0' }}>
        {meaning}
      </p>
      {interpretation && (
        <p className="small" style={{ margin: '0.25rem 0 0', fontWeight: 600 }}>
          {interpretation}
        </p>
      )}
    </div>
  );
}
