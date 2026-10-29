import { pino, type DestinationStream, type Logger } from 'pino';

export type { Logger };

// SPEC-01 §4.3: nada de cookies, CSRF, corpo, e-mail ou valores nos logs.
export const REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers["x-safe-csrf"]',
  'req.headers.authorization',
  'req.body',
  'res.headers["set-cookie"]',
  'body',
  'email',
  '*.email',
  '*.value',
  '*.amount',
  '*.token',
  '*.sid',
];

export function createLogger(level = 'info', destination?: DestinationStream): Logger {
  return pino(
    {
      level,
      base: undefined,
      redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    },
    destination,
  );
}
