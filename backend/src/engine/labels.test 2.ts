import { describe, expect, it } from 'vitest';
import { Decimal } from './decimal.js';
import { formatDecimalPtBr, formatMoneyPtBr, formatPercentPtBr } from './format.js';
import { BAND_LABELS, INDICATOR_NAMES } from './labels.js';

describe('T-05.4 – rótulos das faixas (RNF05: nunca só cor)', () => {
  it.each([1, 2, 3, 4, 5] as const)('faixa %i tem rótulo, cor, ícone e recomendação', (band) => {
    const l = BAND_LABELS[band];
    expect(l.label).not.toBe('');
    expect(l.color).toBe(`risk-${band}`);
    expect(l.icon).not.toBe('');
    expect(l.recommendation.length).toBeGreaterThan(20);
  });

  it('a faixa verde não promete nada (SPEC-15 L12)', () => {
    expect(BAND_LABELS[1].recommendation).toContain('não é garantia');
    expect(BAND_LABELS[1].recommendation).toContain('A decisão é sua');
  });

  it('nomes dos indicadores com o termo técnico entre parênteses', () => {
    expect(INDICATOR_NAMES.cp).toBe('Folga mensal (capacidade de pagamento)');
    expect(INDICATOR_NAMES.lf).toBe('Reserva de emergência (liquidez)');
  });
});

describe('formatação pt-BR do motor', () => {
  it.each([
    ['1600', 'R$ 1.600,00'],
    ['1234567.891', 'R$ 1.234.567,89'],
    ['0', 'R$ 0,00'],
    ['-100', '-R$ 100,00'],
    ['-0.001', 'R$ 0,00'],
  ])('dinheiro %s → %s', (v, expected) => {
    expect(formatMoneyPtBr(new Decimal(v))).toBe(expected);
  });

  it('porcentagem e decimal', () => {
    expect(formatPercentPtBr(new Decimal('0.25'))).toBe('25,0%');
    expect(formatPercentPtBr(new Decimal('0.9189'))).toBe('91,9%');
    expect(formatDecimalPtBr(new Decimal('3.3'), 1)).toBe('3,3');
  });
});
