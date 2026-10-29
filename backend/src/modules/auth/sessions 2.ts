import { createHash, randomBytes } from 'node:crypto';
import type { Clock } from '../../lib/clock.js';
import type { Redis } from '../../lib/redis.js';

export interface SessionData {
  userId: number;
  createdAt: number;
  lastSeenAt: number;
  csrf: string;
  /** "<terms>|<privacy>" quando o aceite já foi conferido no banco (SPEC-03 §3). */
  termsOk?: string;
}

export type SessionLookup =
  { status: 'ok'; key: string; data: SessionData } | { status: 'missing' } | { status: 'expired' };

export const IDLE_MS = 30 * 60 * 1000;
export const ABSOLUTE_MS = 8 * 60 * 60 * 1000;
const IDLE_SECONDS = IDLE_MS / 1000;

const token = () => randomBytes(32).toString('base64url');
const hash = (id: string) => createHash('sha256').update(id).digest('hex');
const sessKey = (h: string) => `sess:${h}`;
const indexKey = (userId: number) => `user_sessions:${userId}`;

/** Sessão opaca no Redis: o cookie leva o ID; o Redis guarda só o hash dele (SPEC-02 §3). */
export class SessionStore {
  constructor(
    private readonly redis: Redis,
    private readonly clock: Clock,
  ) {}

  async create(userId: number): Promise<{ id: string; csrf: string }> {
    const id = token();
    const csrf = token();
    const now = this.clock.now().getTime();
    const h = hash(id);
    const data: SessionData = { userId, createdAt: now, lastSeenAt: now, csrf };
    await this.redis
      .multi()
      .set(sessKey(h), JSON.stringify(data), 'EX', IDLE_SECONDS)
      .sadd(indexKey(userId), h)
      .exec();
    return { id, csrf };
  }

  /** Busca e aplica as expirações (30 min ociosa, 8 h no total). Renova o TTL se válida. */
  async lookup(id: string): Promise<SessionLookup> {
    const key = sessKey(hash(id));
    const raw = await this.redis.get(key);
    if (!raw) return { status: 'missing' };
    const data = JSON.parse(raw) as SessionData;
    const now = this.clock.now().getTime();
    if (now - data.lastSeenAt > IDLE_MS || now - data.createdAt > ABSOLUTE_MS) {
      await this.destroyKey(key, data.userId);
      return { status: 'expired' };
    }
    data.lastSeenAt = now;
    await this.redis.set(key, JSON.stringify(data), 'EX', IDLE_SECONDS);
    return { status: 'ok', key, data };
  }

  async update(key: string, data: SessionData): Promise<void> {
    await this.redis.set(key, JSON.stringify(data), 'EX', IDLE_SECONDS);
  }

  async destroy(id: string): Promise<void> {
    const key = sessKey(hash(id));
    const raw = await this.redis.get(key);
    const userId = raw ? (JSON.parse(raw) as SessionData).userId : null;
    await this.destroyKey(key, userId);
  }

  /** Derruba todas as sessões do usuário ("sair de todos" e exclusão de conta). */
  async destroyAllSessions(userId: number): Promise<void> {
    const hashes = await this.redis.smembers(indexKey(userId));
    const pipeline = this.redis.multi();
    for (const h of hashes) pipeline.del(sessKey(h));
    pipeline.del(indexKey(userId));
    await pipeline.exec();
  }

  /** Atualiza o cache de "termos em dia" em todas as sessões do usuário. */
  async setTermsOk(userId: number, value: string | undefined): Promise<void> {
    const hashes = await this.redis.smembers(indexKey(userId));
    for (const h of hashes) {
      const raw = await this.redis.get(sessKey(h));
      if (!raw) continue;
      const data = JSON.parse(raw) as SessionData;
      if (value === undefined) delete data.termsOk;
      else data.termsOk = value;
      await this.redis.set(sessKey(h), JSON.stringify(data), 'KEEPTTL');
    }
  }

  private async destroyKey(key: string, userId: number | null): Promise<void> {
    const pipeline = this.redis.multi().del(key);
    if (userId !== null) pipeline.srem(indexKey(userId), key.slice('sess:'.length));
    await pipeline.exec();
  }
}
