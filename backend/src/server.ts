import { ConfigError, loadEnv } from './config/env.js';
import { createApp } from './http/app.js';
import { createDeps } from './http/container.js';
import { systemClock } from './lib/clock.js';
import { createLogger } from './lib/logger.js';
import { createPrisma } from './lib/prisma.js';
import { createRedis } from './lib/redis.js';
import { googleOidc } from './modules/auth/oidc.js';

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
  const prisma = createPrisma(env.DATABASE_URL);
  const redis = createRedis(env.REDIS_URL);
  const clock = systemClock;
  const app = createApp(createDeps({ env, logger, prisma, redis, clock, oidc: googleOidc(env) }));
  app.listen(env.API_PORT, () => {
    logger.info({ port: env.API_PORT }, 'API do SAFE no ar');
  });
}

main();
