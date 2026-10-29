# TASKS — Execução do SAFE

> **Este arquivo é atualizado em tempo real por quem estiver codando (pessoa ou IA), dentro da própria branch.** Dois programadores trabalham em paralelo, cada um numa trilha e em branches próprias (fluxo completo no `CONTRIBUTING.md`).

## Legenda
| Marca | Status |
|---|---|
| `[ ]` | A fazer |
| `[~]` | Fazendo |
| `[x]` | Feito |

| Trilha | Dono | Foco |
|---|---|---|
| `A` | Programador A *(definir nome)* | Fundação, **motor do IRE**, projeção, orçamento, análise, simulação (backend) e avaliação |
| `B` | Programador B *(definir nome)* | Login, sessão, termos, privacidade (backend), **todo o frontend**, glossário e linguagem, testes de segurança e E2E |
| `A+B` | Os dois | Decisões, textos legais e homologação |

## Como atualizar
1. **Só mexa nas linhas da sua trilha** (`A`, `B`, ou `A+B` combinado entre os dois). Nunca altere o status de tarefa da outra trilha. É isso que evita conflito de merge neste arquivo.
2. **Ao começar** uma tarefa: trocar `[ ]` por `[~]`, acrescentar `· início AAAA-MM-DD HH:MM · <nome ou IA>` e **commitar e dar push na sua branch antes de escrever código** (`T-05.3: inicia`). Com o PR em rascunho aberto (Draft), o outro programador vê o andamento em tempo real pelo GitHub.
3. **No máximo 1 tarefa `[~]` por pessoa** (a IA de cada um conta como a pessoa). Antes de pegar outra, termine a atual ou devolva para `[ ]` com uma nota.
4. **Ao terminar**: só marcar `[x]` quando **todos** os itens de "pronto quando" e os critérios de aceite da spec ligados àquela tarefa estiverem verdadeiros e os testes passarem. Acrescentar `· feito AAAA-MM-DD HH:MM`. Commitar junto com o código da tarefa.
5. **Bloqueou?** Manter `[ ]`, acrescentar `· ⚠ bloqueada: <motivo>` e registrar em "Bloqueios" (cada um só acrescenta linhas, nunca edita as do outro).
6. **Descobriu trabalho novo?** Criar a tarefa na spec certa com o próximo número livre, **com a sua trilha**. Se for regra nova, mudar a spec num PR `docs:` pequeno e mergear rápido, para o outro receber logo.
7. Uma tarefa pronta não volta para `[ ]`. Se quebrou depois, crie uma tarefa de correção.
8. **Painel:** não há contagem manual (daria conflito em todo merge). Rode `node scripts/tasks-status.mjs` para ver o total por fase e por trilha e o que está `[~]`.

## Pontos de sincronização (merge na `main`)
| Marco | O que precisa estar na `main` | Libera |
|---|---|---|
| **M1 · Base** | T-01.1 a T-01.10 (A) | Os dois criam suas branches a partir da `main` |
| **M2 · Auth** | T-02.1 a T-02.9 e T-03.1 a T-03.4 (B) | A pode fazer as rotas do orçamento (T-04.4 em diante), que exigem sessão e termos |
| **M3 · Motor** | T-05.x e T-06.1 (A) | Nada bloqueia B; é o caminho crítico do artigo |
| **M4 · API de dados** | T-04.x, T-07.1 a T-07.4, T-08.1 a T-08.7 (A) | B troca os dados de exemplo (fixtures) pela API real nas telas |
| **M5 · Entrega** | Tudo das fases 1 a 9 | T-13.5 (homologação e tag `v1.0.0`) |

**Enquanto A faz a base (M1), B adianta trabalho que não depende de código:** T-15.1 e T-15.2 (textos do glossário), T-03.5 (Termos e Política) e T-00.2 (OAuth no Google). Esses arquivos entram na `main` logo depois do M1.

**Telas antes da API:** B constrói as telas usando os exemplos de JSON das specs como dados de teste (`frontend/src/fixtures/*.json`). Quando o M4 chegar, só troca a fonte de dados.

---

