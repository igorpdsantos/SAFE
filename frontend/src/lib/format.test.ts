import { describe, expect, it } from 'vitest';
import {
  apiToCents,
  centsToApi,
  centsToDisplay,
  formatDate,
  formatMoney,
  formatPercent,
} from './format';

describe('T-11.5 – formatadores pt-BR', () => {
  it('dinheiro, porcentagem e data', () => {
    expect(formatMoney('1600.00')).toBe('R$ 1.600,00');
    expect(formatMoney('-100')).toBe('-R$ 100,00');
    expect(formatMoney(null)).toBe('—');
    expect(formatPercent('0.25')).toBe('25,0%');
    expect(formatPercent('0.6486')).toBe('64,9%');
    expect(formatDate('2026-10-29')).toBe('29/10/2026');
    expect(formatDate('2026-10-29T18:00:00Z')).toBe('29/10/2026');
  });

  it('máscara de dinheiro em centavos ↔ string da API', () => {
    expect(centsToDisplay('123456')).toBe('1.234,56');
    expect(centsToDisplay('5')).toBe('0,05');
    expect(centsToApi('123456')).toBe('1234.56');
    expect(centsToApi('5')).toBe('0.05');
    expect(apiToCents('1600.5')).toBe('160050');
    expect(apiToCents('1600')).toBe('160000');
    expect(centsToApi(apiToCents('0.00'))).toBe('0.00');
  });
});
