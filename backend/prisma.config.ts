import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Em desenvolvimento, o .env fica na raiz do monorepo; no CI, as variáveis vêm do ambiente.
if (existsSync('../.env')) process.loadEnvFile('../.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