## Fase 0 · Preparação (equipe, sem código)
- [ ] **T-00.1** `A+B` Validar com o grupo as decisões D-01…D-15 (PRD §12) e S-01…S-09 (SEGURANCA_LGPD §1) → pronto quando: decisões aprovadas ou ajustadas nos documentos
- [ ] **T-00.2** `B` Criar projeto no Google Cloud com tela de consentimento OAuth, escopo `openid email` e redirect URIs de dev e produção (SPEC-02 §2) → pronto quando: `GOOGLE_CLIENT_ID`/`SECRET` no `.env` local de quem vai codar
- [ ] **T-00.3** `A+B` Criar o e-mail de contato de privacidade do projeto e definir o responsável (SEGURANCA_LGPD §2.2)
- [ ] **T-00.4** `A` Criar o repositório no GitHub, convidar a equipe e proteger a branch `main` (PR + CI verde)
- [ ] **T-00.5** `B` Converter o dashboard do colega (Peic/BCB) para CSV com fonte e data de extração (insumo da SPEC-14; só se a SPEC-14 for entrar)

## Fase 1 · Fundação — [SPEC-01](specs/SPEC-01-fundacao.md)
- [x] **T-01.1** `A` Monorepo com workspaces `backend`/`frontend`, TypeScript strict, ESLint + Prettier, Vitest (§3) · início 2026-10-29 17:53 · Igor + IA · feito 2026-10-29 17:57
- [x] **T-01.2** `A` `docker-compose.yml` (Postgres 16, Redis 7 sem persistência), `.env.example` e `config/env.ts` validando com zod (§4.5, §4.7) → pronto quando: faltar variável impede o boot com mensagem clara · início 2026-10-29 17:57 · Igor + IA · feito 2026-10-29 17:58
- [x] **T-01.3** `A` `schema.prisma` com todas as tabelas do PRD §11.2 + SEGURANCA_LGPD §11, `CHECK`s e `ON DELETE`; migration inicial (§4.6) · início 2026-10-29 17:58 · Igor + IA · feito 2026-10-29 18:00
- [x] **T-01.4** `A` `lib/decimal.ts` (`parseMoney`, `toMoneyString`, `toRatioString`, `round2`) + testes (§4.1) · início 2026-10-29 18:00 · Igor + IA · feito 2026-10-29 18:00
- [x] **T-01.5** `A` `lib/errors.ts` (`AppError`) + tratador de erros + 404 JSON (§4.2) · início 2026-10-29 18:00 · Igor + IA · feito 2026-10-29 18:02
- [x] **T-01.6** `A` Logger `pino` com `redact` + `requestId` + log de acesso sem corpo (§4.3) · início 2026-10-29 18:02 · Igor + IA · feito 2026-10-29 18:02
- [x] **T-01.7** `A` App Express com middlewares na ordem do §4.4 + `GET /api/v1/health` · início 2026-10-29 18:02 · Igor + IA · feito 2026-10-29 18:02
- [x] **T-01.8** `A` Frontend Vite + React + TS vazio com proxy `/api` (mesma origem) · início 2026-10-29 18:02 · Igor + IA · feito 2026-10-29 18:03
- [x] **T-01.9** `A` GitHub Actions: lint → typecheck → test → cobertura → `npm audit --audit-level=high` · início 2026-10-29 18:03 · Igor + IA · feito 2026-10-29 18:04
- [x] **T-01.10** `A` Atualizar o README existente (seções 5, 6 e 7) com os comandos, scripts e arquivos de configuração reais → pronto quando: todos os critérios de aceite da SPEC-01 §5 passam · início 2026-10-29 18:04 · Igor + IA · feito 2026-10-29 18:05

