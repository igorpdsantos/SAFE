import type { ReactNode } from 'react';

/** Cabeçalho de página: uma frase de contexto e, no desktop, uma ilustração (T-11.8). */
export function PageHeader({
  eyebrow,
  title,
  lead,
  art,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  art?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
        {children}
      </div>
      {art && <div className="art">{art}</div>}
    </header>
  );
}
