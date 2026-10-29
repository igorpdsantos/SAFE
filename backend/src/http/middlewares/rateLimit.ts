import { randomUUID } from 'node:crypto';
import type { Request, RequestHandler, Response } from 'express';
import { AppError } from '../../lib/errors.js';
import type { AppDeps } from '../deps.js';

export interface RateLimitRule {
  name: string;
  limit: number;
  windowMs: number;
  key: (req: Request, res: Response) => string | undefined;
}

/** Janela deslizante no Redis (sorted set por chave). Excedeu → 429 + Retry-After (SPEC-02 §6). */
export function rateLimit(deps: AppDeps, rule: RateLimitRule): RequestHandler {
  return async (req, res, next) => {
    const id = rule.key(req, res);
    if (!id) return next();
    const now = deps.clock.now().getTime();
    const key = `rl:${rule.name}:${id}`;
    const results = await deps.redis
      .multi()
      .zremrangebyscore(key, 0, now - rule.windowMs)
      .zadd(key, now, `${now}:${randomUUID()}`)
      .zcard(key)
      .zrange(key, 0, 0, 'WITHSCORES')
      .pexpire(key, rule.windowMs)
      .exec();
    const count = Number(results?.[2]?.[1] ?? 0);
    if (count > rule.limit) {
      const oldest = Number((results?.[3]?.[1] as string[] | undefined)?.[1] ?? now);
      const retryAfter = Math.max(1, Math.ceil((oldest + rule.windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      throw new AppError(
        'RATE_LIMITED',
        429,
        'Muitas tentativas em pouco tempo. Espere um pouco e tente de novo.',
      );
    }
    next();
  };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const RATE_LIMITS = {
  login: { name: 'login', limit: 10, windowMs: MINUTE, key: (req: Request) => req.ip },
  api: {
    name: 'api',
    limit: 120,
    windowMs: MINUTE,
    key: (_req: Request, res: Response) => res.locals.session?.key,
  },
  simulations: {
    name: 'sim',
    limit: 30,
    windowMs: MINUTE,
    key: (_req: Request, res: Response) => res.locals.session?.key,
  },
  export: {
    name: 'export',
    limit: 5,
    windowMs: HOUR,
    key: (_req: Request, res: Response) => uid(res),
  },
  deleteAccount: {
    name: 'delete',
    limit: 3,
    windowMs: HOUR,
    key: (_req: Request, res: Response) => uid(res),
  },
} satisfies Record<string, RateLimitRule>;

function uid(res: Response): string | undefined {
  const id = res.locals.session?.userId;
  return id === undefined ? undefined : String(id);
}
