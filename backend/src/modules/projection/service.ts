import { InsufficientDataError } from '../../engine/errors.js';
import { project, type Projection } from '../../engine/projection.js';
import { cacheKeys, readCache, writeCache } from '../../lib/cache.js';
import { toMoneyString } from '../../lib/decimal.js';
import { AppError } from '../../lib/errors.js';
import type { Redis } from '../../lib/redis.js';
import type { BudgetService } from '../budget/service.js';

export const PROJECTION_ASSUMPTIONS = [
  'Renda e despesas constantes',
  'Dívidas pagas até a última parcela informada',
];

export function projectionDto(p: Projection) {
  return {
    horizon: p.horizon,
    points: p.points.map((x) => ({
      month: x.month,
      label: x.label,
      free: toMoneyString(x.free),
      balance: toMoneyString(x.balance),
      debtsActive: x.debtsActive,
    })),
    firstNonPositiveFreeMonth: p.firstNonPositiveFreeMonth,
    firstNegativeBalanceMonth: p.firstNegativeBalanceMonth,
  };
}

type ProjectionResponse = ReturnType<typeof projectionDto> & { assumptions: string[] };

/** GET /projection (SPEC-06 §3): calculada sob demanda, cacheada, nunca persistida. */
export class ProjectionService {
  constructor(
    private readonly redis: Redis,
    private readonly budget: BudgetService,
  ) {}

  async get(userId: number): Promise<ProjectionResponse> {
    const key = cacheKeys.projection(userId);
    const cached = await readCache<ProjectionResponse>(this.redis, key);
    if (cached) return cached;
    let p: Projection;
    try {
      p = project(await this.budget.buildSnapshot(userId));
    } catch (err) {
      if (!(err instanceof InsufficientDataError)) throw err;
      throw new AppError('INSUFFICIENT_DATA', 409, 'Cadastre sua renda para ver a projeção.', {
        income: 'Cadastre sua renda para ver a projeção',
      });
    }
    const dto = { ...projectionDto(p), assumptions: PROJECTION_ASSUMPTIONS };
    await writeCache(this.redis, key, dto);
    return dto;
  }
}
