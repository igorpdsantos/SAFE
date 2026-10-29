import { describe, expect, it } from 'vitest';
import { Decimal } from './decimal.js';
import { diagnose } from './diagnose.js';
import { simulate } from './simulation.js';
import { ARTICLE_SIMULATION, ARTICLE_SNAPSHOT } from './__fixtures__/article.js';

const eq = (actual: Decimal, expected: string) =>
  expect(actual.equals(new Decimal(expected)), `${actual.toString()} ≠ ${expected}`).toBe(true);
const close = (actual: Decimal, expected: string, digits = 4) =>
  expect(actual.toDecimalPlaces(digits).toString()).toBe(new Decimal(expected).toString());

describe('T-05.2 – T1: caso do artigo, situação atual (SPEC-05 §6)', () => {
  const r = diagnose(ARTICLE_SNAPSHOT);

  it('indicadores brutos', () => {
    eq(r.indicators.cr, '0.1');
    eq(r.indicators.ne, '1.5');
    eq(r.indicators.lf!, '3');
    eq(r.indicators.cp, '1600');
  });

  it('riscos normalizados', () => {
    eq(r.risks.cr, '0.2');
    eq(r.risks.cp, '0');
    eq(r.risks.lf, '0.5');
    eq(r.risks.ne, '0.125');
  });

  it('IRE 0,1925 → 0,19, faixa 1 (Baixo)', () => {
    eq(r.ire.raw, '0.1925');
    eq(r.ire.rounded, '0.19');
    expect(r.ire.band).toBe(1);
  });

  it('contribuições: lf 51,9%, cr 41,6%, ne 6,5%, cp 0; principais lf + cr', () => {
    const c = r.contributions!;
    expect(c.map((x) => x.key)).toEqual(['lf', 'cr', 'ne', 'cp']);
    eq(c[0]!.weighted, '0.1');
    eq(c[1]!.weighted, '0.08');
    eq(c[2]!.weighted, '0.0125');
    eq(c[3]!.weighted, '0');
    close(c[0]!.share, '0.5195');
    close(c[1]!.share, '0.4156');
    close(c[2]!.share, '0.0649');
    expect(c.map((x) => x.isMain)).toEqual([true, true, false, false]);
  });

  it('renda residual 3600 e sem regra crítica', () => {
    eq(r.residualIncome, '3600');
    expect(r.critical).toEqual({ negativeCapacity: false, belowMinimumExistential: false });
  });
});

describe('T-08.4 – caso do artigo, simulação (PRD §6.6, SPEC-08 §5)', () => {
  const s = simulate(ARTICLE_SNAPSHOT, ARTICLE_SIMULATION);
  const byKey = Object.fromEntries(s.factors.map((f) => [f.key, f]));

  it('IRE 0,19 → 0,38 e ΔIRE 0,185', () => {
    eq(s.current.ire.rounded, '0.19');
    eq(s.projected.ire.raw, '0.3775');
    eq(s.projected.ire.rounded, '0.38');
    expect(s.projected.ire.band).toBe(2);
    eq(s.deltaIre, '0.185');
  });

  it('ΔC {cr 0,12; cp 0,05; ne 0,015; lf 0}', () => {
    eq(byKey.cr!.delta, '0.12');
    close(byKey.cp!.delta, '0.05', 12);
    close(byKey.ne!.delta, '0.015', 12);
    eq(byKey.lf!.delta, '0');
  });

  it('π {64,9%; 27,0%; 8,1%; 0} e principais cr + cp', () => {
    close(byKey.cr!.share!, '0.6486');
    close(byKey.cp!.share!, '0.2703');
    close(byKey.ne!.share!, '0.0811');
    eq(byKey.lf!.share!, '0');
    expect(s.factors.filter((f) => f.isMain).map((f) => f.key)).toEqual(['cr', 'cp']);
    expect(byKey.lf!.unchanged).toBe(true);
  });

  it('AGRAVAMENTO com severidade 2, renda residual 3000 e custo 1200', () => {
    expect(s.outcome).toBe('AGRAVAMENTO');
    expect(s.alertSeverity).toBe(2);
    eq(s.residualIncomeAfter, '3000');
    eq(s.financialCost, '1200');
  });

  it('gera exatamente a frase do artigo', () => {
    expect(s.explanation).toBe(
      'Esta compra elevaria o comprometimento da sua renda com dívidas de 10,0% para 25,0% e reduziria sua folga mensal de R$ 1.600,00 para R$ 1.000,00. Esses fatores respondem por 91,9% do aumento do risco.',
    );
  });
});
