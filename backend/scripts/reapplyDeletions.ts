// npm run privacy:reapply-deletions — rodar depois de restaurar um backup (SPEC-10 §4).
import { loadEnv } from '../src/config/env.js';
import { createPrisma } from '../src/lib/prisma.js';
import { reapplyDeletions } from '../src/modules/privacy/jobs.js';

const env = loadEnv();
const prisma = createPrisma(env.DATABASE_URL);
const removed = await reapplyDeletions(prisma);
console.log(`Exclusões reaplicadas: ${removed} conta(s) removida(s) de novo.`);
await prisma.$disconnect();
