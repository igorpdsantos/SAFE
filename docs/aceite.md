# Critérios de aceite — situação em 29/10/2026

Gerado a partir das seções "Critérios de aceite" de cada spec. `[x]` = atendido e verificado por teste automatizado (ou pela execução indicada); `[ ]` = pendente, com o motivo.

> Falta o mapeamento por **história de usuário (HU)** da especificação original (T-13.4), feito pela equipe a partir desta lista.

## SPEC-01 — Fundação do projeto

Verificação: `backend/test/api/foundation.test.ts`, `src/config/env.test.ts`, `src/lib/decimal.test.ts`, CI

- [x] `docker compose up -d && npm i && npm run db:migrate && npm run dev` sobe tudo do zero com `.env` copiado do exemplo
- [x] `GET /api/v1/health` → `200 {"status":"ok"}`, sem tocar no banco
- [x] Resposta tem CSP, HSTS (em produção), `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store` e `X-Request-Id`
- [x] Rota inexistente → 404 no formato do §4.2; erro lançado → 500 genérico sem stack na resposta
- [x] Corpo > 10 KB → 413
- [x] Teste de `lib/decimal.ts`: `parseMoney("1600")` = `"1600.00"`; rejeita `"1,5"`, `"1e3"`, `"-1"` quando não negativo
- [x] Log de uma requisição com cookie e corpo não contém o cookie nem o corpo
- [x] CI roda lint, typecheck, testes e `npm audit --audit-level=high`, falhando se algum quebrar
- [x] Faltar variável obrigatória no `.env` → processo não sobe e diz qual falta

## SPEC-02 — Autenticação e sessão

Verificação: `backend/test/api/auth.test.ts`

- [x] Login completo cria o usuário no 1º acesso e reaproveita no 2º (mesmo `sub`, e-mail atualizado)
- [x] Banco e Redis **não** contêm access token, refresh token nem id_token do Google
- [x] `state` adulterado → `/login?erro=invalido`; cancelar no Google → `/login?erro=cancelado`
- [x] Cookie de sessão é HttpOnly, SameSite=Lax, sem Max-Age (Secure e `__Host-` em produção)
- [x] 31 min sem requisição → 401 `SESSION_EXPIRED`; sessão com 8 h → 401 mesmo com uso contínuo (teste com relógio falso)
- [x] Login gera ID novo; o ID antigo deixa de funcionar
- [x] POST sem `X-SAFE-CSRF`, com valor errado ou com `Origin` de outro site → 403 `CSRF_FAILED`
- [x] Logout: o cookie antigo reenviado → 401; resposta tem `Clear-Site-Data`
- [x] Logout-all derruba sessões abertas em dois "navegadores" (dois cookies)
- [x] 11º login no mesmo minuto e IP → 429
- [x] Nenhum log contém cookie, csrf ou e-mail

## SPEC-03 — Termos, política, maioridade e consentimento de pesquisa

Verificação: `backend/test/api/terms.test.ts`, E2E 1

- [x] Li e aceito os **Termos de Uso** (link abre o texto num painel)
- [x] Li a **Política de Privacidade** (link)
- [x] Declaro ter **18 anos ou mais**
- [x] *(opcional)* Aceito participar da pesquisa do TCC com meus dados anonimizados. Posso revogar quando quiser.
- [x] Usuário recém-criado → toda rota financeira devolve 403 `TERMS_REQUIRED`; o frontend redireciona para `/termos`
- [x] Aceite válido → rotas liberadas; registro no banco com as duas versões e `age_confirmed = true`
- [x] Faltando qualquer um dos 3 obrigatórios → 400 com `fields` e nada gravado
- [x] Trocar `TERMS_VERSION` para `1.1` → o mesmo usuário volta a receber 403 e vê a tela de novo (FA02)
- [x] Apagar o cookie `safe_terms` no navegador não muda nada no servidor (a prova está no banco)
- [x] Forjar `safe_terms=1.1|1.1` não libera nada
- [x] Consentimento de pesquisa pode ser dado e revogado; a revogação guarda `revoked_at`
- [x] `GET /me/export` e `DELETE /me` funcionam sem termos em dia

