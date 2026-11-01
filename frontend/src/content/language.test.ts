import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { glossary } from './glossary';

const ROOT = join(__dirname, '..');

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'test' ? [] : tsxFiles(path);
    return path.endsWith('.tsx') && !path.endsWith('.test.tsx') ? [path] : [];
  });
}

const files = tsxFiles(ROOT).map((path) => ({
  path: path.slice(ROOT.length + 1),
  src: readFileSync(path, 'utf8'),
}));
const ids = new Set(glossary.map((e) => e.id));

/** Textos que o usuário lê: texto entre tags JSX e strings com espaço (frases). */
function uiTexts(src: string): string[] {
  const noTerms = src.replace(/<Term\b[^>]*>[\s\S]*?<\/Term>/g, ' ');
  const jsxText = [...noTerms.matchAll(/>([^<>{}]+)</g)].map((m) => m[1]!);
  const strings = [...noTerms.matchAll(/(['"`])((?:(?!\1).){3,}?)\1/g)]
    .map((m) => m[2]!)
    .filter((s) => / /.test(s));
  return [...jsxText, ...strings].map((t) => t.trim()).filter((t) => /[a-zà-ú]/i.test(t));
}

describe('T-15.5 – glossário e linguagem (SPEC-15 §6)', () => {
  it('glossário com 33 entradas, ids únicos, short ≤ 140, long e exemplo ou porquê', () => {
    expect(glossary).toHaveLength(33);
    expect(ids.size).toBe(33);
    for (const e of glossary) {
      expect(e.short.length, e.id).toBeLessThanOrEqual(140);
      expect(e.long.length, e.id).toBeGreaterThan(0);
      expect(Boolean(e.example || e.whyItMatters), e.id).toBe(true);
      for (const r of e.related ?? []) expect(ids.has(r), `${e.id} → ${r}`).toBe(true);
    }
  });

  it('todo <Term id> usado nas telas existe no glossário', () => {
    const used = files.flatMap((f) =>
      [...f.src.matchAll(/<Term\s+id="([^"]+)"/g)].map((m) => ({ file: f.path, id: m[1]! })),
    );
    expect(used.length).toBeGreaterThan(20);
    for (const u of used) expect(ids.has(u.id), `${u.file}: ${u.id}`).toBe(true);
  });

  it('siglas e palavras em inglês não aparecem soltas nos textos (só dentro de <Term> ou com o nome por extenso)', () => {
    const banned = /\b(IRE|CR|CP|LF|NE|CET|Selic|LGPD|TCC|score|overdraft|budget|outcome)\b/;
    const problems: string[] = [];
    const allTexts = files.flatMap((f) => uiTexts(f.src));
    expect(allTexts.length).toBeGreaterThan(150); // o teste lê de verdade os textos das telas
    expect(uiTexts('<p>Seu IRE é alto</p>').join()).toMatch(banned); // e pegaria uma sigla solta
    for (const f of files) {
      for (const text of uiTexts(f.src)) {
        // "(IRE)" logo depois do nome por extenso é permitido (L1).
        const cleaned = text.replace(/\((IRE|CR|CP|LF|NE|CET|LGPD)\)/g, '');
        const m = cleaned.match(banned);
        if (m) problems.push(`${f.path}: "${m[0]}" em "${text.slice(0, 80)}"`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('nenhum texto promete ou recomenda compra (L12)', () => {
    const promise = /pode comprar|garantimos|recomendamos (contratar|comprar)/i;
    for (const f of files)
      for (const t of uiTexts(f.src)) expect(promise.test(t), `${f.path}: ${t}`).toBe(false);
  });

  it('nenhuma tela usa dangerouslySetInnerHTML', () => {
    for (const f of files) expect(f.src.includes('dangerouslySetInnerHTML'), f.path).toBe(false);
  });

  it('T-15.6 – checklist da SPEC-15 §5 atendido em todas as telas', () => {
    const byName = (name: string) => files.find((f) => f.path.endsWith(name))!.src;
    expect(byName('Login.tsx')).toContain('id="oauth-google"');
    expect(byName('Login.tsx')).toContain('Recebemos só seu e-mail');
    expect(byName('Terms.tsx')).toContain('id="lgpd"');
    expect(byName('Terms.tsx')).toContain('id="anonimizado"');
    expect(byName('Terms.tsx')).toContain('id="consentimento"');
    expect(byName('CookieNotice.tsx')).toContain('id="cookie"');
    expect(byName('Budget.tsx')).toContain('id="renda-liquida"');
    expect(byName('Budget.tsx')).toContain('id="despesa-fixa"');
    expect(byName('Budget.tsx')).toContain('id="despesa-variavel"');
    expect(byName('Budget.tsx')).toContain('id="parcela"');
    expect(byName('Budget.tsx')).toContain('id="saldo-devedor"');
    expect(byName('Budget.tsx')).toContain('id="reserva"');
    expect(byName('IndicatorCard.tsx')).toContain('Folga mensal (capacidade de pagamento)');
    expect(byName('IndicatorCard.tsx')).toContain('Reserva de emergência (liquidez)');
    expect(byName('IndicatorCard.tsx')).toContain('Tamanho das dívidas (nível de endividamento)');
    expect(byName('FactorList.tsx')).toContain('FACTOR_TERM');
    expect(byName('Account.tsx')).toContain('id="consentimento"');
    expect(byName('Account.tsx')).toContain('safe.tcc.usjt@gmail.com');
  });
});
