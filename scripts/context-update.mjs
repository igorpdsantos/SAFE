#!/usr/bin/env node
// Séries públicas da aba "Entenda os dados" (SPEC-14 §2). Rodado À MÃO pela equipe, nunca pelo
// navegador do usuário (SEGURANCA_LGPD §6.2: nenhuma requisição a terceiros a partir do SAFE).
//
//   npm run context:update             baixa as séries do BCB (últimos 5 anos) e regenera o módulo
//   npm run context:update -- --offline  só regenera o módulo a partir dos CSVs (ex.: depois de
//                                        acrescentar um mês à peic.csv)
//
// A peic.csv é mantida à mão: acrescente uma linha por mês com os números da publicação da CNC.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'backend', 'data', 'context');
const generated = join(root, 'backend', 'src', 'modules', 'context', 'series.generated.ts');
const offline = process.argv.includes('--offline');
const YEARS = 5;

const BCB = [
  {
    file: 'bcb-29037.csv',
    code: 29037,
    unit: '% da renda acumulada em 12 meses',
    name: 'Endividamento das famílias com o Sistema Financeiro Nacional',
  },
  {
    file: 'bcb-29265.csv',
    code: 29265,
    unit: '% da renda mensal (média móvel de 3 meses)',
    name: 'Comprometimento da renda das famílias com o serviço da dívida',
  },
  // SPEC-14 deixava 432 ou 4189 em aberto: 4189 é mensal, como as demais (e é a do dashboard da equipe).
  {
    file: 'selic.csv',
    code: 4189,
    unit: '% ao ano',
    name: 'Taxa Selic efetiva acumulada no mês, anualizada (base 252)',
  },
];

// Séries que a API entrega: arquivo + coluna (a peic.csv tem quatro colunas).
const SERIES = [
  {
    id: 'peic_endividadas',
    file: 'peic.csv',
    column: 'endividadas',
    name: 'Famílias com dívidas',
    unit: '% das famílias',
  },
  {
    id: 'peic_em_atraso',
    file: 'peic.csv',
    column: 'em_atraso',
    name: 'Famílias com contas ou dívidas em atraso',
    unit: '% das famílias',
  },
  {
    id: 'peic_sem_condicao',
    file: 'peic.csv',
    column: 'sem_condicao_de_pagar',
    name: 'Famílias que dizem não ter como pagar o que está atrasado',
    unit: '% das famílias',
  },
  {
    id: 'peic_renda_comprometida',
    file: 'peic.csv',
    column: 'renda_comprometida',
    name: 'Parte da renda comprometida com dívidas, segundo as famílias',
    unit: '% da renda',
  },
  // Tipos de dívida (a família pode ter mais de um; a soma passa de 100%).
  {
    id: 'peic_tipo_cartao_de_credito',
    file: 'peic.csv',
    column: 'cartao_de_credito',
    name: 'Cartão de crédito',
    unit: '% das famílias endividadas',
  },
  {
    id: 'peic_tipo_carne',
    file: 'peic.csv',
    column: 'carne',
    name: 'Carnê',
    unit: '% das famílias endividadas',
  },
  {
    id: 'peic_tipo_credito_pessoal',
    file: 'peic.csv',
    column: 'credito_pessoal',
    name: 'Crédito pessoal',
    unit: '% das famílias endividadas',
  },
  {
    id: 'peic_tipo_financiamento_de_casa',
    file: 'peic.csv',
    column: 'financiamento_de_casa',
    name: 'Financiamento de casa',
    unit: '% das famílias endividadas',
  },
  {
    id: 'peic_tipo_financiamento_de_carro',
    file: 'peic.csv',
    column: 'financiamento_de_carro',
    name: 'Financiamento de carro',
    unit: '% das famílias endividadas',
  },
  {
    id: 'peic_tipo_consignado',
    file: 'peic.csv',
    column: 'consignado',
    name: 'Consignado',
    unit: '% das famílias endividadas',
  },
  {
    id: 'peic_tipo_cheque_especial',
    file: 'peic.csv',
    column: 'cheque_especial',
    name: 'Cheque especial',
    unit: '% das famílias endividadas',
  },
  {
    id: 'peic_tipo_outras_dividas',
    file: 'peic.csv',
    column: 'outras_dividas',
    name: 'Outras dívidas',
    unit: '% das famílias endividadas',
  },
  {
    id: 'peic_tipo_cheque_pre_datado',
    file: 'peic.csv',
    column: 'cheque_pre_datado',
    name: 'Cheque pré-datado',
    unit: '% das famílias endividadas',
  },
  {
    id: 'bcb_endividamento',
    file: 'bcb-29037.csv',
    column: 'valor',
    name: 'Dívidas das famílias em relação à renda de 12 meses',
    unit: '% da renda de 12 meses',
  },
  {
    id: 'bcb_comprometimento',
    file: 'bcb-29265.csv',
    column: 'valor',
    name: 'Parte da renda mensal que vai para parcelas',
    unit: '% da renda mensal',
  },
  {
    id: 'bcb_selic',
    file: 'selic.csv',
    column: 'valor',
    name: 'Taxa básica de juros (Selic)',
    unit: '% ao ano',
  },
];

