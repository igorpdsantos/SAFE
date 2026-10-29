import { describe, expect, it } from 'vitest';
import {
  Decimal,
  InvalidMoneyError,
  parseMoney,
  round2,
  toMoneyString,
  toRatioString,
} from './decimal.js';

describe('T-01.4 – lib/decimal.ts', () => {
  it.each([
    ['1600', '1600.00'],
    ['1600.5', '1600.50'],
    ['1600.50', '1600.50'],
    ['0', '0.00'],
  ])('parseMoney(%s) vira %s', (input, expected) => {
    expect(toMoneyString(parseMoney(input))).toBe(expected);
  });

  it.each(['1,5', '1e3', '-1', '1.234', '', ' 10', 'abc', '1.', '.5'])('rejeita "%s"', (input) => {
    expect(() => parseMoney(input)).toThrow(InvalidMoneyError);
  });

  it('aceita negativo só quando pedido', () => {
    expect(toMoneyString(parseMoney('-600', { allowNegative: true }))).toBe('-600.00');
  });

  it('arredonda half-up em 2 casas só no final', () => {
    expect(round2(new Decimal('0.1925')).toString()).toBe('0.19');
    expect(round2(new Decimal('0.125')).toString()).toBe('0.13');
    expect(round2(new Decimal('0.3775')).toString()).toBe('0.38');
  });

  it('formata razões com 4 casas', () => {
    expect(toRatioString(new Decimal(1).div(6))).toBe('0.1667');
    expect(toRatioString(new Decimal('0.1925'))).toBe('0.1925');
  });

  it('soma sem erro de ponto flutuante', () => {
    expect(new Decimal('0.1').plus('0.2').toString()).toBe('0.3');
  });
});
