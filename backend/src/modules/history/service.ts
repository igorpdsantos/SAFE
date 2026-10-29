import { Decimal } from '../../engine/decimal.js';
import { BAND_LABELS } from '../../engine/labels.js';
import type { RiskBand } from '../../engine/types.js';
import { businessDate, type Clock } from '../../lib/clock.js';
import { validationError } from '../../lib/errors.js';
import type { PrismaClient } from '../../lib/prisma.js';

export type Trend = 'INSUFICIENTE' | 'MELHORANDO' | 'ESTAVEL' | 'PIORANDO';

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const THRESHOLD = new Decimal('0.05');

function parseDay(value: unknown, field: string): Date | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== 'string' ||
    !DATE.test(value) ||
    Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  ) {
    throw validationError({ [field]: 'Use a data no formato AAAA-MM-DD, por exemplo 2026-10-29' });
  }
  return new Date(`${value}T00:00:00Z`);
}

/** Tendência: último ponto contra o primeiro do período, com limite de ±0,05 (SPEC-09 §2). */
export function trendOf(risks: Decimal[]): Trend {
  if (risks.length < 2) return 'INSUFICIENTE';
  const diff = risks[risks.length - 1]!.minus(risks[0]!);
  if (diff.lessThanOrEqualTo(THRESHOLD.negated())) return 'MELHORANDO';
  if (diff.greaterThanOrEqualTo(THRESHOLD)) return 'PIORANDO';
  return 'ESTAVEL';
}

export class HistoryService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly clock: Clock,
  ) {}

  async get(userId: number, query: { from?: unknown; to?: unknown }) {
    const today = new Date(`${businessDate(this.clock.now())}T00:00:00Z`);
    const to = parseDay(query.to, 'to') ?? today;
    const from =
      parseDay(query.from, 'from') ??
      new Date(Date.UTC(to.getUTCFullYear() - 1, to.getUTCMonth(), to.getUTCDate()));
    if (from > to) throw validationError({ from: 'A data inicial precisa ser antes da final' });
    if ((to.getTime() - from.getTime()) / DAY_MS > 366) {
      throw validationError({ from: 'Escolha um período de até 12 meses' });
    }
    const rows = await this.prisma.historyEntry.findMany({
      where: { userId, recordDate: { gte: from, lte: to } },
      orderBy: { recordDate: 'asc' },
    });
    const risks = rows.map((r) => new Decimal(r.risk.toString()));
    return {
      points: rows.map((r, i) => ({
        date: r.recordDate.toISOString().slice(0, 10),
        ire: risks[i]!.toFixed(2),
        band: r.riskLevel,
        label: BAND_LABELS[r.riskLevel as RiskBand].label,
      })),
      trend: trendOf(risks),
    };
  }
}
