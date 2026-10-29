# SPEC-01 — Fundação do projeto

| | |
|---|---|
| **Status** | Aprovada para implementação |
| **Depende de** | — |
| **Bloqueia** | Todas as outras specs |
| **Rastreabilidade** | RNF02, RNF08, RNF12, RNF15 · S-01, S-02 · D-02 · PRD §11 · SEGURANCA_LGPD §6 |

## 1. Objetivo
Criar o esqueleto do monorepo (backend, frontend, banco, cache, CI) com as convenções transversais já prontas: decimal, formato de erro, logger sem dados pessoais, cabeçalhos de segurança, configuração por ambiente e Docker. Toda spec seguinte assume que isso existe.

## 2. Escopo
**Dentro:** estrutura de pastas, `package.json` (workspaces), TypeScript strict, ESLint + Prettier, Vitest, Prisma + migration inicial (todas as tabelas), Docker Compose, Express com middlewares base, Vite + React vazio, GitHub Actions, `.env.example` e a atualização do `README.md` (que já existe) com os comandos reais.

**Fora:** regras de negócio, login (SPEC-02) e telas (SPEC-11).

## 3. Estrutura
```
SAFE/
├── package.json              workspaces: backend, frontend; script "tasks" = node scripts/tasks-status.mjs
├── scripts/tasks-status.mjs  painel do TASKS.md (já existe)
├── .github/pull_request_template.md   checklist do CONTRIBUTING.md §5
├── docker-compose.yml        postgres:16, redis:7, api, web
├── .env.example
├── .github/workflows/ci.yml  lint → typecheck → test → coverage (engine ≥ 80%) → npm audit
├── backend/
│   ├── prisma/schema.prisma  (PRD §11.2 + SEGURANCA_LGPD §11)
│   └── src/
│       ├── config/env.ts     validação das variáveis com zod; falha ao subir se faltar alguma
│       ├── engine/           (SPEC-05, SPEC-06, SPEC-08) — sem dependência de infra
│       ├── lib/              decimal.ts, crypto.ts, logger.ts, errors.ts, audit.ts, cache.ts
│       ├── repositories/
│       ├── modules/
│       ├── http/app.ts       criação do Express
│       ├── http/routes.ts    registro dos routers: UMA linha por módulo (evita conflito entre as trilhas A e B)
│       └── server.ts
├── frontend/src/
└── evaluation/
```

## 4. Convenções transversais

### 4.1 Decimal e JSON
- Backend: `decimal.js` configurado com `precision: 40` e `rounding: ROUND_HALF_UP`. Proibido `number` para dinheiro, razões, riscos e índices; regra ESLint/revisão.
- **No JSON, todo valor decimal trafega como string**: dinheiro com 2 casas (`"1600.00"`), razões e riscos com 4 casas (`"0.1925"`). Inteiros (parcelas, nível de faixa) trafegam como `number`.
- Helpers em `lib/decimal.ts`: `toMoneyString(d)`, `toRatioString(d)`, `parseMoney(str)` (aceita `"1600"`, `"1600.5"` e `"1600.50"`; rejeita vírgula e notação científica), `round2(d)`.
- Frontend: os valores chegam como string e são formatados para exibição com `Intl.NumberFormat('pt-BR')`. Contas, só no backend.

