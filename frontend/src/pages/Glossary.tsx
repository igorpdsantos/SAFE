import { ArrowLeft, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { glossary } from '../content/glossary';

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Glossário em ordem alfabética, com busca (SPEC-15 §4.5). */
export function Glossary() {
  const [q, setQ] = useState('');
  const items = useMemo(() => {
    const needle = normalize(q.trim());
    return [...glossary]
      .sort((a, b) => a.term.localeCompare(b.term, 'pt-BR'))
      .filter(
        (e) =>
          !needle ||
          normalize(`${e.term} ${e.acronym ?? ''} ${e.short} ${e.long}`).includes(needle),
      );
  }, [q]);

  return (
    <div className="doc-page stack reveal">
      <Link className="back-link" to="/">
        <ArrowLeft size={18} aria-hidden="true" /> Voltar
      </Link>
      <PageHeader
        eyebrow="Ajuda"
        title="Glossário"
        lead="As palavras de finanças que aparecem no SAFE, explicadas de um jeito simples."
      />
      <div className="field">
        <label htmlFor="busca">Buscar um termo</label>
        <div className="search">
          <Search size={20} aria-hidden="true" />
          <input
            id="busca"
            className="input"
            type="search"
            autoComplete="off"
            placeholder="Ex.: parcela, reserva, juros"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      <p className="small muted" role="status">
        {items.length} {items.length === 1 ? 'termo' : 'termos'}
      </p>
      <dl className="glossary-list">
        {items.map((e) => (
          <div key={e.id} id={e.id} className="card stack-sm">
            <dt>
              <h2>
                {e.term}
                {e.acronym && e.acronym !== e.term ? ` (${e.acronym})` : ''}
              </h2>
            </dt>
            <dd className="prose">
              <p>{e.long || e.short}</p>
              {e.example && (
                <p className="small">
                  <strong>Exemplo:</strong> {e.example}
                </p>
              )}
              {e.whyItMatters && (
                <p className="small muted">
                  <strong>Por que importa:</strong> {e.whyItMatters}
                </p>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