## Fase 2 · Motor e projeção — [SPEC-05](specs/SPEC-05-motor-ire.md), [SPEC-06](specs/SPEC-06-projecao.md)
> Pode começar em paralelo com a Fase 1 (só precisa de `decimal.js`).
- [x] **T-05.1** `A` `engine/types.ts`, `engine/config.ts` (`DEFAULT_CONFIG`, `withConfig` imutável) e regra ESLint `no-restricted-imports` em `engine/` (§2, §7) · início 2026-10-29 18:06 · Igor + IA · feito 2026-10-29 18:07
- [x] **T-05.2** `A` **Escrever primeiro** o teste T1 (caso do artigo) e o teste do caso de simulação do PRD §6.6, ainda falhando · início 2026-10-29 18:07 · Igor + IA · feito 2026-10-29 18:07
- [x] **T-05.3** `A` `totals`, `computeIndicators` (erro sem renda), `normalize` com saturação e **clamp de R_CP** (§3.1–3.3) · início 2026-10-29 18:07 · Igor + IA · feito 2026-10-29 18:09
- [x] **T-05.4** `A` `computeIre` (arredondamento só no `rounded`), faixas e `engine/labels.ts` (rótulos, cores, ícones, recomendações) (§3.4, §5) · início 2026-10-29 18:09 · Igor + IA · feito 2026-10-29 18:09
- [x] **T-05.5** `A` `staticDecomposition` com a regra dos 75% e desempate fixo (§3.5) · início 2026-10-29 18:09 · Igor + IA · feito 2026-10-29 18:09
- [x] **T-05.6** `A` `diagnose` com renda residual e regras críticas (§3.6) → pronto quando: T1 passa · início 2026-10-29 18:09 · Igor + IA · feito 2026-10-29 18:09
- [x] **T-05.7** `A` `elapsedMonths` + testes T7 (§3.7) · início 2026-10-29 18:09 · Igor + IA · feito 2026-10-29 18:09
- [x] **T-05.8** `A` Testes T2–T6 e T8 (fronteiras, saturações, casos-limite, ME, propriedades com fast-check, config) · início 2026-10-29 18:09 · Igor + IA · feito 2026-10-29 18:09
- [x] **T-05.9** `A` Cobertura de `engine/` ≥ 80% de linhas e ramos no CI (RNF08) · início 2026-10-29 18:11 · Igor + IA · feito 2026-10-29 18:11
- [x] **T-06.1** `A` `engine/projection.ts` `project()` com e sem `extra`, horizonte, rótulos de mês + testes do §5 · início 2026-10-29 18:09 · Igor + IA · feito 2026-10-29 18:11
- [ ] **T-06.2** `A` `GET /api/v1/projection` com cache Redis e 409 sem renda *(depende de T-04.7)*

## Fase 3 · Login, sessão e termos — [SPEC-02](specs/SPEC-02-autenticacao-sessao.md), [SPEC-03](specs/SPEC-03-termos-consentimento.md)
- [x] **T-02.1** `B` `openid-client` + `GET /auth/google` com `state`/`nonce`/PKCE em cookie assinado (§2) · início 2026-10-29 18:12 · Igor + IA · feito 2026-10-29 18:16
- [x] **T-02.2** `B` Callback: valida `state`, troca o code, valida o id_token, descarta tokens, upsert do usuário por `sub`, erros E01–E03 (§2) · início 2026-10-29 18:16 · Igor + IA · feito 2026-10-29 18:16
- [x] **T-02.3** `B` Sessão no Redis: criação com ID novo, `requireAuth`, expiração 30 min / 8 h, índice `user_sessions` (§3) · início 2026-10-29 18:16 · Igor + IA · feito 2026-10-29 18:16
- [x] **T-02.4** `B` `requireCsrf` (Origin + `X-SAFE-CSRF` em tempo constante) (§4) · início 2026-10-29 18:16 · Igor + IA · feito 2026-10-29 18:16
- [x] **T-02.5** `B` `GET /auth/me`, `POST /auth/logout`, `POST /auth/logout-all` com `Clear-Site-Data`; `destroyAllSessions` exportada (§5) · início 2026-10-29 18:16 · Igor + IA · feito 2026-10-29 18:16
- [x] **T-02.6** `B` Rate limits no Redis (§6) · início 2026-10-29 18:16 · Igor + IA · feito 2026-10-29 18:16
- [x] **T-02.7** `B` Auditoria `LOGIN`/`LOGOUT`/`LOGOUT_ALL` (§7) · início 2026-10-29 18:16 · Igor + IA · feito 2026-10-29 18:16
- [x] **T-02.8** `B` Rota `POST /test/login` só com `NODE_ENV=test` + teste de que não existe em produção (SPEC-13 §2) · início 2026-10-29 18:16 · Igor + IA · feito 2026-10-29 18:16
- [x] **T-02.9** `B` Testes dos critérios da SPEC-02 §8 · início 2026-10-29 18:16 · Igor + IA · feito 2026-10-29 18:16
- [x] **T-03.1** `B` `GET /terms/current` e `POST /terms/accept` com validações, prova no banco e cookie `safe_terms` (§3, §4) · início 2026-10-29 18:16 · Igor + IA · feito 2026-10-29 18:19
- [x] **T-03.2** `B` Middleware `requireTermsAccepted` com cache na sessão; exceções `/me/export` e `DELETE /me` (§3) · início 2026-10-29 18:19 · Igor + IA · feito 2026-10-29 18:19
- [x] **T-03.3** `B` `GET/PUT /me/research-consent` com revogação (§4) · início 2026-10-29 18:19 · Igor + IA · feito 2026-10-29 18:19
- [x] **T-03.4** `B` Arquivos legais versionados em `frontend/public/legal/` (estrutura) (§2) · início 2026-10-29 18:19 · Igor + IA · feito 2026-10-29 18:19
- [ ] **T-03.5** `A+B` **(equipe)** Redigir Termos de Uso v1.0 e Política de Privacidade v1.0 com o conteúdo mínimo da SEGURANCA_LGPD §7.1, cada um com "Em resumo" em linguagem simples (SPEC-15 §5) · rascunho em `frontend/public/legal/` (2026-10-29, Igor + IA); falta o e-mail de contato (T-00.3) e a revisão da equipe
- [ ] **T-03.6** `B` Tela `/termos` (3 obrigatórios + pesquisa opcional, nada pré-marcado) e `<CookieNotice>` (§5) *(depende de T-11.1)*
- [x] **T-03.7** `B` Testes dos critérios da SPEC-03 §6 · início 2026-10-29 18:19 · Igor + IA · feito 2026-10-29 18:19

