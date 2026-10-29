import { Link } from 'react-router-dom';
import { LegalText } from '../components/Markdown';

export function LegalPage({ doc }: { doc: 'termos' | 'privacidade' }) {
  return (
    <div className="main stack">
      <p>
        <Link to="/">← Voltar</Link>
      </p>
      <LegalText url={`/legal/${doc}-v1.0.md`} />
    </div>
  );
}
