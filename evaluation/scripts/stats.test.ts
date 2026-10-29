import { describe, expect, it } from 'vitest';
import { median, ranks, spearman, weightedKappa } from './stats.js';

describe('T-12.3 – stats.ts', () => {
  it('postos médios com empates', () => {
    expect(ranks([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4]);
  });

  it('Spearman: listas idênticas = 1, invertidas = −1', () => {
    expect(spearman([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])).toBeCloseTo(1, 12);
    expect(spearman([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBeCloseTo(-1, 12);
  });

  it('Spearman com empates (exemplo clássico: ρ ≈ 0,8)', () => {
    // x = [1,2,3,4,5], y = [2,1,4,3,5] → d² = 1+1+1+1+0 = 4 → ρ = 1 − 6·4/(5·24) = 0,8
    expect(spearman([1, 2, 3, 4, 5], [2, 1, 4, 3, 5])).toBeCloseTo(0.8, 12);
    // Com empates, segue o Pearson dos postos médios.
    expect(spearman([1, 2, 2, 3], [1, 2, 3, 4])).toBeCloseTo(0.9486832980505138, 12);
  });

  it('Kappa ponderado quadrático: avaliações idênticas = 1', () => {
    expect(weightedKappa([1, 2, 3, 4, 5, 3], [1, 2, 3, 4, 5, 3])).toBeCloseTo(1, 12);
  });

  it('Kappa ponderado: valor conhecido e discordância total negativa', () => {
    // a = [1,2,3], b = [1,3,3], k = 3, pesos (i−j)²/4: observado 0,25; esperado 3,75/3 = 1,25 → κw = 1 − 0,25/1,25 = 0,8.
    expect(weightedKappa([1, 2, 3], [1, 3, 3], 3)).toBeCloseTo(0.8, 12);
    expect(weightedKappa([1, 5], [5, 1])).toBeLessThan(0);
  });

  it('mediana', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
});
