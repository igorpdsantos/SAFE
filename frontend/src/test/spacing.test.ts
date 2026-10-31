import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(__dirname, '..', 'styles.css'), 'utf8');

/** Regras CSS achatadas: [seletor, corpo]. */
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
  (m) => [m[1]!.trim().split('\n').pop()!.trim(), m[2]!] as const,
);

describe('T-11.9 – espaçamento vem do contêiner', () => {
  it('nenhuma classe de componente zera a margem (anularia .stack)', () => {
    // Exceções que não ficam dentro de .stack ou centralizam com "auto".
    const allowed = new Set(['.page-head h1', '.numbers dd', '.step-body p', '.auth-art .lead']);
    const offenders = rules
      .filter(([sel, body]) => sel.startsWith('.') && /(?<![\w-])margin:\s*0;/.test(body))
      .map(([sel]) => sel)
      .filter((sel) => !allowed.has(sel));
    expect(offenders).toEqual([]);
  });

  it('margens e gaps usam a escala (--s-*), sem rem solto', () => {
    const loose = rules.flatMap(([sel, body]) =>
      [...body.matchAll(/(?<![\w-])(margin|padding|gap)[a-z-]*:\s*([^;]+);/g)]
        .filter((d) => /\d*\.?\d+rem/.test(d[2]!))
        .map((d) => `${sel} → ${d[0]}`),
    );
    expect(loose).toEqual([]);
  });
});
