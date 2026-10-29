// npm run eval:latency [-- --url=http://localhost:3000] — 500 requisições a /analysis e POST /simulations (RNF01).
// Precisa da API em modo de teste (npm run dev:demo), que tem o login de teste.
import { cpus, totalmem } from 'node:os';
import { writeResult } from './lib.js';

const arg = process.argv.find((a) => a.startsWith('--url='));
const BASE = `${arg ? arg.split('=')[1] : 'http://localhost:3000'}/api/v1`;
const ORIGIN = 'http://localhost:5173';
const N = 500;
const jar = new Map<string, string>();
let csrf = '';

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
      Origin: ORIGIN,
      ...(method !== 'GET' ? { 'X-SAFE-CSRF': csrf } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const c of res.headers.getSetCookie()) {
    const [pair = ''] = c.split(';');
    const eq = pair.indexOf('=');
    jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.status === 204 ? null : res.json();
}

const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)]!;
};

/** Uma sessão nova a cada 100 requisições, para ficar dentro do rate limit da API. */
async function freshUser(i: number) {
  jar.clear();
  const login = (await call('POST', '/test/login', {
    email: `latencia-${Date.now()}-${i}@exemplo.com`,
  })) as { csrf: string };
  csrf = login.csrf;
  await call('POST', '/terms/accept', {
    termsVersion: '1.0',
    privacyVersion: '1.0',
    acceptTerms: true,
    acknowledgePrivacy: true,
    ageConfirmed: true,
  });
  await call('POST', '/incomes', { monthValue: '4000.00' });
  await call('POST', '/expenses', { category: 'MORADIA', type: 'FIXA', value: '2000.00' });
  await call('POST', '/debts', {
    category: 'CREDIARIO',
    installmentValue: '400.00',
    remainingInstallments: 10,
    balanceDue: '6000.00',
  });
  await call('POST', '/reserves', { value: '6000.00' });
}

async function measure(label: string, fn: () => Promise<unknown>, perUser: number) {
  const times: number[] = [];
  for (let i = 0; i < N; i++) {
    if (i % perUser === 0) await freshUser(i);
    const t0 = performance.now();
    await fn();
    times.push(performance.now() - t0);
  }
  return {
    endpoint: label,
    n: N,
    mediana_ms: quantile(times, 0.5).toFixed(1),
    p95_ms: quantile(times, 0.95).toFixed(1),
    p99_ms: quantile(times, 0.99).toFixed(1),
  };
}

const rows = [
  await measure('GET /analysis', () => call('GET', '/analysis'), 100),
  await measure(
    'POST /simulations',
    () =>
      call('POST', '/simulations', {
        value: '6000.00',
        installments: 12,
        installmentValue: '600.00',
      }),
    25,
  ),
];
const hw = `${cpus()[0]?.model ?? 'cpu?'} ×${cpus().length}, ${(totalmem() / 2 ** 30).toFixed(0)} GB, Node ${process.version}`;
const file = writeResult(
  'latency',
  rows.map((r) => ({ ...r, hardware: hw })),
  ['endpoint', 'n', 'mediana_ms', 'p95_ms', 'p99_ms', 'hardware'],
);
for (const r of rows)
  console.log(
    `${r.endpoint}: mediana ${r.mediana_ms} ms · p95 ${r.p95_ms} ms · p99 ${r.p99_ms} ms`,
  );
console.log(`Hardware: ${hw}`);
console.log(
  `Critério RNF01 (p95 ≤ 1 s): ${rows.every((r) => Number(r.p95_ms) <= 1000) ? 'atendido' : 'NÃO atendido'}`,
);
console.log(`Resultados → ${file}`);
