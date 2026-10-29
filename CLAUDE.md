# CLAUDE.md — SAFE

O SAFE é o software do TCC (Eng. de Software, USJT): um sistema web de apoio à decisão financeira pessoal. Ele calcula o **Índice de Risco de Endividamento (IRE)** e simula o impacto de uma nova dívida parcelada **antes** da contratação, explicando quais fatores mudaram, em linguagem que qualquer pessoa entende.

Prazo de entrega: **02/11/2026**. Ordem de corte se faltar tempo: PRD §13.

## Mapa de documentos (ler nesta ordem)

| Arquivo | Quando ler |
|---|---|
| `README.md` | Visão geral para quem chega do zero: o que é o SAFE, mapa dos documentos, estrutura, como rodar, configuração, modo de trabalho |
| `TASKS.md` | **Sempre, primeiro** (depois do README na primeira sessão). Diz o que está feito, o que está em andamento, o que vem a seguir e **de qual trilha (A/B)** é cada tarefa |
| `CONTRIBUTING.md` | Fluxo do GitHub: trilhas, branches, PRs, merges, arquivos com risco de conflito, regras para IAs |
| `PRD.md` | Contexto do produto, fórmulas (§5–7), requisitos (§8), modelo de dados (§11), decisões D-01…D-16 (§12) |
| `SEGURANCA_LGPD.md` | Antes de mexer em login, sessão, cookies, formulários, logs, exportação ou exclusão. **Prevalece** sobre o PRD nesses temas |
| `SPECS.md` → `specs/SPEC-NN-*.md` | A spec da tarefa que você vai fazer: contratos, regras, telas e critérios de aceite. **É o que você implementa** |
| `docs/referencias/artigo_completo.tex`, `docs/referencias/especificacao_software_original.pdf`, `docs/referencias/Relatorio_Inconsistencias_TCC.docx` | Fontes originais; só consulta. Em conflito, valem PRD, SEGURANCA_LGPD e specs |

## Fluxo de trabalho obrigatório

Dois programadores, cada um com sua IA, em trilhas e branches separadas (detalhes no `CONTRIBUTING.md`).

0. **Descobrir a trilha** desta sessão pelo nome da branch (`a/…` = trilha A, `b/…` = trilha B). Se estiver na `main` ou não der para saber, **perguntar à pessoa** e não escrever código na `main`. Se precisar, criar a branch `<trilha>/spec-NN-assunto` a partir da `main` atualizada.
1. Abrir o `TASKS.md` e escolher a **próxima tarefa `[ ]` da sua trilha** cujas dependências e marcos (M1–M5) estejam na `main`. Rodar `node scripts/tasks-status.mjs` para ver o painel.
2. **Antes de escrever código:** marcar a tarefa como `[~]`, acrescentar `· início AAAA-MM-DD HH:MM · <pessoa> + IA`, commitar (`T-NN.M: inicia`) e dar push. Se ainda não houver PR da branch, abrir em rascunho (`gh pr create --draft`).
3. Ler a seção da spec indicada na tarefa. Se a spec estiver ambígua ou conflitar com PRD/SEGURANCA_LGPD, **parar e perguntar**. Mudança de spec vai num PR `docs/…` separado.
4. Implementar com testes. O teste vem antes quando a spec dá valores esperados (motor, simulação).
5. Rodar `npm run lint && npm run typecheck && npm test` (e a cobertura, quando mexer em `engine/`).
6. **Só então** marcar `[x]` com `· feito AAAA-MM-DD HH:MM` **no mesmo commit** do código final da tarefa, e dar push. Nunca marcar `[x]` com teste falhando ou critério de aceite pendente.
7. Uma tarefa `[~]` por vez. Trabalho novo → nova tarefa `T-NN.M` **com a sua trilha**. Bloqueio → nota `⚠ bloqueada` + linha nova em "Bloqueios".
8. **Nunca:** mexer em linhas de outra trilha no `TASKS.md`, fazer push ou merge na `main`, force-push, alterar migration já mergeada (trilha B não cria migration), commitar `.env`. Quem mergeia o PR é sempre uma pessoa.
9. Ao começar a sessão, se a `main` andou: `git fetch && git merge origin/main` antes de continuar.

## Stack (D-02)

| Camada | Tecnologia |
|---|---|
| Backend | Node.js 22 + TypeScript (strict) + Express |
| Decimal | `decimal.js` (motor) e `Prisma.Decimal` (persistência). **Nunca** `number` para dinheiro, razões, riscos ou índices. No JSON, decimais trafegam como **string** (SPEC-01 §4.1) |
| Banco | PostgreSQL 16 via Prisma (migrations versionadas, `@@map`/`@map` para snake_case) |
| Cache e sessão | Redis (sessões, rate limit, cache de análise e projeção) |
| Auth | Google OpenID Connect com `openid-client` (Authorization Code + PKCE, escopo `openid email`) + **sessão opaca no Redis** com cookie `__Host-safe_sid` HttpOnly. **Sem JWT no navegador** (S-01) |
| Segurança HTTP | `helmet` (CSP estrita, HSTS), rate limit no Redis, `pino` com `redact` |
| Validação | `zod` em toda entrada da API |
| Jobs | `node-cron` dentro da API (retenção, SPEC-10) |
| Frontend | React + Vite + TypeScript, TanStack Query (sem persistência), Recharts, `lucide-react`, `react-markdown` |
| Testes | Vitest + fast-check (unidade), Supertest (API e segurança), Playwright (E2E) |
| Infra | Docker Compose (postgres, redis; api e web opcionais); GitHub Actions (lint, typecheck, testes, cobertura, `npm audit`) |

