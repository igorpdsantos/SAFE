import { Decimal } from '../../engine/decimal.js';
import { audit } from '../../lib/audit.js';
import { cacheKeys } from '../../lib/cache.js';
import { businessDate, type Clock } from '../../lib/clock.js';
import type { Logger } from '../../lib/logger.js';
import type { PrismaClient } from '../../lib/prisma.js';
import type { Redis } from '../../lib/redis.js';
import type { SessionStore } from '../auth/sessions.js';
import type { BudgetService } from '../budget/service.js';

const dec = (v: { toString(): string } | null) =>
  v === null ? null : new Decimal(v.toString()).toString();
const iso = (d: Date | null) => d?.toISOString() ?? null;
const day = (d: Date) => d.toISOString().slice(0, 10);

/** Direitos do titular (SPEC-10): ver, exportar e apagar. Nada aqui exige termos em dia. */
export class PrivacyService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
    private readonly sessions: SessionStore,
    private readonly budget: BudgetService,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  async me(userId: number) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const [
      acceptance,
      consent,
      incomes,
      expenses,
      debts,
      reserves,
      simulations,
      historyPoints,
      alerts,
    ] = await Promise.all([
      this.prisma.termsAcceptance.findFirst({ where: { userId }, orderBy: { acceptedAt: 'desc' } }),
      this.prisma.researchConsent.findFirst({ where: { userId, revokedAt: null } }),
      this.prisma.income.count({ where: { userId } }),
      this.prisma.expense.count({ where: { userId } }),
      this.prisma.debt.count({ where: { userId } }),
      this.prisma.reserve.count({ where: { userId } }),
      this.prisma.simulation.count({ where: { userId } }),
      this.prisma.historyEntry.count({ where: { userId } }),
      this.prisma.alert.count({ where: { userId } }),
    ]);
    return {
      email: user.email,
      createdAt: iso(user.createdAt),
      lastLoginAt: iso(user.lastLoginAt),
      termsAcceptedAt: iso(acceptance?.acceptedAt ?? null),
      termsVersion: acceptance?.termsVersion ?? null,
      privacyVersion: acceptance?.privacyVersion ?? null,
      researchConsent: consent !== null,
      counts: { incomes, expenses, debts, reserves, simulations, historyPoints, alerts },
    };
  }

  /** Portabilidade (RNF11): tudo do usuário, descrições legíveis; gerado na hora e auditado. */
  async export(userId: number) {
    const now = this.clock.now();
    const [user, acceptances, consents, indicator, history, simulations, alerts] =
      await Promise.all([
        this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
        this.prisma.termsAcceptance.findMany({ where: { userId }, orderBy: { acceptedAt: 'asc' } }),
        this.prisma.researchConsent.findMany({ where: { userId }, orderBy: { grantedAt: 'asc' } }),
        this.prisma.indicator.findUnique({ where: { userId } }),
        this.prisma.historyEntry.findMany({ where: { userId }, orderBy: { recordDate: 'asc' } }),
        this.prisma.simulation.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
        this.prisma.alert.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      ]);
    const data = {
      exportedAt: now.toISOString(),
      format: 'safe-export-v1',
      account: { email: user.email, createdAt: iso(user.createdAt) },
      acceptances: acceptances.map((a) => ({
        termsVersion: a.termsVersion,
        privacyVersion: a.privacyVersion,
        ageConfirmed: a.ageConfirmed,
        acceptedAt: iso(a.acceptedAt),
      })),
      researchConsent: consents.map((c) => ({
        grantedAt: iso(c.grantedAt),
        revokedAt: iso(c.revokedAt),
        textVersion: c.textVersion,
      })),
      incomes: await this.budget.list(userId, 'incomes'),
      expenses: await this.budget.list(userId, 'expenses'),
      debts: await this.budget.list(userId, 'debts'),
      reserves: await this.budget.list(userId, 'reserves'),
      currentIndicators: indicator && {
        incomeCommitmentPercent: dec(indicator.rentPerc),
        debtLevel: dec(indicator.debtLevel),
        liquidity: dec(indicator.financialLiquidity),
        paymentCapacity: dec(indicator.paymentsCapacity),
        riskIndex: dec(indicator.riskIndex),
        riskBand: indicator.riskLevel,
        calculatedAt: iso(indicator.calculatedAt),
      },
      history: history.map((h) => ({
        date: day(h.recordDate),
        riskIndex: dec(h.risk),
        riskBand: h.riskLevel,
      })),
      simulations: simulations.map((s) => ({
        createdAt: iso(s.createdAt),
        value: dec(s.simulatedValue),
        installments: s.installments,
        installmentValue: dec(s.installmentValue),
        currentRisk: dec(s.currentRisk),
        estimatedRisk: dec(s.estimatedRisk),
        outcome: s.outcome,
        state: s.state,
        rating: s.rating,
      })),
      alerts: alerts.map((a) => ({
        type: a.type,
        severity: a.severity,
        message: a.description,
        status: a.status,
        createdAt: iso(a.createdAt),
      })),
    };
    await audit(this.prisma, {
      userId,
      operation: 'EXPORT',
      entity: 'usuario',
      entityId: userId,
      at: now,
    });
    return { filename: `safe-meus-dados-${businessDate(now)}.json`, data };
  }

  /** Exclusão definitiva (SPEC-10 §2.2): transação + sessões + cache + chaves do Redis. */
  async deleteAccount(userId: number): Promise<void> {
    const at = this.clock.now();
    await this.prisma.$transaction(async (tx) => {
      await tx.termsAcceptance.updateMany({ where: { userId }, data: { userId: null } });
      await tx.auditLog.updateMany({ where: { userId }, data: { userId: null } });
      await audit(tx, {
        userId: null,
        operation: 'ACCOUNT_DELETED',
        entity: 'usuario',
        entityId: userId,
        at,
      });
      await tx.pendingBackupDeletion.upsert({
        where: { userId },
        create: { userId, deletedAt: at },
        update: { deletedAt: at },
      });
      await tx.user.delete({ where: { id: userId } });
    });
    const hashes = await this.redis.smembers(`user_sessions:${userId}`);
    await this.sessions.destroyAllSessions(userId);
    await this.redis.del(
      cacheKeys.analysis(userId),
      cacheKeys.projection(userId),
      `rl:export:${userId}`,
      `rl:delete:${userId}`,
      ...hashes.flatMap((h) => [`rl:api:sess:${h}`, `rl:sim:sess:${h}`]),
    );
    this.logger.info({ event: 'account_deleted' }, 'conta excluída');
  }
}
