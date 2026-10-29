// ÚNICA porta para o armazenamento do navegador (SEGURANCA_LGPD §5.2, SPEC-11 §4).
// Só estas chaves, sempre preferências de interface sem dado pessoal.
export type StorageKey = 'theme' | 'safe_cookie_notice' | 'safe_onboarding_done';

const ALLOWED: ReadonlySet<string> = new Set<StorageKey>([
  'theme',
  'safe_cookie_notice',
  'safe_onboarding_done',
]);

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // modo privado ou armazenamento bloqueado
  }
}

export function getPref(key: StorageKey): string | null {
  if (!ALLOWED.has(key)) throw new Error(`Chave não permitida: ${key}`);
  try {
    return store()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function setPref(key: StorageKey, value: string): void {
  if (!ALLOWED.has(key)) throw new Error(`Chave não permitida: ${key}`);
  try {
    store()?.setItem(key, value);
  } catch {
    // sem armazenamento: a preferência vale só nesta visita
  }
}

/** Remove qualquer chave fora da lista e limpa o sessionStorage (usado ao sair). */
export function purgeBrowserStorage(): void {
  try {
    const s = store();
    if (s) {
      for (const key of Object.keys(s)) if (!ALLOWED.has(key)) s.removeItem(key);
    }
    window.sessionStorage.clear();
  } catch {
    // nada a limpar
  }
}
