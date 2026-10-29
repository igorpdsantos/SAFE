/** Relógio injetável: produção usa o real; testes avançam o tempo à vontade. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

const SAO_PAULO = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Data de negócio 'AAAA-MM-DD' no fuso America/Sao_Paulo (SPEC-01 §4.6). */
export function businessDate(at: Date): string {
  return SAO_PAULO.format(at);
}

export class FakeClock implements Clock {
  constructor(private current = new Date('2026-10-29T15:00:00Z')) {}
  now(): Date {
    return new Date(this.current);
  }
  set(at: Date | string): void {
    this.current = new Date(at);
  }
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