## Fase 4 · Orçamento — [SPEC-04](specs/SPEC-04-orcamento.md)
- [ ] **T-04.1** `A` `lib/crypto.ts` AES-256-GCM (`encrypt`/`decrypt`) + testes (§2.2)
- [ ] **T-04.2** `A` Repositórios Prisma e em memória com `userId` obrigatório em todo método; descrição cifrada e decifrada no repositório (§2.2, §5)
- [ ] **T-04.3** `A` Schemas zod das 4 entidades + enums de categoria + limites de quantidade (§2, §2.1)
- [ ] **T-04.4** `A` Rotas CRUD de `incomes`, `expenses`, `debts`, `reserves` + `GET /budget/summary` (§3)
- [ ] **T-04.5** `A` `reference_date`, `remainingNow`, `active` e `balanceUsed` nas dívidas (§2.3, §2.4)
- [ ] **T-04.6** `A` Efeitos de escrita: auditoria só com nomes de campos (na transação), invalidar cache e emitir `budgetChanged` (§4)
- [ ] **T-04.7** `A` `buildSnapshot(userId, today)` só com dívidas ativas (§5)
- [ ] **T-04.8** `A` Testes da SPEC-04 §7, incluindo IDOR com 2 usuários e relógio falso para parcelas

## Fase 5 · Análise e simulação — [SPEC-07](specs/SPEC-07-analise-alertas.md), [SPEC-08](specs/SPEC-08-simulacao.md)
- [ ] **T-07.1** `A` `analysisService.getAnalysis` + DTO formatado em pt-BR (`display`, `level`, `exceedsIncome`) (§2, §3)
- [ ] **T-07.2** `A` `refresh` no `budgetChanged`: upsert do indicador, histórico 1 por dia, alertas sem duplicar e resolução automática (§2)
- [ ] **T-07.3** `A` `GET /analysis`, `GET /alerts`, `PATCH /alerts/:id` (§3)
- [ ] **T-07.4** `A` Testes da SPEC-07 §6
- [x] **T-08.1** `A` `validateSimulation` com tolerância de 1 centavo por parcela (§2.1) · início 2026-10-29 18:11 · Igor + IA · feito 2026-10-29 18:11
- [x] **T-08.2** `A` `simulate()`: cenário em memória, ΔIRE, ΔC_i, π_i, principais, `unchanged`, `saturatedBoth`, desfecho e severidade, projeção dupla (§2.2–2.5) · início 2026-10-29 18:11 · Igor + IA · feito 2026-10-29 18:11
- [x] **T-08.3** `A` `engine/explain.ts` com os templates e a formatação pt-BR (§2.6) → pronto quando: gera exatamente a frase do artigo · início 2026-10-29 18:11 · Igor + IA · feito 2026-10-29 18:11
- [x] **T-08.4** `A` Testes: caso do artigo completo, propriedades (fast-check), V/n/p limites, crítico por CP e por ME, saturado (§5) · início 2026-10-29 18:11 · Igor + IA · feito 2026-10-29 18:11
- [ ] **T-08.5** `A` `POST/GET/PATCH /simulations` com persistência só em `simulacao_financeira` e rate limit (§3)
- [ ] **T-08.6** `A` Teste de não alteração: depois de simular, orçamento, análise e histórico idênticos (§5)
- [ ] **T-08.7** `A` Medir p95 de `/analysis` e `/simulations` localmente (preliminar do RNF01)

