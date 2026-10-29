import { Router } from 'express';
import { z } from 'zod';
import type { AppDeps } from '../../http/deps.js';
import { startSession, upsertUser } from './router.js';

const body = z.object({ email: z.email(), sub: z.string().min(1).optional() });

/** POST /api/v1/test/login: só existe com NODE_ENV=test (SPEC-13 §2). Nunca é montada em produção. */
export function testLoginRouter(deps: AppDeps): Router {
  if (deps.env.NODE_ENV !== 'test')
    throw new Error('Rota de login de teste fora do ambiente de teste');
  const router = Router();
  router.post('/login', async (req, res) => {
    const { email, sub } = body.parse(req.body);
    const userId = await upsertUser(deps, {
      sub: sub ?? `test|${email}`,
      email,
      emailVerified: true,
    });
    const session = await startSession(deps, req, res, userId);
    res.json({ userId, csrf: session.csrf });
  });
  return router;
}
