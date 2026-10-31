import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LegalText } from '../components/Markdown';

export function LegalPage({ doc }: { doc: 'termos' | 'privacidade' }) {
  return (
    <div className="doc-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={18} aria-hidden="true" /> Voltar
      </Link>
      <article className="card" style={{ padding: 'clamp(1.25rem, 3vw, 2.5rem)' }}>
        <LegalText url={`/legal/${doc}-v1.0.md`} />
      </article>
    </div>
  );
}
