import { CircleHelp } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { getGlossaryEntry, type GlossaryId } from '../content/glossary';
import { useHelp } from './HelpPanel';

const HOVER_DELAY_MS = 300;
const canHover = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches;

/**
 * Termo com explicação (SPEC-15 §4.1). Abre com clique, toque e teclado (Enter/Espaço);
 * no desktop também com hover após 300 ms. Fecha com Esc e clique fora; o foco volta ao termo.
 */
export function Term({ id, children }: { id: GlossaryId; children?: ReactNode }) {
  const entry = getGlossaryEntry(id);
  const [open, setOpen] = useState(false);
  const popId = useId();
  const wrap = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const help = useHelp();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const title =
    entry.acronym && entry.acronym !== entry.term ? `${entry.term} (${entry.acronym})` : entry.term;

  return (
    <span
      ref={wrap}
      className="term-wrap"
      onMouseEnter={() => {
        if (!canHover()) return;
        timer.current = window.setTimeout(() => setOpen(true), HOVER_DELAY_MS);
      }}
      onMouseLeave={() => window.clearTimeout(timer.current)}
    >
      <button
        ref={button}
        type="button"
        className="term"
        aria-expanded={open}
        aria-describedby={open ? popId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {children ?? entry.term}
        <CircleHelp size={14} aria-hidden="true" />
        <span className="sr-only"> (o que é isso?)</span>
      </button>
      {open && (
        <span id={popId} role="tooltip" className="popover">
          <strong className="popover-title">{title}</strong>
          <span className="popover-body">{entry.short}</span>
          <button
            type="button"
            className="btn btn-link flush"
            onClick={() => {
              setOpen(false);
              help.open(id);
            }}
          >
            Saiba mais
          </button>
        </span>
      )}
    </span>
  );
}
