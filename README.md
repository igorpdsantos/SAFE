# SAFE — Sistema de Apoio à decisão Financeira e prevenção do Endividamento

O SAFE é um sistema web que ajuda uma pessoa a **descobrir, antes de assinar**, o que uma compra parcelada ou um empréstimo vai fazer com o orçamento dela.

O usuário cadastra renda, despesas, dívidas e reserva. O SAFE calcula o **índice de risco de endividamento (IRE)**, uma nota de 0 a 1, e mostra o que mais pesa nela. Antes de contratar algo, o usuário **simula** a compra e compara o risco de hoje com o risco depois da compra, com uma explicação em linguagem simples. O SAFE **não decide** pelo usuário e **não recomenda** produtos nem investimentos.

Projeto de TCC do curso de Engenharia de Software da Universidade São Judas Tadeu (2026), orientado pelo Prof. Nelson Aguiar. O artigo correspondente é *"Prevenção do superendividamento por meio da tecnologia: a abordagem de simulação financeira do SAFE"*.

> **Status (31/10/2026):** backend, frontend (com a aba opcional "Entenda os dados"), avaliação e testes (unidade, integração, segurança e E2E) implementados, na `main` e no ar em **https://safe-tcc.vercel.app** (deploy automático a cada merge). Faltam itens que dependem da equipe: revisão dos textos legais (T-03.5), revisão de linguagem (T-15.6), verificação manual nos navegadores (T-11.7), respostas dos especialistas (T-12.4) e homologação (T-13.5). Veja o `TASKS.md`. Entrega do software: **02/11/2026**. O progresso fica no [`TASKS.md`](TASKS.md); rode `node scripts/tasks-status.mjs` para ver o painel.

---

