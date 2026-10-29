import { X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getGlossaryEntry, glossary, type GlossaryId } from '../content/glossary';

interface HelpContextValue {
  open: (id: GlossaryId) => void;
}

const HelpContext = createContext<HelpContextValue>({ open: () => undefined });

export const useHelp = () => useContext(HelpContext);

const isGlossaryId = (id: string): id is GlossaryId => glossary.some((e) => e.id === id);

/** Painel "Saiba mais": lateral no desktop, folha inferior no celular (SPEC-15 §4.3). */
export function HelpProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<GlossaryId | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const open = useCallback((id: GlossaryId) => {
    opener.current ??= document.activeElement as HTMLElement | null;
    setCurrent(id);
  }, []);
  const close = useCallback(() => {
    setCurrent(null);
    opener.current?.focus();
    opener.current = null;
  }, []);

  useEffect(() => {
    if (!current) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [current, close]);

  const value = useMemo(() => ({ open }), [open]);
  const entry = current ? getGlossaryEntry(current) : null;

  return (
    <HelpContext.Provider value={value}>
      {children}
      {entry && (
        <>
          <div className="panel-backdrop" onClick={close} />
          <aside
            className="panel stack"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
          >
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <h2 id="help-title" style={{ margin: 0 }}>
                {entry.term}
                {entry.acronym && entry.term !== entry.acronym ? ` (${entry.acronym})` : ''}
              </h2>
              <button
                ref={closeRef}
                type="button"
                className="btn"
                onClick={close}
                aria-label="Fechar explicação"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p>{entry.long}</p>
            {entry.example && (
              <div className="notice">
                <strong>Exemplo:</strong> {entry.example}
              </div>
            )}
            {entry.whyItMatters && (
              <div>
                <h3>Por que o SAFE olha para isso</h3>
                <p>{entry.whyItMatters}</p>
              </div>
            )}
            {entry.related && entry.related.length > 0 && (
              <div>
                <h3>Veja também</h3>
                <div className="row">
                  {entry.related.filter(isGlossaryId).map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="btn btn-link"
                      onClick={() => setCurrent(id)}
                    >
                      {getGlossaryEntry(id).term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </>
      )}
    </HelpContext.Provider>
  );
}
