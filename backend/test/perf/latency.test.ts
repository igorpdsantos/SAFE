import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp, closeAll, loginAccepted, resetAll } from '../helpers/app.js';
import { seedArticle } from '../helpers/seed.js';

// T-08.7: medição preliminar do RNF01 (p95 ≤ 1 s). Roda só com PERF=1 para não pesar no CI.
const run = process.env.PERF === '1' ? describe : describe.skip;

function p(values: number[], q: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)]!;
}

run('T-08.7 – latência local de /analysis e /simulations', () => {
  beforeAll(resetAll);
  afterAll(closeAll);

  it('p95 ≤ 1 s', async () => {
    const { app, deps } = buildApp();
    await seedArticle(await loginAccepted(app));
    const time = async (fn: () => Promise<unknown>) => {
      const t0 = performance.now();
      await fn();
      return performance.now() - t0;
    };
    const analysisCold: number[] = [];
    const analysisWarm: number[] = [];
    const sims: number[] = [];
    for (let i = 0; i < 100; i++) {
      await deps.redis.flushdb();
      const fresh = await loginAccepted(app);
      analysisCold.push(await time(() => fresh.agent.get('/api/v1/analysis').expect(200)));
      analysisWarm.push(await time(() => fresh.agent.get('/api/v1/analysis').expect(200)));
      sims.push(
        await time(() =>
          fresh
            .send('post', '/api/v1/simulations')
            .send({ value: '6000.00', installments: 12, installmentValue: '600.00' })
            .expect(200),
        ),
      );
    }
    const report = {
      analysisCold: { p50: p(analysisCold, 0.5), p95: p(analysisCold, 0.95) },
      analysisWarm: { p50: p(analysisWarm, 0.5), p95: p(analysisWarm, 0.95) },
      simulations: { p50: p(sims, 0.5), p95: p(sims, 0.95) },
    };
    process.stderr.write(
      `LATENCY ${JSON.stringify(report, (_k, v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v))}\n`,
    );
    expect(report.analysisCold.p95).toBeLessThan(1000);
    expect(report.simulations.p95).toBeLessThan(1000);
    expect(report.analysisWarm.p95).toBeLessThan(300);
  });
});