## Fase 6 · Frontend e linguagem — [SPEC-11](specs/SPEC-11-frontend-base.md), [SPEC-15](specs/SPEC-15-linguagem-glossario.md) e telas
- [ ] **T-11.1** `B` Rotas, guardas (`/auth/me`, termos), layout responsivo com menu lateral/inferior (§2, §5)
- [ ] **T-11.2** `B` Cliente HTTP com CSRF e tratamento padronizado de erros; TanStack Query **sem persistência** (§3)
- [ ] **T-11.3** `B` `lib/storage.ts` (lista fechada) + lint contra `localStorage` direto + `handleSessionEnd` + `BroadcastChannel` (§4)
- [ ] **T-11.4** `B` Tokens de cor e tema, `RiskBadge`, `IreGauge`, `IndicatorCard`, `FactorList`, `MoneyInput`, `ConfirmDialog`, `AlertBanner`, `Disclaimer` (§5)
- [ ] **T-11.5** `B` Formatadores pt-BR (`formatMoney`, `formatPercent`, datas) + testes
- [ ] **T-11.6** `B` Tela de login com avisos e mensagens de erro e de expiração (§6)
- [ ] **T-15.1** `B` `content/glossary.ts` com as 33 entradas e `short` (§3)
- [ ] **T-15.2** `B` Escrever `long`, `example` e `whyItMatters` de todas as entradas (§3)
- [ ] **T-15.3** `B` Componentes `<Term>` (toque, teclado, hover), `<FieldHelp>`, `<HelpPanel>`, `<ResultExplainer>` acessíveis (§4)
- [ ] **T-15.4** `B` Página `/glossario` com busca + cartão "Como o SAFE funciona" (§4.5, §4.6)
- [ ] **T-15.5** `B` Testes: todo `<Term id>` existe, `short` ≤ 140 caracteres, termos e siglas proibidos soltos nos textos (§6)
- [ ] **T-04.9** `B` Tela "Meu orçamento" (4 abas, `<FieldHelp>` em todos os campos, aviso da descrição, confirmação de exclusão, estados vazios) — SPEC-04 §6 + SPEC-15 §5
- [ ] **T-07.5** `B` Dashboard (card do IRE, 4 indicadores com `<Term>` e `<ResultExplainer>`, "Por que meu risco é este?", alertas, checklist sem dados) — SPEC-07 §5
- [ ] **T-08.8** `B` Tela "Simular" (formulário explicado, 4 blocos, banners por desfecho, premissas, "simular outros valores") — SPEC-08 §4
- [ ] **T-06.3** `B` Tela "Projeção" (gráfico + tabela + resumo + premissas) — SPEC-06 §4
- [ ] **T-15.6** `B` Revisão de linguagem de todas as telas com o checklist da SPEC-15 §5, feita por alguém que não escreveu a tela
- [ ] **T-11.7** `B` Verificação manual da SPEC-11 §7 (DevTools: storage, cookies, rede externa; 375 px; 4 navegadores; Lighthouse ≥ 90)

