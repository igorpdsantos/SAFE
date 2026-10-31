import { LegalText } from '../components/Markdown';

/** Termos de Uso e Política de Privacidade (o PublicPage decide se abre dentro do app ou sozinho). */
export function LegalPage({ doc }: { doc: 'termos' | 'privacidade' }) {
  return (
    <article className="card legal-card reveal">
      <LegalText url={`/legal/${doc}-v1.0.md`} />
    </article>
  );
}
