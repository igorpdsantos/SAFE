// Estatística da PA1 (SPEC-12 §3), sem depender de Python.

/** Postos com empates pela média (1 = menor). */
export function ranks(values: readonly number[]): number[] {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = new Array<number>(values.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1]!.v === order[i]!.v) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[order[k]!.i] = avg;
    i = j + 1;
  }
  return out;
}

function pearson(x: readonly number[], y: readonly number[]): number {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i]! - mx) * (y[i]! - my);
    sxx += (x[i]! - mx) ** 2;
    syy += (y[i]! - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? Number.NaN : sxy / Math.sqrt(sxx * syy);
}

/** Spearman ρ com empates: Pearson dos postos médios. */
export function spearman(x: readonly number[], y: readonly number[]): number {
  if (x.length !== y.length || x.length < 2)
    throw new Error('Listas de tamanhos diferentes ou curtas demais');
  return pearson(ranks(x), ranks(y));
}

/** Kappa de Cohen com pesos quadráticos para categorias 1..k. */
export function weightedKappa(a: readonly number[], b: readonly number[], k = 5): number {
  if (a.length !== b.length || a.length === 0) throw new Error('Listas inválidas');
  const n = a.length;
  const obs = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  for (let i = 0; i < n; i++) obs[a[i]! - 1]![b[i]! - 1]!++;
  const ra = obs.map((row) => row.reduce((s, v) => s + v, 0));
  const cb = obs[0]!.map((_, j) => obs.reduce((s, row) => s + row[j]!, 0));
  let num = 0;
  let den = 0;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      const w = (i - j) ** 2 / (k - 1) ** 2;
      num += w * obs[i]![j]!;
      den += (w * ra[i]! * cb[j]!) / n;
    }
  }
  return den === 0 ? 1 : 1 - num / den;
}

export function median(values: readonly number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}
