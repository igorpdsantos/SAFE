// Formatação pt-BR para exibir valores que chegam da API como string (SPEC-11 §5).
// Nenhuma conta é feita aqui: o backend calcula, o frontend só mostra.

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const BRL_SPACE = /\u00a0/g;

/** "1600.00" → "R$ 1.600,00" */
export function formatMoney(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return money.format(Number(value)).replace(BRL_SPACE, ' ');
}

/** "0.25" → "25,0%" */
export function formatPercent(ratio: string, places = 1): string {
  return `${(Number(ratio) * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  })}%`;
}

/** "0.19" → "0,19" */
export function formatDecimal(value: string, places = 2): string {
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });
}

/** "2026-10-29" ou ISO → "29/10/2026" */
export function formatDate(value: string): string {
  const [y, m, d] = value.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** Valor digitado (só dígitos, em centavos) → texto exibido "1.234,56". */
export function centsToDisplay(cents: string): string {
  if (cents === '') return '';
  const n = cents.replace(/^0+(?=\d)/, '').padStart(3, '0');
  const int = n.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${int},${n.slice(-2)}`;
}

/** Centavos → string da API "1234.56". */
export function centsToApi(cents: string): string {
  if (cents === '') return '';
  const n = cents.replace(/^0+(?=\d)/, '').padStart(3, '0');
  return `${n.slice(0, -2)}.${n.slice(-2)}`;
}

/** String da API "1234.5" → centavos "123450". */
export function apiToCents(value: string): string {
  if (value === '') return '';
  const [int = '0', frac = ''] = value.split('.');
  return `${int}${frac.padEnd(2, '0').slice(0, 2)}`.replace(/^0+(?=\d)/, '');
}
