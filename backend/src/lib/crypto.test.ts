import { describe, expect, it } from 'vitest';
import { FieldCipher } from './crypto.js';

const key = Buffer.alloc(32, 9).toString('base64');

describe('T-04.1 – lib/crypto.ts (AES-256-GCM)', () => {
  const cipher = new FieldCipher(key);

  it('cifra e decifra, inclusive acentos', () => {
    const enc = cipher.encrypt('Geladeira nova — ção');
    expect(cipher.decrypt(enc)).toBe('Geladeira nova — ção');
  });

  it('o texto cifrado não contém o texto puro e muda a cada vez (IV aleatório)', () => {
    const a = cipher.encrypt('Notebook');
    const b = cipher.encrypt('Notebook');
    expect(a.toString('utf8')).not.toContain('Notebook');
    expect(a.equals(b)).toBe(false);
    expect(a.length).toBe(12 + 'Notebook'.length + 16);
  });

  it('dado adulterado é rejeitado (autenticação do GCM)', () => {
    const enc = cipher.encrypt('Notebook');
    enc[13] = enc[13]! ^ 0xff;
    expect(() => cipher.decrypt(enc)).toThrow();
  });

  it('outra chave não decifra', () => {
    const enc = cipher.encrypt('Notebook');
    const other = new FieldCipher(Buffer.alloc(32, 1).toString('base64'));
    expect(() => other.decrypt(enc)).toThrow();
  });

  it('rejeita chave com tamanho errado e dado curto demais', () => {
    expect(() => new FieldCipher(Buffer.alloc(16).toString('base64'))).toThrow();
    expect(() => cipher.decrypt(Buffer.alloc(5))).toThrow();
  });
});
