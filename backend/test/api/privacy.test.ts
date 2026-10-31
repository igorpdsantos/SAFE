import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { reapplyDeletions, runRetentionJobs } from '../../src/modules/privacy/jobs.js';
import { buildApp, closeAll, infra, login, loginAccepted, resetAll } from '../helpers/app.js';
import { seedArticle } from '../helpers/seed.js';

beforeEach(resetAll);
afterAll(closeAll);

const V = '/api/v1';
const DAY = 24 * 60 * 60 * 1000;

/** Todas as tabelas com coluna user_id e quantas linhas do usuário cada uma tem. */
async function rowsOf(userId: number) {
  const { prisma } = infra();
  const tables = [
    'renda',
    'despesa',
    'divida',
    'reserva_financeira',
    'indicador_financeiro',
    'historico_indicadores',
    'simulacao_financeira',
    'alerta',
    'consentimento_pesquisa',
    'aceitacao_termos',
    'log_auditoria',
    'usuario',
  ];
  const out: Record<string, number> = {};
  for (const t of tables) {
    const r = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*) AS n FROM "${t}" WHERE user_id = $1`,
      userId,
    );
    out[t] = Number(r[0]!.n);
  }
  return out;
}

describe('T-10.6 – GET /me e exportação (SPEC-10 §2)', () => {
  it('GET /me traz e-mail, versões, consentimento e contagens', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app, 'eu@exemplo.com');
    await seedArticle(s);
    const res = await s.agent.get(`${V}/me`).expect(200);
    expect(res.body).toMatchObject({
      email: 'eu@exemplo.com',
      termsVersion: '1.0',
      privacyVersion: '1.0',
      researchConsent: false,
      counts: { incomes: 1, expenses: 1, debts: 1, reserves: 1, simulations: 0, historyPoints: 1 },
    });
  });

  it('exportação: download JSON com tudo do usuário, descrições legíveis, nada de outro usuário, auditada', async () => {
    const { app, deps } = buildApp();
    const a = await loginAccepted(app, 'a@exemplo.com');
    const b = await loginAccepted(app, 'b@exemplo.com');
    await seedArticle(a);
    await a
      .send('post', `${V}/expenses`)
      .send({ category: 'LAZER', type: 'VARIAVEL', value: '100', description: 'Cinema' })
      .expect(201);
    await a
      .send('post', `${V}/simulations`)
      .send({ value: '6000.00', installments: 12, installmentValue: '600.00' })
      .expect(200);
    await b
      .send('post', `${V}/incomes`)
      .send({ monthValue: '999.99', description: 'Do B' })
      .expect(201);

    const res = await a.agent.get(`${V}/me/export`).expect(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="safe-meus-dados-2026-10-29.json"',
    );
    expect(res.headers['cache-control']).toBe('no-store');
    const data = JSON.parse(res.text);
    expect(data.format).toBe('safe-export-v1');
    expect(data.account.email).toBe('a@exemplo.com');
    expect(data.expenses.map((e: { description: string | null }) => e.description)).toContain(
      'Cinema',
    );
    expect(data.debts[0]).toMatchObject({ installmentValue: '400.00', balanceUsed: '6000.00' });
    expect(data.simulations).toHaveLength(1);
    expect(data.history).toHaveLength(1);
    expect(data.currentIndicators.riskIndex).toBe('0.1973'); // caso do artigo + despesa de R$ 100
    expect(res.text).not.toContain('Do B');
    expect(res.text).not.toContain('999.99');
    expect(res.text).not.toContain('oauth');
    expect(res.text).not.toContain('tokenId');
    expect(
      await deps.prisma.auditLog.count({ where: { operation: 'EXPORT', userId: a.userId } }),
    ).toBe(1);
  });

  it('exportar e excluir funcionam sem termos em dia', async () => {
    const { app } = buildApp();
    const s = await login(app);
    await s.agent.get(`${V}/me/export`).expect(200);
    await s.send('delete', `${V}/me`).send({ confirm: 'EXCLUIR' }).expect(204);
  });

  it('rate limit: 6ª exportação na hora → 429', async () => {
    const { app } = buildApp();
    const s = await login(app);
    for (let i = 0; i < 5; i++) await s.agent.get(`${V}/me/export`).expect(200);
    expect((await s.agent.get(`${V}/me/export`)).status).toBe(429);
  });
});

describe('T-10.6 – exclusão da conta (SPEC-10 §2.2)', () => {
  it('confirm ausente ou diferente de EXCLUIR → 400 e nada apagado', async () => {
    const { app, deps } = buildApp();
    const s = await loginAccepted(app);
    for (const body of [{}, { confirm: 'excluir' }, { confirm: 'SIM' }]) {
      const res = await s.send('delete', `${V}/me`).send(body);
      expect(res.status).toBe(400);
    }
    expect(await deps.prisma.user.count()).toBe(1);
  });

  it('sem CSRF → 403', async () => {
    const { app } = buildApp();
    const s = await loginAccepted(app);
    expect((await s.agent.delete(`${V}/me`).send({ confirm: 'EXCLUIR' })).status).toBe(403);
  });

  it('apaga tudo: nenhuma linha com o user_id, registro mínimo sem e-mail, nada no Redis, cookie antigo → 401', async () => {
    const { app, deps } = buildApp();
    const keep = await loginAccepted(app, 'fica@exemplo.com');
    await seedArticle(keep);
    const s = await loginAccepted(app, 'sai@exemplo.com');
    await s.send('put', `${V}/me/research-consent`).send({ granted: true }).expect(200);
    await seedArticle(s);
    await s
      .send('post', `${V}/simulations`)
      .send({ value: '6000.00', installments: 12, installmentValue: '600.00' })
      .expect(200);
    await s.agent.get(`${V}/analysis`).expect(200);
    const other = await loginAccepted(app, 'sai@exemplo.com'); // segunda sessão do mesmo usuário

    const res = await s.send('delete', `${V}/me`).send({ confirm: 'EXCLUIR' }).expect(204);
    expect(res.headers['clear-site-data']).toBe('"cache", "cookies", "storage"');

    expect(Object.values(await rowsOf(s.userId)).every((n) => n === 0)).toBe(true);
    const orphans = await deps.prisma.termsAcceptance.count({ where: { userId: null } });
    expect(orphans).toBe(1);
    const deleted = await deps.prisma.auditLog.findFirstOrThrow({
      where: { operation: 'ACCOUNT_DELETED' },
    });
    expect(deleted).toMatchObject({ userId: null, entity: 'usuario', entityId: s.userId });
    expect(JSON.stringify(await deps.prisma.auditLog.findMany())).not.toContain('sai@exemplo.com');
    expect(await deps.prisma.pendingBackupDeletion.count({ where: { userId: s.userId } })).toBe(1);

    const keys = await infra().redis.keys('*');
    // Compara o segmento inteiro: `includes(':2')` também casaria com `sess:29105f…` de outro usuário.
    expect(keys.filter((k) => k.split(':').includes(String(s.userId)))).toEqual([]);
    const sessionUsers = await Promise.all(
      keys
        .filter((k) => k.startsWith('sess:'))
        .map(async (k) => JSON.parse((await infra().redis.get(k))!).userId),
    );
    expect(sessionUsers).not.toContain(s.userId);

    await s.agent.get(`${V}/auth/me`).expect(401);
    await other.agent.get(`${V}/auth/me`).expect(401);
    // O outro usuário segue intacto.
    expect((await keep.agent.get(`${V}/incomes`)).body.items).toHaveLength(1);
  });
});

describe('T-10.3 – jobs de retenção (relógio falso)', () => {
  it('conta inativa há 12 meses + 1 dia é apagada; com 11 meses, não', async () => {
    const { app, deps, clock } = buildApp();
    const old = await loginAccepted(app, 'antiga@exemplo.com');
    const recent = await loginAccepted(app, 'recente@exemplo.com');
    await deps.prisma.user.update({
      where: { id: old.userId },
      data: { lastLoginAt: new Date(clock.now().getTime() - 365 * DAY - 2 * DAY) },
    });
    await deps.prisma.user.update({
      where: { id: recent.userId },
      data: { lastLoginAt: new Date(clock.now().getTime() - 335 * DAY) },
    });
    const counts = await runRetentionJobs(deps);
    expect(counts.purgeInactiveAccounts).toBe(1);
    expect(await deps.prisma.user.findUnique({ where: { id: old.userId } })).toBeNull();
    expect(await deps.prisma.user.findUnique({ where: { id: recent.userId } })).not.toBeNull();
  });

  it('simulações > 12 meses, auditoria > 6 meses, aceites órfãos > 6 meses e lista de backup > 30 dias', async () => {
    const { app, deps, clock } = buildApp();
    const s = await loginAccepted(app);
    await seedArticle(s);
    await s
      .send('post', `${V}/simulations`)
      .send({ value: '6000.00', installments: 12, installmentValue: '600.00' })
      .expect(200);
    await s
      .send('post', `${V}/simulations`)
      .send({ value: '6000.00', installments: 12, installmentValue: '600.00' })
      .expect(200);
    const [oldSim] = await deps.prisma.simulation.findMany({ orderBy: { id: 'asc' } });
    await deps.prisma.simulation.update({
      where: { id: oldSim!.id },
      data: { createdAt: new Date('2025-10-01T00:00:00Z') },
    });
    await deps.prisma.auditLog.updateMany({
      where: { operation: 'LOGIN' },
      data: { occurredAt: new Date('2026-04-01T00:00:00Z') },
    });
    await deps.prisma.termsAcceptance.create({
      data: {
        userId: null,
        termsVersion: '0.9',
        privacyVersion: '0.9',
        ageConfirmed: true,
        acceptedAt: new Date('2026-03-01T00:00:00Z'),
        tokenId: '00000000-0000-4000-8000-000000000000',
      },
    });
    await deps.prisma.pendingBackupDeletion.createMany({
      data: [
        { userId: 9001, deletedAt: new Date(clock.now().getTime() - 31 * DAY) },
        { userId: 9002, deletedAt: new Date(clock.now().getTime() - 29 * DAY) },
      ],
    });
    const counts = await runRetentionJobs(deps);
    expect(counts).toMatchObject({
      purgeOldSimulations: 1,
      purgeOrphanAcceptances: 1,
      purgeBackupDeletionList: 1,
    });
    expect(counts.purgeAudit).toBeGreaterThanOrEqual(1);
    expect(await deps.prisma.simulation.count()).toBe(1);
    expect((await deps.prisma.pendingBackupDeletion.findMany()).map((p) => p.userId)).toEqual([
      9002,
    ]);
    expect(await deps.prisma.termsAcceptance.count({ where: { userId: s.userId } })).toBe(1);
  });
});

describe('T-10.4 – privacy:reapply-deletions', () => {
  it('apaga de novo os usuários restaurados que estão na lista', async () => {
    const { app, deps } = buildApp();
    const gone = await loginAccepted(app, 'restaurado@exemplo.com');
    const stays = await loginAccepted(app, 'fica@exemplo.com');
    await seedArticle(gone);
    // Simula a restauração: o usuário voltou do backup, mas está na lista de exclusões.
    await deps.prisma.pendingBackupDeletion.create({
      data: { userId: gone.userId, deletedAt: new Date() },
    });
    expect(await reapplyDeletions(deps.prisma)).toBe(1);
    expect(Object.values(await rowsOf(gone.userId)).every((n) => n === 0)).toBe(true);
    expect(await deps.prisma.user.findUnique({ where: { id: stays.userId } })).not.toBeNull();
  });
});
