import { DEFAULT_CONFIG } from '../../engine/config.js';
import { Decimal } from '../../engine/decimal.js';
import { InsufficientDataError, SimulationValidationError } from '../../engine/errors.js';
import { INDICATOR_NAMES } from '../../engine/labels.js';
import { simulate, type SimulationInput, type SimulationResult } from '../../engine/simulation.js';
import type { Clock } from '../../lib/clock.js';
import { toMoneyString, toRatioString } from '../../lib/decimal.js';
import { AppError, notFound, validationError } from '../../lib/errors.js';
import type { PrismaClient } from '../../lib/prisma.js';
import { indicatorDisplay, ireDto } from '../analysis/present.js';
import type { BudgetService } from '../budget/service.js';
import { projectionDto } from '../projection/service.js';

export const SIMULATION_ASSUMPTIONS = [
  'A compra não usa sua reserva',
  'Suas despesas não mudam',
  'O risco projetado considera o mês em que todas as parcelas estão ativas',
];

export function simulationDto(id: number, r: SimulationResult, rating: number | null = null) {
  return {
    id,
    rating,
    financialCost: toMoneyString(r.financialCost),
    current: { ire: ireDto(r.current.ire) },
    projected: { ire: ireDto(r.projected.ire) },
    deltaIre: toRatioString(r.deltaIre),
    outcome: r.outcome,
    alertSeverity: r.alertSeverity,
    factors: r.factors.map((f) => ({
      key: f.key,
      name: INDICATOR_NAMES[f.key],
      before: indicatorDisplay(f.key, f.before),
      after: indicatorDisplay(f.key, f.after),
      riskBefore: toRatioString(f.riskBefore),
      riskAfter: toRatioString(f.riskAfter),
      points: toRatioString(f.delta),
      share: f.share === null ? null : toRatioString(f.share),
      isMain: f.isMain,
      unchanged: f.unchanged,
      saturatedBoth: f.saturatedBoth,
    })),
    residualIncomeAfter: toMoneyString(r.residualIncomeAfter),
    explanation: r.explanation,
    projection: {
      without: projectionDto(r.projection.without),
      with: projectionDto(r.projection.with),
    },
    assumptions: SIMULATION_ASSUMPTIONS,
  };
}

/** Simulação (SPEC-08 §3): grava só em simulacao_financeira; o orçamento real não muda. */
export class SimulationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly budget: BudgetService,
    private readonly clock: Clock,
  ) {}

  async run(userId: number, input: SimulationInput) {
    let result: SimulationResult;
    try {
      result = simulate(await this.budget.buildSnapshot(userId), input, DEFAULT_CONFIG);
    } catch (err) {
      if (err instanceof SimulationValidationError) {
        throw err.kind === 'INCONSISTENT'
          ? new AppError('INCONSISTENT_SIMULATION', 400, err.message, {
              installmentValue: err.message,
            })
          : new AppError('VALIDATION_ERROR', 400, err.message, err.fields);
      }
      if (err instanceof InsufficientDataError) {
        throw new AppError(
          'INSUFFICIENT_DATA',
          409,
          'Cadastre sua renda antes de simular uma compra.',
          {
            income: 'Cadastre sua renda',
          },
        );
      }
      throw err;
    }
    const row = await this.prisma.simulation.create({
      data: {
        userId,
        simulatedValue: input.value.toFixed(2),
        installments: input.installments,
        installmentValue: input.installmentValue.toFixed(2),
        currentRisk: result.current.ire.raw.toFixed(4),
        estimatedRisk: result.projected.ire.raw.toFixed(4),
        outcome: result.outcome,
        createdAt: this.clock.now(),
        state: 'ATIVA',
      },
      select: { id: true },
    });
    return simulationDto(row.id, result);
  }

  async list(userId: number) {
    const rows = await this.prisma.simulation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return rows.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      value: toMoneyString(new Decimal(s.simulatedValue.toString())),
      installments: s.installments,
      installmentValue: toMoneyString(new Decimal(s.installmentValue.toString())),
      currentRisk: new Decimal(s.currentRisk.toString()).toFixed(4),
      estimatedRisk: new Decimal(s.estimatedRisk.toString()).toFixed(4),
      outcome: s.outcome,
      state: s.state,
      rating: s.rating,
    }));
  }

  async rate(userId: number, id: number, rating: number) {
    const { count } = await this.prisma.simulation.updateMany({
      where: { id, userId },
      data: { rating },
    });
    if (count === 0) throw notFound('Esta simulação não existe ou não é sua.');
    return { id, rating };
  }

  async discard(userId: number, id: number) {
    const { count } = await this.prisma.simulation.updateMany({
      where: { id, userId },
      data: { state: 'DESCARTADA' },
    });
    if (count === 0) throw notFound('Esta simulação não existe ou não é sua.');
    return { id, state: 'DESCARTADA' as const };
  }

  /**
   * D-12 (SPEC-08 §3): transforma a simulação numa dívida real. Marca EFETIVADA antes de criar a
   * dívida, para que dois cliques não criem duas; se a criação falhar, volta para ATIVA.
   */
  async register(userId: number, id: number) {
    const sim = await this.prisma.simulation.findFirst({ where: { id, userId } });
    if (!sim) throw notFound('Esta simulação não existe ou não é sua.');
    const { count } = await this.prisma.simulation.updateMany({
      where: { id, userId, state: 'ATIVA' },
      data: { state: 'EFETIVADA' },
    });
    if (count === 0) {
      const message =
        sim.state === 'EFETIVADA'
          ? 'Esta simulação já foi registrada como dívida. Veja em Orçamento > Dívidas.'
          : 'Esta simulação foi descartada. Faça uma nova simulação para registrar.';
      throw validationError({ state: message }, message);
    }
    try {
      const debt = await this.budget.create(userId, 'debts', {
        description: null,
        category: 'CREDIARIO',
        installmentValue: new Decimal(sim.installmentValue.toString()),
        remainingInstallments: sim.installments,
        totalInstallments: sim.installments,
        balanceDue: null,
      });
      return { simulation: { id, state: 'EFETIVADA' as const }, debt };
    } catch (err) {
      await this.prisma.simulation.updateMany({
        where: { id, userId },
        data: { state: 'ATIVA' },
      });
      throw err;
    }
  }
}