### 4.2 Formato de erro (todas as rotas)
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Texto em pt-BR para o usuário", "requestId": "c0a8…", "fields": { "value": "Informe um valor maior que zero" } } }
```
| HTTP | `code` | Uso |
|---|---|---|
| 400 | `VALIDATION_ERROR` | zod ou regra de entrada (`fields` preenchido) |
| 400 | `INCONSISTENT_SIMULATION` | n·p < V (SPEC-08) |
| 401 | `UNAUTHENTICATED` / `SESSION_EXPIRED` | sem sessão / sessão expirada |
| 403 | `CSRF_FAILED` / `TERMS_REQUIRED` | SPEC-02 / SPEC-03 |
| 404 | `NOT_FOUND` | inclusive recurso de outro usuário |
| 409 | `INSUFFICIENT_DATA` | falta renda para calcular (UC07 E01, UC08 E01, UC09 E03) |
| 409 | `TERMS_OUTDATED` | aceite enviado para versão que não é a vigente (SPEC-03) |
| 413 | `PAYLOAD_TOO_LARGE` | corpo > 10 KB |
| 429 | `RATE_LIMITED` | SPEC-02 §6 |
| 500 | `INTERNAL_ERROR` | mensagem genérica + `requestId`; stack só no log |

`AppError(code, httpStatus, message, fields?)` em `lib/errors.ts`, mais um middleware final que converte qualquer erro nesse formato.

### 4.3 Logger
`pino` com `redact: ['req.headers.cookie', 'req.headers["x-safe-csrf"]', 'req.body', 'res.headers["set-cookie"]', '*.email', '*.value', '*.amount']`. Por requisição, loga `requestId` (gerado, devolvido em `X-Request-Id`), `userId` (se houver), método, rota parametrizada (`/debts/:id`, não o id), status e duração. **Nunca** loga corpo nem resposta.

### 4.4 Middlewares base (ordem)
1. `requestId`
2. `helmet` com a CSP de SEGURANCA_LGPD §6.2, HSTS e `Referrer-Policy: no-referrer`
3. `express.json({ limit: '10kb' })`
4. `cookie-parser`
5. Logger
6. `Cache-Control: no-store` + `Pragma: no-cache` em todo `/api/*`
7. Rotas `/api/v1/*`
8. 404 JSON
9. Tratador de erros

Em produção, `trust proxy` = 1 e redirecionamento HTTP → HTTPS.

### 4.5 Configuração (`.env.example`)
```
NODE_ENV=development
APP_ORIGIN=http://localhost:5173        # usado em Origin check, redirects e cookies
API_PORT=3000
DATABASE_URL=postgresql://safe:safe@localhost:5432/safe
REDIS_URL=redis://localhost:6379
SESSION_SECRET=troque-por-32-bytes-aleatorios
DATA_ENC_KEY=base64-de-32-bytes          # AES-256-GCM (SPEC-04)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:5173/api/v1/auth/google/callback
TERMS_VERSION=1.0
PRIVACY_VERSION=1.0
```
Em desenvolvimento, o Vite faz proxy de `/api` para a API, mantendo **mesma origem** (sem CORS). Em produção, um único domínio serve `/` (estático) e `/api`.

### 4.6 Banco
- Prisma com `@@map`/`@map` para os nomes snake_case do PRD §11.2.
- A migration inicial cria **todas** as tabelas do PRD §11.2 já com as mudanças de SEGURANCA_LGPD §11, os `CHECK`s e os `ON DELETE` corretos.
- `timestamptz` em UTC; datas de negócio (`reference_date`, `record_date`) em `date`, no fuso `America/Sao_Paulo`.

### 4.7 Docker
`docker compose up -d` sobe `postgres` (volume nomeado) e `redis` (`--save "" --appendonly no`, sem persistir sessões). `api` e `web` são opcionais no compose; no dia a dia, `npm run dev` roda os dois com hot reload.

## 5. Critérios de aceite
- [ ] `docker compose up -d && npm i && npm run db:migrate && npm run dev` sobe tudo do zero com `.env` copiado do exemplo
- [ ] `GET /api/v1/health` → `200 {"status":"ok"}`, sem tocar no banco
- [ ] Resposta tem CSP, HSTS (em produção), `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store` e `X-Request-Id`
- [ ] Rota inexistente → 404 no formato do §4.2; erro lançado → 500 genérico sem stack na resposta
- [ ] Corpo > 10 KB → 413
- [ ] Teste de `lib/decimal.ts`: `parseMoney("1600")` = `"1600.00"`; rejeita `"1,5"`, `"1e3"`, `"-1"` quando não negativo
- [ ] Log de uma requisição com cookie e corpo não contém o cookie nem o corpo
- [ ] CI roda lint, typecheck, testes e `npm audit --audit-level=high`, falhando se algum quebrar
- [ ] Faltar variável obrigatória no `.env` → processo não sobe e diz qual falta
