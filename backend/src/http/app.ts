import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import './types.js';
import type { AppDeps } from './deps.js';
import { apiRouter } from './routes.js';
import { requestId } from './middlewares/requestId.js';
import { httpsRedirect, securityHeaders } from './middlewares/security.js';
import { accessLog } from './middlewares/accessLog.js';
import { noStore } from './middlewares/noStore.js';
import { errorHandler, notFoundHandler } from './middlewares/errors.js';

/** Express com os middlewares na ordem da SPEC-01 §4.4. */
export function createApp(deps: AppDeps): Express {
  const production = deps.env.NODE_ENV === 'production';
  const app = express();
  app.disable('x-powered-by');
  if (production) {
    app.set('trust proxy', 1);
    app.use(httpsRedirect);
  }

  app.use(requestId);
  app.use(securityHeaders(production));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser(deps.env.SESSION_SECRET));
  app.use(accessLog(deps.logger));
  app.use('/api', noStore);
  app.use('/api/v1', apiRouter(deps));
  app.use(notFoundHandler);
  app.use(errorHandler(deps.logger));
  return app;
}