## SPEC-04 — Orçamento: renda, despesas, dívidas e reserva

Verificação: `backend/test/api/budget.test.ts`, `src/lib/crypto.test.ts`

- [x] CRUD completo das 4 entidades, com 404 para id de outro usuário (teste de IDOR com dois usuários)
- [x] Validações do §2 retornam 400 com mensagem por campo; nada é gravado
- [x] `description` gravada no banco não é legível (bytea cifrado); a API devolve o texto
- [x] Dívida criada com 10 parcelas em 29/10 → `remainingNow` 10 hoje; com relógio em 29/12 → 8; em 29/08 do ano seguinte → 0 e `active=false`
- [x] `balanceUsed` segue o D-04 com e sem `balanceDue`
- [x] Toda escrita gera uma linha de auditoria sem valores e invalida o cache
- [x] `buildSnapshot` só inclui dívidas ativas e usa `remainingNow` e `balanceUsed`
- [x] Limites de quantidade retornam 400 com mensagem clara

## SPEC-05 — Motor do IRE (indicadores, normalização, índice, faixas e fatores)

Verificação: `backend/src/engine/article.test.ts`, `engine.test.ts`, cobertura no CI

- [x] Todos os testes do §6 passam
- [x] Cobertura de `engine/` ≥ 80% de linhas e ramos (RNF08)
- [x] `engine/` não importa nada de `prisma`, `express`, `ioredis` nem `lib/` de infraestrutura (regra ESLint `no-restricted-imports`)
- [x] Nenhum `number` usado para valor monetário ou risco dentro de `engine/` (revisão + lint)

## SPEC-06 — Projeção do fluxo financeiro

Verificação: `backend/src/engine/projection.test.ts`, `test/api/analysis.test.ts`, E2E 5

- [x] Caso do artigo (R_m 4000, D 2000, dívida de R$ 400 com 10 parcelas, Res 6000): FL_1..10 = 1600, FL_11..12 = 2000; Saldo_1 = 7600, Saldo_12 = 6000 + 16000 + 4000 = 26000; H = 12
- [x] Com `extra` {600, 12}: FL_1..10 = 1000, FL_11..12 = 1400
- [x] Dívida com 18 parcelas → H = 18; simulação com n = 24 → H = 24
- [x] `firstNonPositiveFreeMonth` e `firstNegativeBalanceMonth` corretos num cenário com déficit
- [x] Rótulos de mês corretos na virada de ano (dez/2026 → jan/2027)
- [x] Editar uma dívida e recarregar a projeção mostra o novo valor (cache invalidado)

## SPEC-07 — Análise da situação financeira e alertas

Verificação: `backend/test/api/analysis.test.ts`, `test/perf/latency.test.ts`, E2E 2

- [x] Caso do artigo → JSON com os valores do §3 (IRE 0,19, banda 1; fatores lf e cr principais)
- [x] Usuário sem renda → 409 e tela com o botão "Cadastrar renda"
- [x] Alterar uma dívida dispara `refresh`: `indicador_financeiro` atualizado e um único registro de histórico no dia, mesmo após 5 alterações
- [x] Faixa 3 cria `FAIXA_3` uma vez; recalcular sem mudança não duplica; baixar para faixa 2 marca como `LIDO`
- [x] CP ≤ 0 gera `CAPACIDADE_NEGATIVA` (sev. 5) mesmo com faixa baixa; renda residual < 600 gera `MINIMO_EXISTENCIAL`
- [x] CR > 100% → `exceedsIncome: true` e ícone de alerta na interface
- [x] p95 de `GET /analysis` ≤ 1 s (RNF01); com cache, < 300 ms (RNF13)

## SPEC-08 — Simulação de nova decisão financeira

Verificação: `backend/src/engine/simulation.test.ts`, `test/api/simulations.test.ts`, E2E 3 e 4