## Fase 7 · Histórico e privacidade — [SPEC-09](specs/SPEC-09-historico.md), [SPEC-10](specs/SPEC-10-privacidade-dados.md)
- [ ] **T-09.1** `A` `GET /history` com período, limites e `trend` + testes (§2, §4)
- [ ] **T-09.2** `B` Tela "Evolução" (gráfico com faixas de fundo, tabela, seletor de período, 0/1 ponto) (§3)
- [ ] **T-10.1** `B` `GET /me` e `GET /me/export` (download, sem salvar, auditado) (§2, §2.1)
- [ ] **T-10.2** `B` `DELETE /me` com o fluxo transacional, limpeza de sessões e cache e `Clear-Site-Data` (§2.2)
- [ ] **T-10.3** `B` Jobs de retenção com `node-cron` + testes com relógio falso (§3)
- [ ] **T-10.4** `B` `npm run privacy:reapply-deletions` + procedimento de backup e restauração no README (§4)
- [ ] **T-10.5** `B` Tela "Minha conta" (meus dados, pesquisa, exportar, sair de todos, excluir com `EXCLUIR`) + `/conta-excluida` (§5)
- [ ] **T-10.6** `B` Testes da SPEC-10 §6

## Fase 8 · Avaliação — [SPEC-12](specs/SPEC-12-avaliacao.md)
- [ ] **T-12.1** `A` `generate-personas.ts` (semente 2026, regras documentadas) → `personas.csv` com 30 linhas commitado (§2)
- [ ] **T-12.2** `A` `eval:personas` + `especialistas.csv` sem IRE (§3)
- [ ] **T-12.3** `A` `stats.ts` (Spearman com empates, Kappa ponderado quadrático) + testes (§3)
- [ ] **T-12.4** `A` `eval:agreement` (roda quando as respostas dos especialistas chegarem)
- [ ] **T-12.5** `A` `eval:sensitivity` (pesos ±10/±20% renormalizados; limites ±0,02/±0,05; M por cenário)
- [ ] **T-12.6** `A` `eval:baseline` (regra só de CR vs IRE em 3 níveis; divergências com motivo)
- [ ] **T-12.7** `A` `eval:simulation-check` (200 aleatórios + 9 de ME; 0 falhas)
- [ ] **T-12.8** `A` `eval:latency` (500 req; mediana, p95, p99, hardware)
- [ ] **T-12.9** `A` `evaluation/README.md` + cabeçalho com commit e data em todo CSV (§4)

## Fase 9 · Qualidade e entrega — [SPEC-13](specs/SPEC-13-qualidade-testes.md)
- [x] **T-13.1** `A` Infra de testes de integração (Postgres e Redis de teste, reset entre testes, login de teste) · **fazer logo depois do M2, antes da T-04.8** · início 2026-10-29 18:16 · Igor + IA · feito 2026-10-29 18:16
- [ ] **T-13.2** `B` Suíte de segurança completa (§3)
- [ ] **T-13.3** `B` Playwright com os fluxos E2E 1–10 (§4)
- [ ] **T-13.4** `A+B` `docs/aceite.md` com cada HU e seus critérios marcados (§5)
- [ ] **T-13.5** `A+B` Homologação: CI verde, E2E ok, checklist da SEGURANCA_LGPD §12, README final, tag `v1.0.0` (§6)

## Fase 10 · Opcional (só com tudo acima pronto)
- [ ] **T-08.9** `A` (D-12) `POST /simulations/:id/register` + botão "Registrar como dívida" (SPEC-08 §3)
- [ ] **T-14.1** `B` CSVs de contexto em `backend/data/context/` + `npm run context:update` (SPEC-14 §2)
- [ ] **T-14.2** `B` `GET /context/series` (§3)
- [ ] **T-14.3** `B` Tela `/entenda` com filtro, glossário e "como o SAFE calcula" (§4)
- [ ] **T-14.4** `B` Acrescentar RF25/UC11/HU24 ao PRD e uma frase no artigo (§5)

---

## Bloqueios
| Tarefa | Motivo | Desde | Quem destrava |
|---|---|---|---|
| — | — | — | — |

## Fora do código (lembrete)
As correções do artigo e da especificação estão no `docs/referencias/Relatorio_Inconsistencias_TCC.docx`. Os números finais da Seção 7 do artigo vêm das tarefas T-05.9, T-08.7, T-12.x e T-13.4.
