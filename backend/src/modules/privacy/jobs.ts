import cron from 'node-cron';
import type { Clock } from '../../lib/clock.js';
import type { Logger } from '../../lib/logger.js';
import type { PrismaClient } from '../../lib/prisma.js';
import type { PrivacyService } from './service.js';

const DAY = 24 * 60 * 60 * 1000;
const monthsAgo = (now: Date, months: number) => {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
};

export interface RetentionDeps {
  prisma: PrismaClient;
  clock: Clock;
  logger: Logger;
  privacy: PrivacyService;
}

/** Regras de retenção da SPEC-10 §3. Cada job loga só a contagem. */
export async function runRetentionJobs(deps: RetentionDeps): Promise<Record<string, number>> {
  const { prisma, clock, logger, privacy } = deps;
  const now = clock.now();
  const counts: Record<string, number> = {};

  const inactive = await prisma.user.findMany({
    where: { lastLoginAt: { lt: monthsAgo(now, 12) } },
    select: { id: true },
  });
  for (const { id } of inactive) await privacy.deleteAccount(id);
  counts.purgeInactiveAccounts = inactive.length;

  counts.purgeOldSimulations = (
    await prisma.simulation.deleteMany({ where: { createdAt: { lt: monthsAgo(now, 12) } } })
  ).count;
  counts.purgeAudit = (
    await prisma.auditLog.deleteMany({ where: { occurredAt: { lt: monthsAgo(now, 6) } } })
  ).count;
  counts.purgeOrphanAcceptances = (
    await prisma.termsAcceptance.deleteMany({
      where: { userId: null, acceptedAt: { lt: monthsAgo(now, 6) } },
    })
  ).count;
  counts.purgeBackupDeletionList = (
    await prisma.pendingBackupDeletion.deleteMany({
      where: { deletedAt: { lt: new Date(now.getTime() - 30 * DAY) } },
    })
  ).count;

  logger.info({ retention: counts }, 'jobs de retenção');
  return counts;
}

/** Todo dia às 03:00 em São Paulo, dentro da API (node-cron). */
export function scheduleRetention(deps: RetentionDeps): void {
  cron.schedule(
    '0 3 * * *',
    () => {
      runRetentionJobs(deps).catch((err: unknown) => {
        deps.logger.error({ err: { name: (err as Error).name } }, 'falha nos jobs de retenção');
      });
    },
    { timezone: 'America/Sao_Paulo' },
  );
}

/** Depois de restaurar um backup: apaga de novo quem tinha pedido exclusão (SPEC-10 §4). */
export async function reapplyDeletions(prisma: PrismaClient): Promise<number> {
  const pending = await prisma.pendingBackupDeletion.findMany({ select: { userId: true } });
  let removed = 0;
  for (const { userId } of pending) {
    await prisma.$transaction(async (tx) => {
      await tx.termsAcceptance.updateMany({ where: { userId }, data: { userId: null } });
      await tx.auditLog.updateMany({ where: { userId }, data: { userId: null } });
      removed += (await tx.user.deleteMany({ where: { id: userId } })).count;
    });
  }
  return removed;
}