- [x] Caso do artigo (PRD §6.6) devolve exatamente: IRE 0,19 → 0,38, ΔIRE 0,185, ΔC {cr 0,12; cp 0,05; ne 0,015; lf 0}, π {64,9%; 27,0%; 8,1%; 0}, principais cr + cp, `AGRAVAMENTO`, severidade 2, renda residual 3000, custo 1200 e o texto do §2.6
- [x] Propriedades (fast-check): ΔIRE ≥ 0; ΔC_lf = 0; \|Σ ΔC − ΔIRE\| < 1e-9
- [x] V = 1000, n = 3, p = 333,33 é aceito; V = 1000, n = 3, p = 300 → `INCONSISTENT_SIMULATION`
- [x] Parcela que leva CP' ≤ 0 → `CRITICO` mesmo se a faixa não mudar
- [x] Renda residual depois = 599,99 → `CRITICO`; 600,00 → não crítico por essa regra
- [x] Usuário já saturado em CR (≥ 50%) → ΔC_cr = 0 com `saturatedBoth = true` e variação bruta exibida
- [x] Após simular, `GET /incomes|expenses|debts|reserves`, `/analysis` e `/history` retornam exatamente o mesmo de antes
- [x] p95 de `POST /simulations` ≤ 1 s

## SPEC-09 — Histórico e evolução do risco

Verificação: `backend/test/api/history.test.ts`, E2E 6

- [x] Usuário com 3 dias de alterações → 3 pontos em ordem
- [x] Várias alterações no mesmo dia → 1 ponto (o último valor)
- [x] `trend` correto nos 4 casos
- [x] Período fora do limite → 400
- [x] Histórico de outro usuário nunca aparece

## SPEC-10 — Direitos do titular: meus dados, exportação, exclusão e retenção

Verificação: `backend/test/api/privacy.test.ts`, E2E 8 e 9

- [x] Exportação contém todos os dados do usuário (descrições legíveis) e nenhum dado de outro usuário
- [x] Após `DELETE /me`: nenhuma linha com aquele `user_id` em nenhuma tabela; `aceitacao_termos` e `log_auditoria` só com `user_id NULL`; nenhuma chave Redis do usuário; o cookie antigo → 401
- [x] `confirm` ausente ou diferente de `EXCLUIR` → 400 e nada apagado
- [x] Jobs testados com relógio falso: conta inativa 12 meses + 1 dia é apagada; com 11 meses, não
- [x] `privacy:reapply-deletions` apaga usuários restaurados que estão na lista

## SPEC-11 — Frontend: base, navegação e componentes compartilhados

Verificação: `frontend/e2e/flows.spec.ts`, `frontend/src/**/*.test.ts(x)`

- [x] Depois de usar todas as telas, o DevTools mostra no `localStorage` só `theme`/`safe_cookie_notice`/`safe_onboarding_done` e nada em `sessionStorage` ou IndexedDB — *E2E 7 confere o armazenamento depois de sair; conferência manual no DevTools na T-11.7*
- [x] Logout numa aba leva as outras abas para `/login` sem dados na tela
- [x] Depois do logout, o botão "voltar" não mostra dados (resposta `no-store` + `replace`)
- [ ] Toda faixa de risco exibida tem ícone e rótulo; revisão com simulador de daltonismo — *pendente: revisão manual com simulador de daltonismo (T-11.7); ícone + rótulo já testados*
- [ ] Layout utilizável em 375 px (celular), 768 px e desktop; Chrome, Firefox, Safari e Edge — *parcial: 375 px no E2E 10 (Chromium); faltam Firefox, Safari e Edge (T-11.7)*
- [ ] Nenhuma requisição de rede a domínio externo além do redirecionamento de login do Google (aba Network) — *pendente: conferir na aba Network (T-11.7); não há CDN, fonte nem script de terceiros no código*
- [ ] Lighthouse Acessibilidade ≥ 90 no Dashboard e na Simulação — *pendente: rodar o Lighthouse (T-11.7)*

## SPEC-12 — Ferramentas de avaliação do modelo (Seção 7 do artigo)

Verificação: `evaluation/scripts/stats.test.ts`, `evaluation/results/`

- [x] `personas.csv` com 30 linhas e regras documentadas; o gerador produz o mesmo arquivo de novo
- [x] `especialistas.csv` não contém IRE nem faixa
- [x] `sensitivity` com pesos sem perturbação dá M = 0 (sanidade)
- [x] `simulation-check` reporta 0 falhas
- [x] `stats.ts` testado: Spearman de listas idênticas = 1; Kappa de avaliações idênticas = 1
- [x] Cada CSV tem cabeçalho com o commit e a data

