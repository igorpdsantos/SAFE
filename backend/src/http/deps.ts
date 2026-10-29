import type { Env } from '../config/env.js';
import type { Logger } from '../lib/logger.js';

/** Dependências que o app recebe prontas (permite trocar por versões de teste). */
export interface AppDeps {
  env: Env;
  logger: Logger;
}
