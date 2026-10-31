#!/usr/bin/env node
// Monta o deploy da Vercel no formato Build Output API v3 (.vercel/output), sem depender da
// detecção automática: o site do Vite como estático e a API inteira como UMA função Node
// em São Paulo. Uso: `npm run build:vercel` e depois `vercel deploy --prebuilt --prod`.
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.vercel', 'output');
const fn = join(out, 'functions', 'api.func');

// Mesmos cabeçalhos que a API envia (SEGURANCA_LGPD §6.2), agora também nas páginas estáticas.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');
const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });

rmSync(out, { recursive: true, force: true });
mkdirSync(fn, { recursive: true });

// 1. Site estático (Vite).
run('npm run build -w frontend');
cpSync(join(root, 'frontend', 'dist'), join(out, 'static'), { recursive: true });

// 2. API: um arquivo só. O Prisma 7 traz o compilador de consultas em base64 num módulo
//    importado com caminho fixo, então entra no pacote sem arquivo .wasm solto.
await build({
  entryPoints: [join(root, 'backend', 'src', 'serverless.ts')],
  outfile: join(fn, 'index.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: false,
  legalComments: 'none',
  // Dependências CommonJS (express, pg, ioredis) usam require() de módulos do Node.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  // Opcionais do pg que nunca rodam no Node da Vercel.
  external: ['pg-native', 'cloudflare:sockets'],
  logLevel: 'warning',
});
writeFileSync(
  join(fn, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.mjs',
      launcherType: 'Nodejs',
      // O Express lê o corpo e os cookies sozinho.
      shouldAddHelpers: false,
      // SEGURANCA_LGPD §12: de preferência, região no Brasil (São Paulo).
      regions: ['gru1'],
      maxDuration: 30,
    },
    null,
    2,
  ),
);

// 3. Rotas: cabeçalhos em tudo, API na função, o resto cai no index.html (SPA).
writeFileSync(
  join(out, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '/(.*)', headers: SECURITY_HEADERS, continue: true },
        {
          src: '/assets/(.*)',
          headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
          continue: true,
        },
        { src: '/api/(.*)', dest: '/api' },
        { handle: 'filesystem' },
        { src: '/(.*)', headers: { 'Cache-Control': 'no-cache' }, dest: '/index.html' },
      ],
      // Jobs de retenção (SPEC-10 §3): 06:00 UTC = 03:00 em São Paulo.
      crons: [{ path: '/api/v1/internal/retention', schedule: '0 6 * * *' }],
    },
    null,
    2,
  ),
);

console.log('Vercel: .vercel/output pronto (static + functions/api.func).');
