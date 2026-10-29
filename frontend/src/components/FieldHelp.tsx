/** Ajuda sempre visível embaixo do rótulo: o que é + por que pedimos (SPEC-15 §4.2, L4). */
export function FieldHelp({ id, what, why }: { id: string; what: string; why: string }) {
  return (
    <p id={id} className="field-help">
      <strong>{what}</strong> · {why}
    </p>
  );
}
