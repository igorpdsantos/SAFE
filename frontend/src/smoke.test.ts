import { describe, expect, it } from 'vitest';

describe('T-01.1 – Vitest configurado', () => {
  it('roda testes do frontend em jsdom', () => {
    expect(typeof document).toBe('object');
  });
});