## Estrutura

```
SAFE/
├── PRD.md  SEGURANCA_LGPD.md  SPECS.md  TASKS.md  CLAUDE.md  AGENTS.md  CONTRIBUTING.md  README.md
├── scripts/tasks-status.mjs       painel do TASKS.md (npm run tasks)
├── specs/                         SPEC-01 … SPEC-15
├── docker-compose.yml  .env.example  package.json (workspaces)
├── backend/
│   ├── prisma/                    schema.prisma + migrations
│   ├── data/context/              (opcional, SPEC-14) séries Peic/BCB
│   ├── test/                      api/, security/
│   └── src/
│       ├── config/env.ts          variáveis validadas com zod
│       ├── engine/                ← MOTOR PURO (SPEC-05, 06, 08): types, config, indicators, normalize, ire, labels,
│       │                            decomposition, time (elapsedMonths), projection, simulation, explain
│       ├── lib/                   decimal, crypto (AES-256-GCM), logger, errors, audit, cache
│       ├── repositories/          interfaces + Prisma + em memória (userId obrigatório em todo método)
│       ├── modules/               auth, terms, budget, analysis, simulations, history, alerts, privacy, context
│       ├── http/                  app.ts, middlewares (requestId, auth, csrf, termsAccepted, rateLimit, errors)
│       └── server.ts
├── frontend/
│   ├── public/legal/              termos-vX.md, privacidade-vX.md
│   ├── e2e/                       Playwright
│   └── src/
│       ├── api/                   cliente HTTP (CSRF, erros)
│       ├── content/glossary.ts    glossário central (SPEC-15)
│       ├── components/            RiskBadge, IreGauge, IndicatorCard, FactorList, MoneyInput, Term, FieldHelp, HelpPanel, …
│       ├── lib/                   storage.ts (lista fechada), format.ts, session.ts
│       └── pages/                 Login, Termos, Dashboard, Orcamento, Simular, Projecao, Evolucao, Conta, Glossario
└── evaluation/                    personas.csv, scripts, stats.ts, results/
```

## Regras do motor (não negociáveis — SPEC-05, 06, 08)

