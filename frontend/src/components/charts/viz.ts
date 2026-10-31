import { formatDecimal, formatMoney } from '../../lib/format';

/*
 * Utilitários dos gráficos (método do skill dataviz): uma escala por gráfico, rótulos só
 * no fim/extremos, cores categóricas em ordem fixa (--series-1..3) e texto sempre em tokens de texto.
 */

export const SERIES_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-07" → "07/26" (eixo). */
export const monthShort = (d: string) => `${d.slice(5, 7)}/${d.slice(2, 4)}`;
/** "2026-07" → "jul/26" (texto corrido e tooltip). */
export const monthName = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]}/${d.slice(2, 4)}`;

export const pct = (v: number, places = 1) => `${formatDecimal(String(v), places)}%`;
export const pp = (v: number) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatDecimal(String(Math.abs(v)), 1)} p.p.`;

/** Série de qualquer origem: pública (com fonte e data) ou calculada com os dados do usuário. */
export interface VizSeries {
  id: string;
  name: string;
  unit?: string;
  source?: string;
  url?: string;
  extractedAt?: string;
  points: { date: string; value: string }[];
}

export const money = (v: number) => formatMoney(String(v));
/** Variação em reais com sinal: "+R$ 400,00". */
export const moneyDelta = (v: number) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatMoney(String(Math.abs(v)))}`;
/** Eixo em reais, compacto: "R$ 2 mil", "R$ 1,5 mil", "R$ 800". */
export function moneyAxis(v: number): string {
  if (Math.abs(v) >= 1000) {
    const k = v / 1000;
    return `R$ ${formatDecimal(String(k), Number.isInteger(k) ? 0 : 1)} mil`;
  }
  return `R$ ${formatDecimal(String(v), 0)}`;
}
/** Índice de 0 a 1: "0,19". */
export const index01 = (v: number) => formatDecimal(String(v), 2);

export interface Point {
  date: string;
  value: number;
}

export const toPoints = (s: VizSeries): Point[] =>
  s.points.map((p) => ({ date: p.date, value: Number(p.value) }));

export function extremes(points: Point[]) {
  let max = points[0]!;
  let min = points[0]!;
  for (const p of points) {
    if (p.value > max.value) max = p;
    if (p.value < min.value) min = p;
  }
  return { max, min };
}

/** Frase neutra do que mudou no período (sem julgar: subir não é "bom" nem "ruim"). */
export function describeChange(name: string, points: Point[]): string {
  if (points.length < 2) return '';
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const delta = last.value - first.value;
  const from = `de ${monthName(first.date)} a ${monthName(last.date)}`;
  if (Math.abs(delta) < 0.05) return `${name}: ficou estável em ${pct(last.value)} ${from}.`;
  return `${name}: ${delta > 0 ? 'subiu' : 'caiu'} ${pp(delta).replace(/^[+−]/, '')} ${from} (de ${pct(first.value)} para ${pct(last.value)}).`;
}

/** Eixo Y com marcas "redondas" (passo 1, 2, 2,5 ou 5 × 10ⁿ) e casas que não repetem rótulos. */
export function yScale(values: number[], count = 5) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || Math.abs(hi) * 0.1 || 1;
  const raw = span / (count - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw) ?? 10 * mag;
  // Começa no zero quando os dados são positivos; aceita negativos (ex.: mês sem sobra).
  const start = lo >= 0 ? Math.max(0, Math.floor(lo / step) * step) : Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
  return {
    domain: [ticks[0]!, ticks[ticks.length - 1]!] as [number, number],
    ticks,
    places: step < 1 ? (step < 0.5 && step !== 0.25 ? 2 : 1) : 0,
  };
}
