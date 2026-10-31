import { describe, expect, it } from 'vitest';
import { Decimal } from '../../engine/decimal.js';
import { crLevel, indicatorDisplay } from './present.js';

describe('HU09 – comprometimento da renda', () => {
  it.each([
    ['0', 'OK'],
    ['0.2999', 'OK'],
    ['0.30', 'ATENCAO'],
    ['0.50', 'ATENCAO'],
    ['0.5001', 'ALTO'],
    ['1.15', 'ALTO'],
  ] as const)('critério 6 – CR %s → %s', (cr, level) => {
    expect(crLevel(new Decimal(cr))).toBe(level);
  });

  it('critérios 2, 3 e 7 – porcentagem com 2 casas, 0 sem dívidas e valor acima de 100%', () => {
    expect(indicatorDisplay('cr', new Decimal('0.123456'))).toBe('12,35%');
    expect(indicatorDisplay('cr', new Decimal(0))).toBe('0,00%');
    expect(indicatorDisplay('cr', new Decimal('1.15'))).toBe('115,00%');
  });
});
