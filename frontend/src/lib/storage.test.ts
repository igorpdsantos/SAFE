import { beforeEach, describe, expect, it } from 'vitest';
import { getPref, purgeBrowserStorage, setPref, type StorageKey } from './storage';

describe('T-11.3 – lib/storage.ts (lista fechada)', () => {
  beforeEach(() => window.localStorage.clear());

  it('grava e lê só as 3 preferências permitidas', () => {
    setPref('theme', 'dark');
    expect(getPref('theme')).toBe('dark');
    expect(() => setPref('email' as StorageKey, 'x')).toThrow();
    expect(() => getPref('token' as StorageKey)).toThrow();
  });

  it('ao sair, remove qualquer chave fora da lista e limpa o sessionStorage', () => {
    setPref('safe_cookie_notice', '1');
    window.localStorage.setItem('intrusa', 'dado');
    window.sessionStorage.setItem('algo', 'x');
    purgeBrowserStorage();
    expect(Object.keys(window.localStorage)).toEqual(['safe_cookie_notice']);
    expect(window.sessionStorage.length).toBe(0);
  });
});
