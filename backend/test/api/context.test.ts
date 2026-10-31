import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { CONTEXT_SERIES } from '../../src/modules/context/series.generated.js';
import { buildApp, closeAll, resetAll } from '../helpers/app.js';

beforeEach(resetAll);
afterAll(closeAll);

const URL = '/api/v1/context/series';
const DIR = join(__dirname, '..', '..', 'data', 'context');

/** Mesmo formato que o scripts/context-update.mjs lê. */
function readCsv(file: string) {
  const meta: Record<string, string> = {};
  const rows: Record<string, string>[] = [];
  let cols: string[] | null = null;
  for (const line of readFileSync(join(DIR, file), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    if (line.startsWith('#')) {
      const [k, ...v] = line.slice(1).split(':');
      meta[k!.trim()] = v.join(':').trim();
    } else if (!cols) cols = line.split(',');
    else rows.push(Object.fromEntries(line.split(',').map((v, i) => [cols![i], v])));
  }
  return { meta, rows };
}

describe('T-14.1 – dados de contexto versionados (SPEC-14 §2)', () => {
  it('cada CSV tem fonte, url, data de extração e unidade no cabeçalho', () => {
    for (const f of ['peic.csv', 'bcb-29037.csv', 'bcb-29265.csv', 'selic.csv']) {
      const { meta, rows } = readCsv(f);
      expect(Object.keys(meta).sort(), f).toEqual(['extraido_em', 'fonte', 'unidade', 'url']);
      expect(rows.length, f).toBeGreaterThan(0);
    }
  });

  it('o módulo gerado bate com os CSVs (rodar npm run context:update -- --offline se mudar)', () => {
    const peic = readCsv('peic.csv');
    const end = CONTEXT_SERIES.find((s) => s.id === 'peic_endividadas')!;
    expect(end.points).toEqual(
      peic.rows.map((r) => ({ date: r.data, value: Number(r.endividadas).toFixed(2) })),
    );
    const selic = readCsv('selic.csv');
    const s = CONTEXT_SERIES.find((x) => x.id === 'bcb_selic')!;
    expect(s.points).toEqual(selic.rows.map((r) => ({ date: r.data, value: r.valor })));
    expect(s.extractedAt).toBe(selic.meta.extraido_em!.slice(0, 10));
    const cartao = CONTEXT_SERIES.find((x) => x.id === 'peic_tipo_cartao_de_credito')!;
    expect(cartao.points.at(-1)).toEqual({ date: '2026-07', value: '85.30' });
  });
});

describe('T-14.2 – GET /context/series (SPEC-14 §3)', () => {
  it('é público e devolve as 16 séries com fonte, unidade, data de extração e pontos', async () => {
    const { app } = buildApp();
    const res = await request(app).get(URL).expect(200);
    expect(res.body.series.map((s: { id: string }) => s.id)).toEqual([
      'peic_endividadas',
      'peic_em_atraso',
      'peic_sem_condicao',
      'peic_renda_comprometida',
      'peic_tipo_cartao_de_credito',
      'peic_tipo_carne',
      'peic_tipo_credito_pessoal',
      'peic_tipo_financiamento_de_casa',
      'peic_tipo_financiamento_de_carro',
      'peic_tipo_consignado',
      'peic_tipo_cheque_especial',
      'peic_tipo_outras_dividas',
      'peic_tipo_cheque_pre_datado',
      'bcb_endividamento',
      'bcb_comprometimento',
      'bcb_selic',
    ]);
    const peic = res.body.series[0];
    expect(peic).toMatchObject({
      name: 'Famílias com dívidas',
      unit: '% das famílias',
      extractedAt: '2026-10-31',
    });
    expect(peic.source).toContain('CNC');
    expect(peic.points.at(-1)).toEqual({ date: '2026-07', value: '82.00' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('from e to filtram os meses (inclusive)', async () => {
    const { app } = buildApp();
    const res = await request(app).get(`${URL}?from=2026-01&to=2026-03`).expect(200);
    const peic = res.body.series.find((s: { id: string }) => s.id === 'peic_endividadas');
    expect(peic.points.map((p: { date: string }) => p.date)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
  });

  it.each(['from=2026-13', 'from=26-01', 'to=abc', 'from=2026-05&to=2026-01'])(
    '%s → 400',
    async (qs) => {
      const { app } = buildApp();
      const res = await request(app).get(`${URL}?${qs}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    },
  );
});