## Sumário
1. [Comece por aqui](#1-comece-por-aqui)
2. [Mapa dos documentos](#2-mapa-dos-documentos)
3. [Como o SAFE funciona](#3-como-o-safe-funciona)
4. [Arquitetura e stack](#4-arquitetura-e-stack)
5. [Estrutura de pastas](#5-estrutura-de-pastas)
6. [Rodando o projeto](#6-rodando-o-projeto)
7. [Arquivos de configuração](#7-arquivos-de-configuração)
8. [Modo de trabalho](#8-modo-de-trabalho)
9. [Trabalhando com IA](#9-trabalhando-com-ia)
10. [Regras que valem para todo o código](#10-regras-que-valem-para-todo-o-código)
11. [Testes e avaliação do modelo](#11-testes-e-avaliação-do-modelo)
12. [Vocabulário do projeto](#12-vocabulário-do-projeto)
13. [Perguntas frequentes](#13-perguntas-frequentes)
14. [Equipe](#14-equipe)

---

## 1. Comece por aqui

### Sou uma pessoa e vou programar
1. Leia este README inteiro (15 minutos).
2. Leia o [`CONTRIBUTING.md`](CONTRIBUTING.md): trilhas, branches e PRs.
3. Abra o [`TASKS.md`](TASKS.md), veja os marcos (M1–M5) e as tarefas da sua trilha.
4. Antes de cada tarefa, leia a spec dela em [`specs/`](specs/) (o índice está no [`SPECS.md`](SPECS.md)).
5. Leia o [`SEGURANCA_LGPD.md`](SEGURANCA_LGPD.md) antes de mexer em login, cookies, formulários, logs, exportação ou exclusão de dados.
6. Dúvida de regra de negócio ou fórmula → [`PRD.md`](PRD.md).

### Sou uma IA (Claude, Codex, Cursor, Copilot, Gemini…)
Leia o [`CLAUDE.md`](CLAUDE.md) inteiro **antes de qualquer ação**. Ele vale para qualquer IA; o [`AGENTS.md`](AGENTS.md) só aponta para ele. Resumo:
- descubra a trilha pela branch (`a/…` ou `b/…`; na dúvida, pergunte);
- marque a tarefa como `[~]` e dê push antes de codar;
- siga a spec;
- marque `[x]` só com testes passando;
- nunca mexa na `main` nem nas tarefas da outra trilha.

### Só quero entender o projeto
Leia as seções 3 e 4 deste README, depois o [`PRD.md`](PRD.md) §1–§7.

---

## 2. Mapa dos documentos

| Arquivo | Para que serve | Quem lê |
|---|---|---|
| [`README.md`](README.md) | Porta de entrada: visão geral, estrutura, como rodar e como trabalhar | Todos |
| [`PRD.md`](PRD.md) | **O quê e por quê:** problema, escopo, modelo matemático completo, requisitos (RF/RNF), modelo de dados, API, decisões D-01…D-16, plano até a entrega | Todos |
| [`SEGURANCA_LGPD.md`](SEGURANCA_LGPD.md) | **Privacidade e segurança:** bases legais, dados permitidos e proibidos, login, sessão, cookies, `localStorage`, criptografia, logs, direitos do titular, incidentes. Decisões S-01…S-09 | Todos que mexem em dados de usuário |
| [`SPECS.md`](SPECS.md) | Índice das 15 especificações, com resumo, dependências e cobertura dos requisitos | Quem vai implementar |
| [`specs/SPEC-NN-*.md`](specs/) | **Como, em detalhe:** contratos (tipos e JSON), regras, telas, erros e critérios de aceite de cada parte | Quem implementa aquela parte |
| [`TASKS.md`](TASKS.md) | **Execução:** 105 tarefas `T-NN.M` com trilha e status `[ ]` / `[~]` / `[x]`, marcos de merge, bloqueios | Todos, todo dia |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Fluxo do GitHub: trilhas, branches, commits, PRs, revisão, merge, arquivos com risco de conflito, regras para IAs | Quem programa |
| [`CLAUDE.md`](CLAUDE.md) | Manual para IAs (e pessoas): ordem de leitura, fluxo obrigatório, stack, regras do motor, linguagem, segurança, convenções | IAs e quem programa |
| [`AGENTS.md`](AGENTS.md) | Atalho para IAs que procuram esse nome de arquivo; aponta para o `CLAUDE.md` | IAs |
| [`scripts/tasks-status.mjs`](scripts/tasks-status.mjs) | Painel do `TASKS.md` (progresso por fase e por trilha) | Todos |

**Hierarquia em caso de conflito:** `SEGURANCA_LGPD.md` (em privacidade e segurança) › `PRD.md` › `specs/` › artigo e especificação originais. Se uma spec contradiz o PRD, a spec é corrigida antes de codar.

**Fontes originais** em [`docs/referencias/`](docs/referencias/), só para consulta (cópias de 29/10/2026; veja o [README da pasta](docs/referencias/README.md)):
- [`artigo_completo.tex`](docs/referencias/artigo_completo.tex): o artigo, com o modelo do IRE nas Seções 5 e 6;
- [`especificacao_software_original.pdf`](docs/referencias/especificacao_software_original.pdf): a especificação de requisitos inicial (casos de uso, RF, RNF, HU, modelo de dados);
- [`Relatorio_Inconsistencias_TCC.docx`](docs/referencias/Relatorio_Inconsistencias_TCC.docx): correções pendentes no artigo e na especificação.

---

## 3. Como o SAFE funciona

### 3.1 O que o usuário faz
```
Entrar com Google → aceitar termos (18+) → cadastrar renda, despesas, dívidas e reserva
      → ver o painel (índice de risco + o que mais pesa)
      → simular uma compra parcelada antes de contratar (nada é salvo no orçamento)
      → acompanhar a projeção dos próximos meses e a evolução do risco
      → (opcional) ver dados públicos sobre dívidas das famílias em "Entenda os dados"
      → exportar ou excluir seus dados quando quiser
```

### 3.2 O índice de risco (IRE)
Quatro indicadores, cada um convertido para um risco entre 0 e 1 e somados com pesos:

| Indicador | Em palavras simples | Cálculo | Risco (0 a 1) | Peso |
|---|---|---|---|---|
| Comprometimento da renda (CR) | Quanto da renda vai para parcelas | parcelas ÷ renda | CR ÷ 0,50 (máx. 1) | **40%** |
| Capacidade de pagamento (CP) | Quanto sobra no mês | renda − despesas − parcelas | 1 − CP ÷ (30% da renda), entre 0 e 1 | **30%** |
| Liquidez (LF) | Quantos meses a reserva paga as despesas | reserva ÷ despesas | 1 − LF ÷ 6 (mín. 0) | **20%** |
| Nível de endividamento (NE) | Quantos meses de renda para quitar tudo | saldo devedor ÷ renda | NE ÷ 12 (máx. 1) | **10%** |

`IRE = 0,40·R_CR + 0,30·R_CP + 0,20·R_LF + 0,10·R_NE`

As faixas usam o IRE arredondado em 2 casas:

| Faixa | IRE |
|---|---|
| Baixo | 0,00–0,20 |
| Moderado | 0,21–0,40 |
| Atenção | 0,41–0,60 |
| Alto | 0,61–0,80 |
| Crítico | 0,81–1,00 |

Como o índice é uma soma ponderada, dá para dizer **exatamente** quanto cada indicador contribuiu para o resultado.

### 3.3 A simulação
O usuário informa o valor da compra, o número de parcelas e o valor da parcela. O SAFE copia a situação atual em memória e acrescenta a nova parcela. Depois:
- recalcula o índice;
- mostra a variação, indicador por indicador;
- classifica o resultado: **sem agravamento**, **agravamento** ou **crítico** (quando não sobra dinheiro ou a renda restante fica abaixo de R$ 600, o mínimo existencial de referência);
- explica em uma frase.

Exemplo do artigo:

> "Esta compra elevaria o comprometimento da sua renda com dívidas de 10,0% para 25,0% e reduziria sua folga mensal de R$ 1.600,00 para R$ 1.000,00. Esses fatores respondem por 91,9% do aumento do risco."

Detalhes completos: [`PRD.md`](PRD.md) §5–§7, [`SPEC-05`](specs/SPEC-05-motor-ire.md), [`SPEC-06`](specs/SPEC-06-projecao.md) e [`SPEC-08`](specs/SPEC-08-simulacao.md).

### 3.4 Entenda os dados (opcional, SPEC-14)
Aba `/entenda` com séries públicas agregadas, só para contexto (não entram no cálculo do IRE): Pesquisa de Endividamento e Inadimplência do Consumidor (PEIC/CNC: famílias com dívidas, em atraso, sem condição de pagar, renda comprometida e tipos de dívida) e Banco Central/SGS (29037 endividamento, **29034** comprometimento da renda com ajuste sazonal — a 29265 sem ajuste fica na tabela — e 4189 Selic). Os dados ficam em CSVs versionados em `backend/data/context/`, cada um com fonte, URL, data de extração e unidade; o navegador nunca acessa sites de terceiros.

- **Atualizar o Banco Central:** `npm run context:update` (baixa os últimos 5 anos e regenera `backend/src/modules/context/series.generated.ts`).
- **Novo mês da PEIC:** acrescente uma linha em `backend/data/context/peic.csv` com os números da publicação da CNC e rode `npm run context:update -- --offline`.
- O script de onde vieram os dados da PEIC (dashboard da equipe) está em `docs/referencias/dashboard-peic-bcb.py`.

### 3.5 Como os gráficos são feitos
Todos os gráficos usam os componentes de `frontend/src/components/charts/` (`StatTile`, `LineChartCard`, `ColumnChartCard`, `RankBarCard`, `PerHundred`, `ChartFrame`): uma escala por gráfico, valor no fim da linha, frase do que observar, fonte e tabela ("Ver tabela"), aviso quando o eixo não começa em zero. As cores das séries (`--series-1..3` em `styles.css`) foram validadas para daltonismo nos temas claro e escuro; as cores de status ficam só para as faixas de risco. A apresentação pode traduzir unidades ("R$ 29 de cada R$ 100"), mas nunca altera o dado da fonte.

### 3.6 O que o SAFE não faz
Não recomenda produtos nem investimentos, não compara bancos, não bloqueia decisões, não prevê probabilidade de calote, não calcula juros nem CET e não se conecta a bancos. O índice **não foi calibrado** com dados reais de inadimplência: ele é um apoio para entender a situação, não um diagnóstico.

---

## 4. Arquitetura e stack

```
┌──────────────────────────── Navegador ────────────────────────────┐
│  SPA React (Vite) · nada financeiro salvo no navegador             │
└───────────────┬───────────────────────────────────────────────────┘
                │ HTTPS, mesma origem (/ e /api), cookie HttpOnly
┌───────────────▼──────────── API REST /api/v1 (Express) ───────────┐
│  middlewares: requestId · helmet/CSP · sessão · CSRF · termos ·    │
│               rate limit · erros                                   │
│  módulos: auth · terms · budget · analysis · simulations ·         │
│           history · alerts · privacy                               │
│  ┌──────────── engine/ (motor PURO, sem banco) ───────────────┐   │
│  │ indicadores · normalização · IRE · faixas · fatores ·       │   │
│  │ projeção · simulação · explicação                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────┬─────────────────────────────┬─────────────────────────────┘
        │ Prisma                      │
┌───────▼────────┐          ┌─────────▼─────────┐        ┌──────────────────┐
│ PostgreSQL 16  │          │ Redis 7           │        │ Google (OpenID   │
│ dados, histó-  │          │ sessões, cache,   │        │ Connect) só no   │
│ rico, auditoria│          │ rate limit        │        │ login            │
└────────────────┘          └───────────────────┘        └──────────────────┘
```

| Camada | Tecnologia |
|---|---|
| Backend | Node.js 22, TypeScript (strict), Express, zod, `decimal.js`, Prisma |
| Dados | PostgreSQL 16, Redis 7 |
| Login | Google OpenID Connect (`openid-client`, PKCE, escopo `openid email`) + sessão no servidor (sem JWT no navegador) |
| Frontend | React, Vite, TypeScript, TanStack Query, Recharts, lucide-react |
| Testes | Vitest, fast-check, Supertest, Playwright |
| Infra | Docker Compose, GitHub Actions |

A escolha da stack é a decisão D-02 (PRD §12). Por que o motor é "puro": API, testes e scripts de avaliação do artigo rodam **o mesmo código**, sem banco ([SPEC-05](specs/SPEC-05-motor-ire.md)).

---

## 5. Estrutura de pastas

```
SAFE/
├── README.md  PRD.md  SEGURANCA_LGPD.md  SPECS.md  TASKS.md       documentação
├── CLAUDE.md  AGENTS.md  CONTRIBUTING.md                          como trabalhar (pessoas e IAs)
├── specs/SPEC-01 … SPEC-15                                         especificações
├── docs/aceite.md          critérios de aceite de todas as specs e sua situação
├── docs/referencias/       artigo, especificação original e relatório (só consulta)
├── scripts/tasks-status.mjs                                        painel das tarefas
├── package.json            workspaces (backend, frontend, evaluation) + scripts npm
├── tsconfig.base.json  eslint.config.js  .prettierrc.json          TS strict, lint e formatação
├── docker-compose.yml      postgres (com o banco safe_test) + redis; api e web opcionais
├── .env.example            variáveis (valores fictícios)
├── .github/                workflows/ci.yml e pull_request_template.md
├── backend/
│   ├── prisma.config.ts    configuração do Prisma 7 (lê o .env da raiz)
│   ├── prisma/             schema.prisma + migrations (CHECKs no SQL)
│   ├── scripts/            reapplyDeletions.ts (npm run privacy:reapply-deletions)
│   ├── test/               api/ (integração), security/ (suíte da SPEC-13), perf/, helpers/
│   └── src/
│       ├── config/env.ts   variáveis validadas com zod
│       ├── engine/         MOTOR PURO: decimal, types, config, indicators, normalize, ire, decomposition,
│       │                   diagnose, labels, time, projection, simulation, explain, format
│       ├── generated/      Prisma Client (gerado no npm install; fora do Git)
│       ├── lib/            decimal, crypto, logger, errors, audit, cache, events, clock, prisma, redis
│       ├── repositories/   orçamento: interface, Prisma e em memória (userId em todo método)
│       ├── modules/        health, auth, terms, budget, analysis, projection, simulations, history, privacy
│       ├── http/           app.ts, routes.ts, container.ts, deps.ts, guards.ts, middlewares/
│       └── server.ts       sobe a API e agenda os jobs de retenção
├── frontend/
│   ├── public/legal/       termos-v1.0.md e privacidade-v1.0.md (rascunhos, T-03.5)
│   ├── e2e/                10 fluxos Playwright (SPEC-13 §4)
│   └── src/                api/, components/, content/ (glossary, labels), lib/ (storage, session, format), pages/
└── evaluation/             personas.csv, especialistas.csv, scripts/, results/ (ver evaluation/README.md)
```

---

## 6. Rodando o projeto

**Pré-requisitos:** Node.js 22, Docker e Docker Compose, Git, GitHub CLI (`gh`, opcional) e uma conta Google para testar o login.

```bash
git clone https://github.com/igorpdsantos/SAFE.git && cd SAFE
cp .env.example .env              # gerar DATA_ENC_KEY e SESSION_SECRET (abaixo); GOOGLE_* vêm da T-00.2
docker compose up -d              # sobe Postgres (com o banco safe_test) e Redis
npm install                       # também gera o Prisma Client
npm run db:migrate                # cria as tabelas
npm run dev                       # API em :3000 e site em http://localhost:5173
curl localhost:5173/api/v1/health # {"status":"ok"}
```

Gerar segredos:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Já tem um Postgres rodando na porta 5432?** Use outra porta para o do Docker: no `.env`, `POSTGRES_PORT=5433` e troque `5432` por `5433` em `DATABASE_URL` e `TEST_DATABASE_URL`. O mesmo vale para o Redis com `REDIS_PORT`.

Para aplicar as migrations no banco de testes: `DATABASE_URL=$TEST_DATABASE_URL npm run db:deploy -w backend`.

| Comando | O que faz |
|---|---|
| `npm run dev` | API + frontend com recarga automática |
| `npm run dev:demo` | Igual, mas com a API em modo de teste: habilita o botão "Entrar como pessoa de teste" (útil enquanto não há OAuth do Google). Nunca em produção |
| `npm run lint` / `npm run typecheck` | ESLint + Prettier / tipos dos dois workspaces |
| `npm run format` | Formata tudo com o Prettier |
| `npm test` | Testes de unidade e integração (backend e frontend) |
| `npm run test:coverage` | Cobertura do `engine/` (meta ≥ 80%, o CI falha abaixo disso) |
| `npm run test:e2e` | Fluxos completos no navegador (Playwright) |
| `npm run db:migrate` | `prisma migrate dev` (cria e aplica migrations) |
| `npm run build` | Compila a API (`backend/dist`) e o site (`frontend/dist`) |
| `npm run build:vercel` | Monta o deploy da Vercel em `.vercel/output` (site + API como função) |
| `npm run context:update` | Atualiza as séries do Banco Central da aba "Entenda os dados" (`-- --offline` só regenera a partir dos CSVs) |
| `npm run eval:<script>` | Avaliação do modelo: `personas`, `agreement`, `sensitivity`, `baseline`, `simulation-check`, `latency` (SPEC-12) |
| `npm run privacy:reapply-deletions` | Depois de restaurar um backup, reaplica as exclusões de conta (SPEC-10 §4) |
| `npm run test:e2e` | Os 10 fluxos E2E com Playwright |
| `npm run tasks` | Painel do `TASKS.md` |

Sem alguma variável obrigatória, a API não sobe e lista o que falta (por exemplo, `REDIS_URL está faltando`).

### Backup e restauração (SPEC-10 §4, RNF09)
- **Backup diário** criptografado, com retenção de 30 dias:
  ```bash
  pg_dump "$DATABASE_URL" --format=custom | age -r <chave-publica> > backups/safe-$(date +%F).dump.age
  ```
  (ou o backup criptografado do provedor do banco). A pasta `backups/` está no `.gitignore`.
- **Restauração:**
  ```bash
  age -d -i <chave-privada> backups/safe-AAAA-MM-DD.dump.age | pg_restore --clean --dbname "$DATABASE_URL"
  npm run privacy:reapply-deletions   # apaga de novo quem pediu exclusão depois daquele backup
  ```
- Os jobs de retenção (contas inativas há 12 meses, simulações com mais de 12 meses, auditoria com mais de 6 meses, aceites órfãos e a lista de exclusões com mais de 30 dias) rodam todo dia às 03:00 (America/Sao_Paulo): no desenvolvimento, pelo `node-cron` da API; em produção, pelo agendador da Vercel (abaixo).

### Deploy na Vercel (CI/CD, T-01.11)

**Como funciona.** Front e API ficam no mesmo domínio (exigência dos cookies `__Host-`). O `npm run build:vercel` (`scripts/build-vercel.mjs`) monta o `.vercel/output` no formato [Build Output API](https://vercel.com/docs/build-output-api): o site do Vite como estático e a API inteira como **uma função Node 22 em São Paulo (`gru1`)**, com os cabeçalhos de segurança da SEGURANCA_LGPD §6.2 também nas páginas estáticas e o agendador chamando `/api/v1/internal/retention` às 06:00 UTC (03:00 em São Paulo). Banco: **Neon** (Postgres); Redis: **Upstash**, os dois na região São Paulo.

**CD.** A cada push na `main`, depois do workflow `ci` verde, o `.github/workflows/deploy.yml`: aplica as migrations no banco de produção → roda o `build:vercel` → publica com `vercel deploy --prebuilt --prod` → confere `/api/v1/health` e o CSP no domínio de produção. O deploy automático pelo Git da Vercel fica desligado (`vercel.json`), para as migrations sempre virem antes. Também dá para disparar à mão em *Actions → deploy → Run workflow*.

**Configuração inicial (uma vez):**
1. Vercel: criar o projeto (`vercel link`) e, em *Storage*, criar o Neon e o Upstash Redis na região São Paulo, conectados ao projeto.
2. Variáveis de **Production** no projeto Vercel: `NODE_ENV=production`, `APP_ORIGIN` (ex.: `https://safe-tcc.vercel.app`), `DATABASE_URL` (Neon, com pooler), `REDIS_URL` (Upstash, `rediss://…`), `SESSION_SECRET`, `DATA_ENC_KEY` (**novos**, nunca os do desenvolvimento), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (`<APP_ORIGIN>/api/v1/auth/google/callback`), `TERMS_VERSION`, `PRIVACY_VERSION`, `CRON_SECRET` e `LOG_LEVEL=info`.
3. Google Cloud: no cliente OAuth, acrescentar a origem `<APP_ORIGIN>` e a URI de redirecionamento acima.
4. GitHub (*Settings → Secrets and variables → Actions*): segredos `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (do `.vercel/project.json`) e `PROD_DATABASE_URL_UNPOOLED` (Neon, sem pooler); variável `PROD_URL` (= `APP_ORIGIN`).

**Testar o pacote localmente** antes de publicar: `npm run build:vercel` e confira o `.vercel/output` (não vai para o Git).

---

## 7. Arquivos de configuração

| Arquivo | Para que serve | Observações |
|---|---|---|
| `.env` | Segredos e configuração local | **Nunca** vai para o Git. Copiado do `.env.example` |
| `.env.example` | Lista de variáveis com valores fictícios | Atualizar sempre que surgir variável nova |
| `docker-compose.yml` | Postgres e Redis locais | Redis sem persistência (sessões somem ao reiniciar). `--profile app` sobe também `api` e `web` |
| `backend/prisma/schema.prisma` | Modelo do banco | Só a trilha A altera; uma migration por PR. `CHECK`s ficam no SQL da migration |
| `backend/prisma.config.ts` | Configuração do Prisma 7 (schema, migrations, `DATABASE_URL`) | Lê o `.env` da raiz |
| `tsconfig.base.json` | TypeScript strict compartilhado | `backend/` usa NodeNext; `frontend/` usa Bundler |
| `.github/workflows/ci.yml` | CI de todo PR | Lint, typecheck, migrations, testes, cobertura e `npm audit --audit-level=high` |
| `.github/pull_request_template.md` | Checklist de PR | Conteúdo do `CONTRIBUTING.md` §5 |
| `eslint.config.js` | Regras de código | Inclui: `engine/` não importa infraestrutura nem lê o relógio; `localStorage` só via `lib/storage.ts` |
| `.prettierrc.json` | Formatação | Aspas simples, 100 colunas |
| `frontend/vite.config.ts` | Frontend e testes do frontend | Proxy de `/api` para a API (mesma origem, sem CORS) |
| `CLAUDE.md` / `AGENTS.md` | Instruções para IAs | Ver seção 9 |

### Variáveis de ambiente
| Variável | Exemplo | Uso |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test` ou `production` |
| `APP_ORIGIN` | `http://localhost:5173` | Origem do site (CSRF, redirects, cookies) |
| `API_PORT` | `3000` | Porta da API |
| `LOG_LEVEL` | `info` | Nível do log (`silent` nos testes) |
| `DATABASE_URL` | `postgresql://safe:safe@localhost:5432/safe` | Postgres |
| `TEST_DATABASE_URL` | `postgresql://safe:safe@localhost:5432/safe_test` | Postgres dos testes de integração |
| `POSTGRES_PORT` / `REDIS_PORT` | `5432` / `6379` | Portas expostas pelo Docker Compose |
| `REDIS_URL` | `redis://localhost:6379` | Redis |
| `SESSION_SECRET` | 32 bytes aleatórios | Assina cookies temporários do login |
| `DATA_ENC_KEY` | 32 bytes em base64 | Criptografa as descrições (AES-256-GCM) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | do Google Cloud | Login (T-00.2) |
| `GOOGLE_REDIRECT_URI` | `http://localhost:5173/api/v1/auth/google/callback` | Callback do login |
| `TERMS_VERSION` / `PRIVACY_VERSION` | `1.0` | Mudou → todos aceitam de novo |

---

## 8. Modo de trabalho

### 8.1 Do requisito ao código
```
PRD.md (o quê/por quê) ──► specs/SPEC-NN (como) ──► TASKS.md T-NN.M (execução) ──► branch + PR ──► main
                     SEGURANCA_LGPD.md vale em tudo que toca dados de usuário
```

### 8.2 Trilhas e branches
Dois programadores, cada um com sua IA, trabalham em paralelo. **A divisão de pessoas entre as trilhas ainda não foi definida** (preencher no `TASKS.md`, seção "Legenda").

| Trilha | Foco |
|---|---|
| **A** | Fundação, motor do IRE, projeção, orçamento, análise, simulação (backend), avaliação do modelo |
| **B** | Login, sessão, termos, privacidade (backend), todo o frontend, glossário e linguagem, testes de segurança e E2E |
| **A+B** | Decisões, textos legais, homologação |

- `main` protegida: só recebe código por PR com CI verde e *squash merge*.
- Branches curtas, uma por spec: `a/spec-05-motor-ire`, `b/spec-11-frontend-base`, `docs/ajuste-spec-08`.
- Atualizar a branch com a `main` pelo menos uma vez por dia.
- Detalhes, comandos e como resolver conflitos: [`CONTRIBUTING.md`](CONTRIBUTING.md).

### 8.3 Ciclo de uma tarefa
1. Pegar a próxima tarefa `[ ]` **da sua trilha** no `TASKS.md`.
2. Marcar `[~]` com data e nome → commit `T-NN.M: inicia` → push (e PR em rascunho aberto).
3. Ler a spec → implementar com testes.
4. `lint` + `typecheck` + `test` passando → marcar `[x]` no mesmo commit → push.
5. Spec concluída → PR pronto para revisão → o outro revisa → merge por uma pessoa.

| Marca | Status |
|---|---|
| `[ ]` | A fazer |
| `[~]` | Fazendo (máximo 1 por pessoa) |
| `[x]` | Feito |

### 8.4 Marcos de merge
| Marco | Conteúdo | Libera |
|---|---|---|
| M1 | Base do projeto (SPEC-01) | Todos começam suas branches |
| M2 | Login, sessão e termos (SPEC-02/03 backend) | Rotas do orçamento |
| M3 | Motor do IRE (SPEC-05) + projeção | Caminho crítico do artigo |
| M4 | API de orçamento, análise e simulação | Telas passam a usar a API real |
| M5 | Tudo testado e homologado | Entrega (tag `v1.0.0`) |

### 8.5 Commits e PRs
- Commits: `T-05.3: normalize com clamp de R_CP` · `docs: …` · `fix: …`.
- PR: `SPEC-05: motor do IRE (T-05.1–T-05.9)`, com o checklist do `CONTRIBUTING.md` §5.

---

## 9. Trabalhando com IA

O projeto foi preparado para ser desenvolvido com assistentes de IA, com regras para que duas IAs (uma de cada programador) não atropelem uma à outra.

| Arquivo | Papel para a IA |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Manual principal (vale para qualquer IA): ordem de leitura, fluxo obrigatório, stack, regras do motor, linguagem, segurança |
| [`AGENTS.md`](AGENTS.md) | Lido automaticamente por várias ferramentas; aponta para o `CLAUDE.md` |
| [`TASKS.md`](TASKS.md) | Onde a IA escolhe a tarefa e registra o status em tempo real |
| [`specs/`](specs/) | O que a IA implementa, com critérios de aceite verificáveis |

**Como pedir trabalho à IA:**
> "Estamos na branch `a/spec-05-motor-ire`. Pegue a próxima tarefa da trilha A no TASKS.md e siga o CLAUDE.md."

**O que a IA sempre faz:**
- confirma a trilha;
- marca `[~]` e dá push antes de codar;
- escreve testes;
- marca `[x]` só com tudo passando;
- abre PR em rascunho.

**O que a IA nunca faz:**
- push ou merge na `main`;
- force-push;
- pegar tarefa da outra trilha;
- alterar migration já mergeada;
- commitar `.env`;
- guardar dado financeiro no navegador;
- usar `number` para dinheiro;
- deixar sigla ou termo técnico sem explicação na tela.

**A pessoa continua responsável:** revisa o PR, faz o merge e decide quando a spec está ambígua. Tudo o que a IA gerar é revisado antes de entrar na `main`. O artigo declara esse uso na seção de declarações.

---

## 10. Regras que valem para todo o código

**Cálculo**
- Dinheiro, razões e índices **sempre** em decimal (`decimal.js`), nunca `number`. No JSON, trafegam como **string** (`"1600.00"`).
- Arredondar só para exibir, persistir e classificar a faixa.
- O motor (`engine/`) não acessa banco, rede nem relógio.

**Privacidade e segurança** ([`SEGURANCA_LGPD.md`](SEGURANCA_LGPD.md))
- Login só com Google; o SAFE recebe apenas o e-mail. Sessão no servidor, 30 min sem uso ou 8 h no total.
- Só 4 cookies, todos essenciais; sem analytics nem scripts de terceiros.
- Nada financeiro no `localStorage` ou similares; o logout limpa tudo.
- Nada de nome, CPF, telefone, endereço, banco ou conta. Descrições curtas e criptografadas.
- Todo acesso a dados filtrado pelo usuário da sessão (outro usuário → 404).
- Logs sem valores, e-mails, cookies ou tokens.
- O usuário pode exportar e excluir tudo a qualquer momento.

**Linguagem simples** ([SPEC-15](specs/SPEC-15-linguagem-glossario.md))
- Ninguém precisa saber finanças para usar o SAFE.
- Sigla nunca sozinha; termo técnico sempre com tradução e tooltip (que abre com toque e teclado).
- Todo campo diz o que é e **para que** pedimos; todo resultado diz o que significa e o que fazer.
- Todas as definições vêm do glossário central (`frontend/src/content/glossary.ts`).
- Faixa de risco sempre com cor **e** ícone **e** texto.

---

## 11. Testes e avaliação do modelo

| Tipo | Ferramenta | Onde | Situação (29/10/2026) |
|---|---|---|---|
| Unidade (motor) | Vitest + fast-check | `backend/src/engine/*.test.ts` | Caso do artigo exato; propriedades em 1000 casos; cobertura 100% das linhas e 95,9% dos ramos |
| Integração de API | Vitest + Supertest + Postgres/Redis de teste | `backend/test/api/` | Todos os endpoints, inclusive IDOR com 2 usuários e relógio falso |
| Segurança | Supertest | `backend/test/security/` | Os 12 itens da SPEC-13 §3 |
| Frontend | Vitest + Testing Library | `frontend/src/**/*.test.ts(x)` | Glossário, linguagem (sem sigla solta), storage, componentes |
| E2E | Playwright | `frontend/e2e/` | 10/10 fluxos, inclusive celular 375 px |
| Avaliação (artigo) | `evaluation/` | `evaluation/results/` | Ver abaixo |

Rodar tudo: `npm run lint && npm run typecheck && npm test`; cobertura: `npm run test:coverage`; E2E: `npm run test:e2e` (sobe os servidores em modo demo se não estiverem rodando; na 1ª vez, `npx playwright install chromium` em `frontend/`). Latência dentro dos testes: `PERF=1 npx vitest run test/perf` em `backend/`.

**Resultados da avaliação (detalhes e como reproduzir em [`evaluation/README.md`](evaluation/README.md)):**
- PA2 sensibilidade: M = 0 sem perturbação; no pior caso com pesos ±10/±20%, M = 0,100.
- PA3 regra simples × IRE: 12 divergências em 30 personas, cada uma com o motivo.
- PA4 simulação: 209 cenários, 0 falhas.
- RNF01 latência (500 requisições, Apple M4): p95 de 1,8 ms em `/analysis` e 2,1 ms em `/simulations`.
- PA1 concordância: aguarda as respostas dos especialistas (`evaluation/especialistas-respostas.csv`).

A situação de cada critério de aceite está em [`docs/aceite.md`](docs/aceite.md).

---

## 12. Vocabulário do projeto

| Termo | Significado |
|---|---|
| **IRE** | Índice de Risco de Endividamento (0 a 1) |
| **CR, CP, LF, NE** | Os 4 indicadores: comprometimento da renda, capacidade de pagamento, liquidez, nível de endividamento |
| **Faixa** | Classificação do IRE em 5 níveis (baixo → crítico) |
| **ME** | Mínimo existencial: R$ 600, valor de referência configurável |
| **Snapshot** | Foto da situação financeira do usuário que entra no motor |
| **RF / RNF** | Requisito funcional / não funcional (PRD §8 e §10) |
| **UC / HU** | Caso de uso / história de usuário (especificação original) |
| **D-NN** | Decisão de produto tomada no PRD §12 |
| **S-NN** | Decisão de segurança e privacidade (SEGURANCA_LGPD §1) |
| **SPEC-NN** | Especificação detalhada de uma parte do sistema |
| **T-NN.M** | Tarefa M da SPEC-NN |
| **Trilha A / B** | Divisão do trabalho entre os dois programadores |
| **M1–M5** | Marcos de merge na `main` |
| **PA1–PA5** | Perguntas de avaliação do artigo (Seção 7) |
| **DSR** | Design Science Research, o método de pesquisa do TCC |

---

## 13. Perguntas frequentes

**Por que não usar JWT?**
Porque JWT no navegador fica exposto a XSS e não pode ser revogado no logout. A sessão no servidor resolve as duas coisas (S-01).

**Por que categorias em vez de descrição livre?**
Texto livre atrai dado sensível ("remédio para…") e dado de terceiros. A categoria basta para o cálculo (S-05).

**Por que o risco projetado usa o mês de maior exposição?**
É a leitura conservadora do artigo: num sistema preventivo, um alerta a mais custa menos que um alerta que não aparece.

**O IRE prevê se eu vou ficar inadimplente?**
Não. Ele ordena situações por critérios explícitos e não foi calibrado com dados reais de inadimplência.

**Posso usar dados reais de pessoas para testar?**
Não. Use dados fictícios. O estudo com usuários também usa perfis fictícios (S-08).

**Achei um erro numa spec. E agora?**
Corrija num PR `docs/…` pequeno, mergeie rápido e avise o outro programador. Não corrija "por fora" no código.

**Onde estão as correções do artigo?**
No [`docs/referencias/Relatorio_Inconsistencias_TCC.docx`](docs/referencias/Relatorio_Inconsistencias_TCC.docx).

---

## 14. Equipe

Universidade São Judas Tadeu — Engenharia de Software, 2026. Orientador: Prof. Nelson Augusto Oliveira de Aguiar.

Gabriel Dias de Moraes Ferreira · Guilherme Pontes Santos · Gustavo de Cássio Gomes Perez · Gustavo Xavier Figueredo dos Santos · Higor da Silva Santos · Igor Pereira dos Santos · Matheus Cunha da Silva · Michael Douglas Braga

Licença: *a definir pela equipe.*