const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const br = (d) =>
  `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;

async function fetchSeries(code) {
  const start = new Date(Date.UTC(today.getUTCFullYear() - YEARS, today.getUTCMonth(), 1));
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${br(start)}&dataFinal=${br(today)}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // A API do BCB recusa requisições sem identificação.
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (SAFE TCC context:update)' },
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();
      return rows.map((r) => {
        const [, m, y] = r.data.split('/');
        return { date: `${y}-${m}`, value: Number(String(r.valor).replace(',', '.')).toFixed(2) };
      });
    } catch (err) {
      if (attempt === 3) throw new Error(`série ${code}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  return [];
}

/** Lê um CSV com cabeçalho "# chave: valor", linha de colunas e dados. */
function readCsv(file) {
  const meta = {};
  const rows = [];
  let columns = null;
  for (const line of readFileSync(join(dir, file), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    if (line.startsWith('#')) {
      const [k, ...v] = line.slice(1).split(':');
      meta[k.trim()] = v.join(':').trim();
    } else if (!columns) columns = line.split(',');
    else rows.push(Object.fromEntries(line.split(',').map((v, i) => [columns[i], v])));
  }
  return { meta, rows };
}

if (!offline) {
  for (const s of BCB) {
    const points = await fetchSeries(s.code);
    const csv = [
      `# fonte: Banco Central do Brasil – SGS, série ${s.code} (${s.name})`,
      `# url: https://api.bcb.gov.br/dados/serie/bcdata.sgs.${s.code}/dados?formato=json`,
      `# extraido_em: ${iso(today)}`,
      `# unidade: ${s.unit}`,
      'data,valor',
      ...points.map((p) => `${p.date},${p.value}`),
    ].join('\n');
    writeFileSync(join(dir, s.file), csv + '\n');
    console.log(`${s.file}: ${points.length} meses (${points[0]?.date} a ${points.at(-1)?.date})`);
  }
}

const series = SERIES.map((s) => {
  const { meta, rows } = readCsv(s.file);
  return {
    id: s.id,
    name: s.name,
    source: meta.fonte,
    url: meta.url,
    extractedAt: meta.extraido_em.slice(0, 10),
    unit: s.unit,
    points: rows.map((r) => ({ date: r.data, value: Number(r[s.column]).toFixed(2) })),
  };
});
writeFileSync(
  generated,
  '// Gerado por scripts/context-update.mjs a partir de backend/data/context/*.csv. Não editar à mão.\n' +
    "import type { ContextSeries } from './types.js';\n\n" +
    `export const CONTEXT_SERIES: ContextSeries[] = ${JSON.stringify(series, null, 2)};\n`,
);
console.log(`módulo gerado: ${series.length} séries`);