## SPEC-13 — Qualidade, testes de integração, segurança e homologação

Verificação: `backend/test/security/suite.test.ts`, `frontend/e2e/`

- [x] **IDOR:** o usuário A tenta GET, PUT e DELETE em renda, despesa, dívida, reserva, simulação e alerta do usuário B → 404 em todos
- [x] **CSRF:** sem cabeçalho, com cabeçalho errado ou com `Origin` estranho → 403
- [x] **Sessão:** expiração ociosa, expiração absoluta, logout invalida, logout-all invalida
- [x] **Termos:** rotas financeiras sem aceite → 403
- [x] **Cabeçalhos:** CSP, HSTS (produção), `nosniff`, `no-referrer`, `no-store` em `/api`
- [x] **Cookies:** só os 4 previstos, com os atributos certos
- [x] **Logs:** capturar a saída do logger durante a suíte e verificar que não aparece e-mail, valor monetário de teste (ex.: `987654.32`), cookie nem csrf
- [x] **Criptografia:** `description` no banco ≠ texto; a API devolve o texto
- [x] **Exclusão:** nenhum resto do usuário no banco nem no Redis
- [x] **Entrada:** corpo > 10 KB → 413; valores negativos, `NaN`, `"1e9"` e strings enormes → 400
- [x] **Rate limit:** limites da SPEC-02 §6
- [x] **Rota de teste** ausente em produção
- [x] CI verde (lint, typecheck, unidade, integração, segurança, cobertura, `npm audit`) — *verde em todos os PRs*
- [x] E2E 1–10 passando localmente — *10/10 passando em 29/10/2026*
- [ ] Checklist "antes de abrir" da SEGURANCA_LGPD §12 completo — *pendente: checklist da equipe (inclui e-mail de contato e OAuth)*
- [x] README com instalação, variáveis, comandos, backup e restauração
- [ ] Tag `v1.0.0` no Git — *pendente: tag na homologação (T-13.5)*

## SPEC-14 — (Opcional) Aba "Entenda os dados"

Verificação: —

- [ ] Séries com fonte, unidade e data de extração exibidas — *opcional, não implementado*
- [ ] Filtro de período funciona — *opcional, não implementado*
- [ ] Nenhuma requisição do navegador a domínios externos — *opcional, não implementado*
- [ ] Nenhum texto sugere investimento ou produto financeiro — *opcional, não implementado*
- [ ] RF25, UC11 e HU24 acrescentados ao PRD e citados em uma frase na Seção 4 do artigo (ou em Trabalhos futuros, se não entrar) — *opcional, não implementado*

## SPEC-15 — Linguagem simples, glossário e ajuda contextual

Verificação: `frontend/src/content/language.test.ts`, `components/components.test.tsx`

- [x] `glossary.ts` com todas as entradas do §3, cada uma com `short`, `long` e pelo menos `example` ou `whyItMatters`
- [x] Teste unitário: todo `<Term id>` usado no código existe no glossário (varredura dos arquivos `.tsx`)
- [x] Teste unitário: nenhum `short` passa de 140 caracteres
- [x] Lint/teste de texto: as palavras `score`, `overdraft`, `budget`, `outcome`, `IRE`, `CR`, `CP`, `LF`, `NE`, `CET`, `Selic`, `LGPD` não aparecem soltas em textos de interface (só dentro de `<Term>` ou junto do nome por extenso)
- [x] `<Term>` abre com toque no celular, com teclado e com clique; fecha com Esc; tem `aria-expanded`
- [x] Todo campo de formulário tem `<FieldHelp>` com "o que é" e "por que pedimos"
- [x] Página `/glossario` com busca
- [ ] Revisão de texto com o checklist do §5 feita por alguém que não escreveu a tela — *pendente: revisão humana (T-15.6)*
- [ ] No estudo com usuários (artigo Seção 7.6), incluir a pergunta aberta "Algum termo ficou confuso?" e registrar as respostas para ajustar o glossário — *pendente: estudo com usuários (pós-entrega)*
