const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parts(date: string): [number, number, number] {
  const m = DATE.exec(date);
  if (!m) throw new Error(`Data inválida (esperado AAAA-MM-DD): ${date}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Meses inteiros completos entre duas datas, mínimo 0 (SPEC-05 §3.7, D-03). */
export function elapsedMonths(from: string, to: string): number {
  const [y1, m1, d1] = parts(from);
  const [y2, m2, d2] = parts(to);
  const months = (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
  return Math.max(months, 0);
}

const MONTHS_PT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/** Rótulo 'mmm/aaaa' do mês `offset` meses depois de `date` (SPEC-06 §2). */
export function monthLabel(date: string, offset: number): string {
  const [y, m] = parts(date);
  const index = y * 12 + (m - 1) + offset;
  return `${MONTHS_PT[index % 12]}/${Math.floor(index / 12)}`;
}
