import { z } from 'zod';

const base64Key32 = z
  .string()
  .refine((v) => Buffer.from(v, 'base64').length === 32, 'deve ter 32 bytes em base64');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  APP_ORIGIN: z.url(),
  API_PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32, 'deve ter pelo menos 32 caracteres'),
  DATA_ENC_KEY: base64Key32,
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.url(),
  TERMS_VERSION: z.string().min(1),
  PRIVACY_VERSION: z.string().min(1),
  /** Só no deploy (Vercel Cron): habilita a rota interna dos jobs de retenção. */
  CRON_SECRET: z.string().min(32, 'deve ter pelo menos 32 caracteres').optional(),
});

export type Env = z.infer<typeof schema>;

export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Configuração inválida no .env:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    this.name = 'ConfigError';
  }
}

/** Valida as variáveis de ambiente; falha listando cada variável ausente ou inválida. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (parsed.success) return parsed.data;
  const problems = parsed.error.issues.map((issue) => {
    const name = issue.path.join('.');
    const missing = source[name] === undefined || source[name] === '';
    return missing ? `${name} está faltando` : `${name}: ${issue.message}`;
  });
  throw new ConfigError(problems);
}
