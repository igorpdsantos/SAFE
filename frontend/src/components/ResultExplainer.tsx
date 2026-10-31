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
    <div>
      <div className="small muted explainer-title">{title}</div>
      <div className="tile-value explainer-value">{value}</div>
      <p className="tile-meaning explainer-meaning">{meaning}</p>
      {interpretation && <p className="small explainer-interpretation">{interpretation}</p>}
    </div>
  );
}
