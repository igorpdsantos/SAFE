import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmação acessível: foco preso dentro, Esc fecha e o foco volta para quem abriu (SPEC-11 §5). */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancelar',
  danger,
  confirmDisabled,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const box = ref.current;
    const focusables = () =>
      Array.from(box?.querySelectorAll<HTMLElement>('button, input, a[href], select') ?? []).filter(
        (el) => !el.hasAttribute('disabled'),
      );
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, [onCancel]);

  return (
    <>
      <div className="panel-backdrop" onClick={onCancel} />
      <div
        ref={ref}
        className="dialog card stack"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h2 id="confirm-title">{title}</h2>
        {children}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