1. **O motor é puro.** Recebe um `BudgetSnapshot` + `EngineConfig` e devolve resultados. Não importa Prisma, Express, Redis nem `lib/` de infraestrutura (regra ESLint). Não lê o relógio; a data vem no snapshot. API, testes e scripts de avaliação usam **o mesmo código**.
2. **Precisão total** nos cálculos; arredondar (half-up, 2 casas) **só** para classificar a faixa, exibir e persistir. Nunca arredondar R_i ou ΔC_i antes de somar (D-05).
3. **R_CP com clamp em [0, 1]** (D-06; o artigo esquece o teto).
4. Faixas pelo IRE **arredondado**: ≤0,20 Baixo · ≤0,40 Moderado · ≤0,60 Atenção · ≤0,80 Alto · resto Crítico.
5. Desfechos da simulação, nesta ordem: **Crítico** (CP' ≤ 0 ou `R_m − (P_Σ + p) < 600`) → **Agravamento** (ΔIRE ≥ 0,05 ou a faixa subiu) → **Sem agravamento**.
6. A simulação **nunca grava** no orçamento, no indicador, no histórico nem nos alertas; só em `simulacao_financeira`.
7. Casos-limite: sem renda → `InsufficientDataError` (API 409); D = 0 → R_LF = 0; IRE = 0 → sem decomposição; ΔIRE = 0 → sem π; saturado nos dois cenários → "no limite da escala".
8. **Primeiro teste a escrever:** o caso do artigo (PRD §6.6): IRE 0,1925→0,19 e 0,3775→0,38; ΔC {cr 0,12; cp 0,05; ne 0,015; lf 0}; π {64,9%; 27,0%; 8,1%}; AGRAVAMENTO; renda residual 3000. Mais as propriedades: ΔIRE ≥ 0, ΔC_lf = 0, |Σ ΔC − ΔIRE| < 1e-9. Cobertura de `engine/` ≥ 80%.

## Linguagem e UX (SPEC-15 — vale para TODO texto de interface)

O usuário pode não saber nada de finanças. **Ele sempre tem que entender o que está vendo, o que está sendo pedido, para que serve e o que fazer.**
- **Sigla nunca sozinha:** "índice de risco (IRE)" na primeira vez e a sigla dentro de `<Term id="ire">`.
- **Termo técnico com tradução:** "Reserva de emergência (liquidez)" + `<Term>` (tooltip que abre com toque, teclado e clique, não só hover).
- **Todo campo** tem `<FieldHelp>` com "o que é" + "por que pedimos" + exemplo no placeholder.
- **Todo número** com unidade e significado ("1,5 mês da sua renda"); todo resultado com "o que significa" e "o que fazer" (`<ResultExplainer>`).
- Definições **só** no `content/glossary.ts`; nenhuma tela inventa definição solta.
- Frases curtas, falando com "você", sem jargão nem inglês, sem julgar e sem prometer ("garantia", "pode comprar").
- Erros dizem o que fazer ("Digite um valor maior que zero, por exemplo 150,00").
- Faixa de risco **nunca só por cor**: cor + ícone + rótulo (RNF05).

## Segurança e privacidade (resumo; detalhes no `SEGURANCA_LGPD.md`)

- **Nada no navegador além da memória:** sem `localStorage`, `sessionStorage`, IndexedDB, service worker ou `persistQueryClient` para dados, tokens ou e-mail. Exceção: chaves `theme`, `safe_cookie_notice` e `safe_onboarding_done`, sempre via `lib/storage.ts`.
- **Só 4 cookies:** `__Host-safe_sid`, `__Host-safe_csrf`, `__Host-safe_oauth`, `safe_terms` (sem `__Host-`/`Secure` apenas em desenvolvimento local). Nenhum script, fonte ou CDN de terceiros.
- **`userId` vem só da sessão.** Todo repositório recebe `userId` e filtra por ele. Recurso de outro usuário → 404. Cada recurso novo ganha teste de IDOR.
- **Requisições que alteram estado:** exigir `X-SAFE-CSRF` igual ao valor da sessão e `Origin` igual a `APP_ORIGIN`.
- **Respostas `/api`:** `Cache-Control: no-store`. O logout limpa o TanStack Query e o estado, avisa as outras abas, usa `location.replace` e o servidor envia `Clear-Site-Data`.
- **Rotas financeiras:** exigem sessão **e** termos aceitos na versão vigente (`requireTermsAccepted`). Exportar e excluir conta funcionam sem termos em dia.
- **Não coletar** nome, CPF, telefone, endereço, nascimento, banco ou conta. Despesas e dívidas usam `category`; a descrição é opcional (≤ 60 caracteres) e criptografada (AES-256-GCM).
- **Logs** sem valores, e-mails, cookies, csrf ou tokens. A auditoria grava só os **nomes** dos campos alterados.
- **Exclusão de conta:** cascata + sessões + cache + registro mínimo sem e-mail (SPEC-10 §2.2).
- Rota de login de teste existe **só** com `NODE_ENV=test`.

## Convenções de código

- **Código em inglês** (identificadores, arquivos, rotas); **textos de interface em pt-BR** (SPEC-15).
- Domínio → código: renda `income`, despesa `expense`, dívida `debt`, reserva `reserve`, comprometimento da renda `cr`/`incomeCommitment`, capacidade de pagamento `cp`/`paymentCapacity`, liquidez `lf`/`liquidity`, nível de endividamento `ne`/`debtLevel`, IRE `riskIndex`, faixa `riskBand`, mínimo existencial `minimumExistential`.
- API em `/api/v1`, erros no formato único da SPEC-01 §4.2.
- Toda escrita no orçamento: auditoria na transação → invalidar cache → evento `budgetChanged` (SPEC-04 §4).
- Rastreabilidade: nome do teste começa pelo requisito ou tarefa (ex.: `RF08 – CR exibe 0% sem dívidas`, `T-08.4 – caso do artigo`).
- Formatação de exibição: `R$ 1.600,00`, `25,0%`, `dd/mm/aaaa`.

## O que o SAFE NÃO faz (não implementar)

Recomendar produtos, comparar ofertas de bancos, indicar investimentos, bloquear decisões, prever probabilidade de inadimplência, calcular juros ou CET, simular despesa recorrente (v1), usar analytics ou rastreamento. Nenhum texto pode apresentar a faixa verde como "permissão" ou "garantia".

## Comandos (atualizar quando o scaffold existir — T-01.10)

```bash
docker compose up -d            # postgres + redis
npm install
npm run db:migrate              # prisma migrate dev
npm run dev                     # api (3000) + web (5173, proxy /api)
npm run lint && npm run typecheck
npm test                        # unidade + integração
npm run test:coverage           # meta engine/ ≥ 80%
npm run test:e2e                # Playwright
npm run eval:<script>           # personas | agreement | sensitivity | baseline | simulation-check | latency
```

## Segredos

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `DATA_ENC_KEY`, `DATABASE_URL` e `REDIS_URL` ficam só em `.env` (nunca commitado). O `.env.example` sempre atualizado, com valores fictícios. Nunca imprimir segredos em log, teste ou mensagem.
