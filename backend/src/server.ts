import { ConfigError, loadEnv } from './config/env.js';
import { createApp } from './http/app.js';
import { createLogger } from './lib/logger.js';

function main(): void {
  let env;
  try {
    env = loadEnv();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
  const logger = createLogger(env.LOG_LEVEL);
  const app = createApp({ env, logger });
  app.listen(env.API_PORT, () => {
    logger.info({ port: env.API_PORT }, 'API do SAFE no ar');
  });
}

main();
