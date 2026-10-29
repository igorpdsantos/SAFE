import { DEFAULT_CONFIG } from '../../engine/config.js';
import { Decimal } from '../../engine/decimal.js';
import { diagnose } from '../../engine/diagnose.js';
import { InsufficientDataError } from '../../engine/errors.js';
import type { Diagnosis } from '../../engine/types.js';
import { cacheKeys, readCache, writeCache } from '../../lib/cache.js';
import { businessDate, type Clock } from '../../lib/clock.js';
import { AppError } from '../../lib/errors.js';
import type { PrismaClient } from '../../lib/prisma.js';
import type { Redis } from '../../lib/redis.js';
import type { BudgetService } from '../budget/service.js';
import { ALL_ALERT_TYPES, alertMessage, requiredAlerts } from './alerts.js';
import { factorsDto, indicatorsDto, ireDto, totalsDto } from './present.js';

/** Limita o valor ao que a coluna NUMERIC aceita (renda minúscula pode gerar razões enormes). */
function fitColumn(value: Decimal, integerDigits: number, places = 4): string {
  const max = new Decimal(10).pow(integerDigits).minus(new Decimal(10).pow(-places));
  return Decimal.min(Decimal.max(value, max.negated()), max).toFixed(places);
}

export const noIncomeError = (
  message = 'Cadastre sua renda para calcularmos seu índice de risco.',
) => new AppError('INSUFFICIENT_DATA', 409, message, { income: 'Cadastre sua renda' });

export type AnalysisDto = ReturnType<typeof toAnalysisDto>;

export function toAnalysisDto(d: Diagnosis, calculatedAt: Date) {
  return {
    calculatedAt: calculatedAt.toISOString(),
    totals: totalsDto(d.totals),
    indicators: indicatorsDto(d),
    ire: ireDto(d.ire),
    factors: factorsDto(d.contributions),
    residualIncome: d.residualIncome.toFixed(2),
  };
}

/** Análise da situação atual (SPEC-07). */
export class AnalysisService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
    private readonly budget: BudgetService,
    private readonly clock: Clock,
  ) {}

  /**
   * Recalcula e grava: indicador vigente, histórico do dia (1 por dia, D-09), alertas sem duplicar
   * e com resolução automática, e o cache. Chamado pelo budgetChanged e quando falta cache.
   */
  async refresh(userId: number): Promise<AnalysisDto | null> {
    const now = this.clock.now();
    const today = businessDate(now);
    const snapshot = await this.budget.buildSnapshot(userId, today);
    let d: Diagnosis;
    try {
      d = diagnose(snapshot, DEFAULT_CONFIG);
    } catch (err) {
      if (!(err instanceof InsufficientDataError)) throw err;
      await this.prisma.indicator.deleteMany({ where: { userId } });
      return null;
    }

    const required = requiredAlerts(d);
    await this.prisma.$transaction(async (tx) => {
      const indicator = {
        rentPerc: fitColumn(d.indicators.cr.times(100), 5),
        debtLevel: fitColumn(d.indicators.ne, 8),
        financialLiquidity: d.indicators.lf === null ? null : fitColumn(d.indicators.lf, 8),
        paymentsCapacity: fitColumn(d.indicators.cp, 13, 2),
        riskIndex: d.ire.raw.toFixed(4),
        riskLevel: d.ire.band,
        calculatedAt: now,
      };
      await tx.indicator.upsert({
        where: { userId },
        create: { userId, ...indicator },
        update: indicator,
      });

      const recordDate = new Date(`${today}T00:00:00Z`);
      // O histórico guarda o IRE arredondado, o mesmo que define a faixa: ponto e rótulo sempre batem.
      const history = { risk: d.ire.rounded.toFixed(4), riskLevel: d.ire.band };
      await tx.historyEntry.upsert({
        where: { userId_recordDate: { userId, recordDate } },
        create: { userId, recordDate, ...history },
        update: history,
      });

      const needed = new Set(required.map((a) => a.type));
      await tx.alert.updateMany({
        where: {
          userId,
          status: 'NAO_LIDO',
          type: { in: ALL_ALERT_TYPES.filter((t) => !needed.has(t)) },
        },
        data: { status: 'LIDO' },
      });
      for (const alert of required) {
        const open = await tx.alert.findFirst({
          where: { userId, type: alert.type, status: 'NAO_LIDO' },
        });
        if (open) continue;
        await tx.alert.create({
          data: {
            userId,
            type: alert.type,
            severity: alert.severity,
            description: alertMessage(alert.type, DEFAULT_CONFIG),
            createdAt: now,
          },
        });
      }
    });

    const dto = toAnalysisDto(d, now);
    await writeCache(this.redis, cacheKeys.analysis(userId), dto);
    return dto;
  }

  /** GET /analysis: cache; se faltar, recalcula (e grava o histórico do dia, D-09). */
  async getAnalysis(userId: number) {
    const dto =
      (await readCache<AnalysisDto>(this.redis, cacheKeys.analysis(userId))) ??
      (await this.refresh(userId));
    if (!dto) throw noIncomeError();
    return { ...dto, alerts: await this.unreadAlerts(userId) };
  }

  async unreadAlerts(userId: number) {
    return this.listAlerts(userId, 'NAO_LIDO');
  }

  async listAlerts(userId: number, status?: 'NAO_LIDO' | 'LIDO') {
    const rows = await this.prisma.alert.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
    return rows.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      message: a.description,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
    }));
  }
}
