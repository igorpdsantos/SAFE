# Critérios de aceite — situação em 30/10/2026

Duas visões da mesma verificação:

1. **Por história de usuário (HU)**, para a seção "Corretude funcional" do artigo. As HUs e o Quadro 1 (critérios da HU09) vêm da especificação original (`docs/referencias/especificacao_software_original.pdf`, seção 3.1). Para as outras HUs, a especificação só dá a HU09 como exemplo; os critérios abaixo seguem o padrão do PRD §8 (cálculo conforme a Seção 5, estado vazio, dados ausentes, atualização imediata e acessibilidade), mais os critérios das specs que implementam cada RF.
2. **Por spec** (mais abaixo), com cada critério de aceite das `specs/SPEC-NN`.

`[x]` = atendido e verificado por teste automatizado (ou pela execução indicada); `[ ]` = pendente, com o motivo.

## Resumo por HU

| HU | RF | Critérios | Atendidos | Situação |
|---|---|---|---|---|
| HU01 Login com Google | RF01 | 5 | 4 | falta o projeto OAuth real (T-00.2) |
| HU02 Aceite dos termos | RF02 | 5 | 5 | ok |
| HU03 Aceite registrado em cookie | RF03 | 3 | 3 | ok |
| HU04 Renda | RF04, RF21 | 5 | 5 | ok |
| HU05 Despesas | RF05, RF21 | 5 | 5 | ok |
| HU06 Dívidas | RF06, RF21 | 5 | 5 | ok |
| HU07 Reserva | RF07, RF21 | 4 | 4 | ok |
| HU08 Alterar ou excluir dados | RF21 | 4 | 4 | ok |
| HU09 Comprometimento da renda | RF08 | 7 | 7 | ok |
| HU10 Nível de endividamento | RF09 | 4 | 4 | ok |
| HU11 Liquidez | RF10 | 4 | 4 | ok |
| HU12 Capacidade de pagamento | RF11 | 4 | 4 | ok |
| HU13 Classificação em faixas | RF13 | 4 | 3 | falta revisão com simulador de daltonismo (T-11.7) |
| HU14 Alertas visuais | RF15 | 5 | 5 | ok |
| HU15 Simular nova dívida | RF17 | 5 | 5 | ok |
| HU16 Comparar IRE atual e projetado | RF18 | 5 | 4 | falta Lighthouse ≥ 90 na Simulação (T-11.7) |
| HU17 Histórico | RF19 | 4 | 4 | ok |
| HU18 Gráfico de evolução | RF20 | 4 | 4 | ok |
| HU19 Exclusão da conta (LGPD) | RF24 | 5 | 5 | ok |
| HU20 Índice de risco (IRE) | RF12 | 5 | 4 | falta Lighthouse ≥ 90 no Painel (T-11.7) |
| HU21 Abertura dos indicadores | RF14 | 4 | 4 | ok |
| HU22 Fatores que mais pesaram | RF16 | 4 | 4 | ok |
| HU23 Linha do tempo do saldo | RF22, RF23 | 5 | 5 | ok |
| **Total** | | **105** | **101** | **96,2%** |

HU24 (RF25, aba "Entenda os dados") é opcional e não foi implementada (SPEC-14).

## Por história de usuário

### HU01 — Entrar com a conta Google (RF01)
*Como usuário, quero realizar o acesso à plataforma por meio de autenticação OAuth, para visualizar meus dados financeiros de maneira rápida e segura.*

- [x] Login com Google (Authorization Code + PKCE) cria o usuário no 1º acesso e reaproveita no 2º — `auth.test.ts` "cria o usuário no 1º acesso…"
- [x] Erros do login (cancelar, `state` adulterado, Google fora do ar, e-mail não verificado) levam a `/login` com mensagem — `auth.test.ts` "state adulterado…", "Google indisponível…"
- [x] Sessão opaca segura: cookie HttpOnly, sem tokens do Google guardados, expiração de 30 min ociosa e 8 h absoluta — `auth.test.ts` "sessão e cookies", "banco e Redis não guardam tokens"
- [x] Sair encerra a sessão em todas as abas e o "voltar" não mostra dados — `auth.test.ts` "logout…", E2E 7
- [ ] Login real com o Google em produção — *pendente: projeto no Google Cloud (T-00.2); hoje validado com o OIDC falso dos testes e o modo demonstração*

### HU02 — Ler e aceitar os termos antes do primeiro uso (RF02)
*Como usuário, quero ser notificado para ler e aceitar os termos de uso antes do primeiro acesso, para estar ciente das políticas de privacidade da plataforma.*

- [x] Usuário novo é levado para `/termos` e nenhuma rota financeira responde antes do aceite (403 `TERMS_REQUIRED`) — `terms.test.ts` "usuário recém-criado…", E2E 1
- [x] A tela traz os links dos Termos e da Política, a declaração de maioridade e o consentimento de pesquisa opcional, desmarcado — `terms.test.ts` "consentimento de pesquisa nunca vem marcado", E2E 1
- [x] Faltando um item obrigatório → 400 com o campo e nada gravado — `terms.test.ts`
- [x] Nova versão dos termos → o usuário vê a tela de novo (FA02) — `terms.test.ts` "FA02…"
- [x] Aceitar duas vezes não duplica o registro (FA01) — `terms.test.ts` "aceitar de novo não duplica"

### HU03 — Aceite registrado também em cookie (RF03)
*Como administrador do sistema, quero que o aceite dos termos de uso seja registrado via cookies, para manter a conformidade técnica sobre o consentimento do usuário.*

- [x] O aceite grava o cookie `safe_terms` com as versões aceitas — `terms.test.ts` "aceite válido grava…"
- [x] A prova do aceite fica no banco (versões, maioridade, data); o cookie é só informativo — `terms.test.ts` "aceite válido grava…"
- [x] Forjar ou apagar o cookie não libera nem bloqueia nada — `terms.test.ts` "o servidor ignora o cookie safe_terms…"

### HU04 — Cadastrar e editar a renda (RF04, RF21)
*Como usuário, quero cadastrar e editar o valor da minha renda mensal, para manter a base de cálculo da minha capacidade financeira atualizada.*

- [x] Criar, listar, editar e excluir renda, com valores decimais como texto (sem `number`) — `budget.test.ts` "CRUD do orçamento", "formato da renda"
- [x] Validação com mensagem que diz o que fazer; nada é gravado — `budget.test.ts` "validações", "mensagem de erro diz o que fazer"
- [x] Estado vazio: sem renda, o painel não calcula e mostra o botão "Cadastrar renda" — `analysis.test.ts` "sem renda → 409", E2E 1
- [x] Atualização imediata: salvar invalida o cache e o painel recalcula — `budget.test.ts` "escrita apaga o cache…", E2E 2
- [x] Acessibilidade: todo campo com rótulo e ajuda ("o que é" e "por que pedimos") — `language.test.ts`

### HU05 — Cadastrar e editar despesas (RF05, RF21)
*Como usuário, quero cadastrar e editar minhas despesas fixas e variáveis, para ter um mapa exato do meu custo de vida.*

- [x] CRUD de despesas fixas e variáveis por categoria — `budget.test.ts` "CRUD do orçamento", E2E 2
- [x] Descrição opcional criptografada no banco; a API devolve o texto — `budget.test.ts` "descrição criptografada"
- [x] Validação e limite de quantidade com mensagem clara — `budget.test.ts` "validações", "limite de quantidade"
- [x] Atualização imediata do painel e da projeção — `budget.test.ts` "escrita apaga o cache…"
- [x] Acessibilidade: campos com rótulo e ajuda — `language.test.ts`

### HU06 — Cadastrar e editar dívidas (RF06, RF21)
*Como usuário, quero cadastrar e editar minhas dívidas e compromissos financeiros futuros, para monitorar as obrigações que irão impactar minha renda.*

- [x] CRUD de dívidas com parcela, parcelas restantes e saldo devedor opcional — `budget.test.ts`, E2E 2
- [x] Parcelas restantes caem com o tempo e a dívida fica inativa ao acabar (D-03) — `budget.test.ts` "10 parcelas em 29/10…"
- [x] Saldo devedor usa o informado ou parcela × restantes (D-04) — `budget.test.ts` "balanceDue informado…"
- [x] Atualização imediata do painel e da projeção — `analysis.test.ts` "alterar uma dívida 5 vezes…", E2E 5
- [x] Acessibilidade: campos com rótulo e ajuda — `language.test.ts`

### HU07 — Informar a reserva (RF07, RF21)
*Como usuário, quero informar e atualizar o valor da minha reserva financeira, para que a plataforma considere esse montante na análise da minha liquidez.*

- [x] CRUD de reserva; aceita zero — `budget.test.ts` "descrição vazia vira null; reserva e despesa aceitam zero"
- [x] A reserva entra no cálculo da liquidez (Res / D) — `article.test.ts`
- [x] Atualização imediata do painel — `budget.test.ts` "escrita apaga o cache…", E2E 2
- [x] Acessibilidade: campos com rótulo e ajuda — `language.test.ts`

### HU08 — Alterar ou excluir qualquer dado (RF21)
*Como usuário, quero ter a liberdade de alterar ou excluir qualquer informação financeira previamente cadastrada, para corrigir possíveis erros de digitação e refletir a realidade.*

- [x] Editar e excluir funcionam nas 4 entidades — `budget.test.ts` "CRUD do orçamento"
- [x] Excluir pede confirmação na tela — `ConfirmDialog` (E2E 9 usa o mesmo componente)
- [x] Recurso de outro usuário → 404 (IDOR) — `security/suite.test.ts` "IDOR"
- [x] Toda alteração gera auditoria só com os nomes dos campos — `budget.test.ts` "toda escrita gera auditoria…"

### HU09 — Comprometimento da renda (RF08)
*Como usuário, quero visualizar o percentual de comprometimento da minha renda com dívidas, para entender que parcela do meu salário já está comprometida.*

Critérios do Quadro 1 da especificação:

- [x] 1. CR = soma das parcelas mensais ativas / renda líquida — `article.test.ts` (caso do artigo: 400 / 4000 = 10%), `budget.test.ts` "buildSnapshot só com dívidas ativas"
- [x] 2. Exibido em porcentagem com 2 casas, arredondamento half-up — `present.test.ts` "critérios 2, 3 e 7" (`12,35%`)
- [x] 3. Sem dívidas, mostra 0% (exibido "0,00%", com as 2 casas do critério 2) — `engine.test.ts` "RF08 – sem dívidas…", `present.test.ts`
- [x] 4. Sem renda, não calcula e mostra o botão "Cadastrar renda" — `analysis.test.ts` "sem renda → 409", `States.tsx`, E2E 1
- [x] 5. Recalcula logo após salvar uma dívida — `analysis.test.ts` "usa o cache; uma escrita invalida e recalcula", invalidação no `api/hooks.ts`, E2E 2
- [x] 6. Verde < 30%, amarelo 30–50%, vermelho > 50%, sempre com ícone e rótulo — `present.test.ts` "critério 6", `components.test.tsx` "HU09 – critério 6"
- [x] 7. Acima de 100% mostra o valor (ex.: 115,00%) com ícone de alerta — `analysis.test.ts` "CR > 100%…", `components.test.tsx` "HU09 – critério 7"

### HU10 — Nível de endividamento (RF09)
*Como usuário, quero visualizar meu nível de endividamento baseado na renda mensal e no saldo devedor, para ter clareza sobre minha estabilidade financeira atual.*

- [x] NE = saldo devedor / renda, em meses de renda ("1,5 mês de renda") — `article.test.ts`, `analysis.test.ts` "caso do artigo"
- [x] Sem dívidas → 0 — `engine.test.ts` "RF08 – sem dívidas → cr 0 e ne 0"
- [x] Saturação acima de 20 meses com selo "no limite da escala" — `engine.test.ts` "ne = 20 → R_ne 1 e saturado"
- [x] Termo com explicação no glossário — `language.test.ts`

### HU11 — Liquidez (RF10)
*Como usuário, quero consultar minha liquidez financeira calculada com base na reserva e despesas, para saber por quanto tempo consigo me manter em caso de emergências.*

- [x] LF = reserva / despesas, exibido em meses ("3,0 meses") — `article.test.ts`, `analysis.test.ts` "caso do artigo"
- [x] Sem despesas → "Sem despesas cadastradas" e risco 0 (D-10) — `engine.test.ts` "D-10: D = 0 → lf null e R_lf 0"
- [x] 6 meses ou mais → risco 0 e selo "no limite da escala" — `engine.test.ts` "lf = 8 → R_lf 0 e saturado"
- [x] Texto em linguagem simples ("Reserva de emergência") com o termo técnico no glossário — `labels.test.ts` "nomes dos indicadores…"

### HU12 — Capacidade de pagamento (RF11)
*Como usuário, quero visualizar minha capacidade de pagamento calculada, para entender se possuo margem segura no orçamento para absorver novos custos.*

- [x] CP = renda − despesas − parcelas, em reais — `article.test.ts`, `analysis.test.ts` "caso do artigo"
- [x] Risco com clamp em [0, 1] (D-06) — `engine.test.ts` "D-06: cp = −600…"
- [x] CP ≤ 0 gera alerta crítico; renda residual < R$ 600 gera alerta de mínimo existencial — `analysis.test.ts` "CP ≤ 0 gera CAPACIDADE_NEGATIVA…"
- [x] Valor negativo exibido como "Faltam R$ … por mês" — `IndicatorCard.tsx`

### HU13 — Classificação em faixas (RF13)
*Como usuário, quero visualizar a classificação do meu risco financeiro em níveis, para compreender de forma simples a saúde geral das minhas finanças.*

- [x] 5 faixas pelo IRE arredondado (≤ 0,20 · ≤ 0,40 · ≤ 0,60 · ≤ 0,80 · resto) — `engine.test.ts` "T2: fronteiras de faixa"
- [x] Cada faixa com cor, ícone e rótulo, nunca só a cor (RNF05) — `labels.test.ts`, `components.test.tsx` "RiskBadge"
- [x] A faixa verde não promete nada ("garantia", "pode comprar") — `labels.test.ts` "a faixa verde não promete nada"
- [ ] Revisão com simulador de daltonismo — *pendente: verificação manual (T-11.7)*

### HU14 — Alertas visuais (RF15)
*Como usuário, quero receber alertas visuais na interface quando forem detectadas situações de risco financeiro alto, para evitar o agravamento da minha situação de crédito.*

- [x] Faixa 3 ou mais cria o alerta da faixa uma vez; recalcular sem mudança não duplica — `analysis.test.ts` "faixa 3 cria FAIXA_3 uma vez…"
- [x] Voltar a uma faixa menor marca o alerta como lido — `analysis.test.ts` (mesmo teste)
- [x] Capacidade negativa e mínimo existencial geram alertas mesmo com faixa baixa — `analysis.test.ts` "CP ≤ 0 gera…"
- [x] O usuário marca o alerta como lido; alerta de outro usuário → 404 — `analysis.test.ts` "GET /alerts e PATCH…"
- [x] Banner com ícone e texto, anunciado ao leitor de tela (`aria-live`) — `AlertBanner.tsx` no `Dashboard.tsx`; banner crítico da simulação no E2E 4

### HU15 — Simular uma nova dívida (RF17)
*Como usuário, quero simular uma nova decisão financeira preenchendo o valor total, a quantidade e o valor das parcelas, para visualizar o impacto desse novo custo antes de efetivá-lo.*

- [x] Formulário com valor total, número de parcelas e valor da parcela, cada campo com ajuda — `language.test.ts`, E2E 3
- [x] Parcelas incoerentes com o valor total → 400 `INCONSISTENT_SIMULATION` com mensagem — `simulations.test.ts` "1000 / 3 / 333,33…"
- [x] Sem renda → 409 e botão "Cadastrar renda" — `simulations.test.ts` "sem renda → 409"
- [x] A simulação nunca altera orçamento, análise, histórico nem alertas — `simulations.test.ts` "T-08.6…", E2E 3
- [x] Responde em até 1 s (p95) — `test/perf/latency.test.ts`

### HU16 — Comparar o índice atual e o projetado (RF18)
*Como usuário, quero visualizar uma comparação direta entre o meu índice de risco atual e o índice projetado após a simulação, para decidir de maneira consciente se devo ou não assumir a nova dívida.*

- [x] Caso do artigo: 0,19 → 0,38, ΔIRE 0,185, `AGRAVAMENTO` — `article.test.ts`, `simulations.test.ts`, E2E 3
- [x] Desfechos na ordem Crítico → Agravamento → Sem agravamento, com banner crítico — `simulation.test.ts`, E2E 4
- [x] Tabela "antes e depois" de cada indicador com a faixa (cor + ícone + rótulo) — `Simulate.tsx`, E2E 3
- [x] Texto explica o resultado sem dizer "pode comprar" — `labels.test.ts`, `language.test.ts`
- [ ] Lighthouse Acessibilidade ≥ 90 na Simulação — *pendente: T-11.7*

### HU17 — Guardar o histórico (RF19)
*Como usuário, quero que a plataforma armazene o histórico dos meus indicadores e do índice de risco, para criar uma linha do tempo da minha trajetória financeira.*

- [x] Cada alteração no orçamento grava o ponto do dia — `analysis.test.ts` "alterar uma dívida 5 vezes… um único registro de histórico no dia"
- [x] Várias alterações no mesmo dia → 1 ponto com o último valor — `history.test.ts`
- [x] Simulações não entram no histórico — `simulations.test.ts` "T-08.6…"
- [x] Histórico de outro usuário nunca aparece — `history.test.ts`

### HU18 — Gráfico de evolução (RF20)
*Como usuário, quero acessar gráficos que apresentem a evolução do meu índice de risco financeiro, para acompanhar visualmente meu progresso ao longo dos meses.*

- [x] Gráfico com os pontos em ordem e filtro de período — `history.test.ts`, E2E 6
- [x] Tendência nos 4 casos (melhorando, piorando, estável, insuficiente) — `history.test.ts` "trend … → …"
- [x] Estado vazio com explicação; poucos pontos → "ainda não há dados suficientes para mostrar uma tendência" — `history.test.ts` "0 pontos → lista vazia e INSUFICIENTE", `Evolution.tsx`
- [x] Tabela com os mesmos dados para leitor de tela (o gráfico é `aria-hidden`) — `Evolution.tsx`

### HU19 — Excluir a conta e os dados (RF24)
*Como usuário, quero ter a opção de solicitar o cancelamento da conta e a exclusão definitiva dos meus dados financeiros e perfis da base de dados, para garantir meu direito à privacidade de acordo com as diretrizes da LGPD.*

- [x] Exclusão pede digitar `EXCLUIR`; sem isso → 400 e nada apagado — `privacy.test.ts`, E2E 9
- [x] Apaga tudo: nenhuma linha com o `user_id`, nada no Redis, sessão derrubada — `privacy.test.ts` "apaga tudo…", `security/suite.test.ts`
- [x] Funciona mesmo sem termos em dia — `privacy.test.ts` "exportar e excluir funcionam sem termos em dia"
- [x] Exportação dos dados antes de excluir (JSON) — `privacy.test.ts`, E2E 8
- [x] Exclusões são reaplicadas depois de restaurar um backup — `privacy.test.ts` "privacy:reapply-deletions"

### HU20 — Índice de risco consolidado (RF12)
*Como usuário, quero que o sistema calcule um índice consolidado do meu risco financeiro com base nos meus dados, para compreender a fragilidade da minha situação atual e planejar ações que evitem o agravamento do meu crédito a longo prazo.*

- [x] IRE = Σ wᵢ·Rᵢ com precisão total; arredondado só para exibir (caso do artigo: 0,1925 → 0,19) — `article.test.ts`, E2E 2
- [x] Propriedades: 0 ≤ IRE ≤ 1, determinístico — `engine.test.ts` "T6: propriedades"
- [x] Sem renda → não calcula (409) — `engine.test.ts` "renda 0 → InsufficientDataError", `analysis.test.ts`
- [x] Responde em até 1 s (p95), com cache abaixo de 300 ms — `test/perf/latency.test.ts`
- [ ] Lighthouse Acessibilidade ≥ 90 no Painel — *pendente: T-11.7*

### HU21 — Abertura dos indicadores (RF14)
*Como usuário, quero visualizar a abertura dos indicadores que compõem meu índice de risco, para aprender de que forma o meu endividamento e liquidez afetam minha saúde financeira e utilizar esse conhecimento para planejar ações corretivas.*

- [x] 4 cards (comprometimento, folga mensal, reserva, tamanho das dívidas) com valor, unidade, frase e interpretação — `IndicatorCard.tsx`, E2E 2
- [x] Barra do risco de 0 a 1 com o texto "Risco 0,20 de 1" — `RiskBar.tsx`
- [x] Selo "no limite da escala" quando saturado — `engine.test.ts` "T3: saturações"
- [x] Cada nome abre a explicação do glossário (toque, teclado e clique) — `components.test.tsx` "T-15.3 – <Term>"

### HU22 — Fatores que mais pesaram (RF16)
*Como usuário, quero entender quais indicadores específicos impactaram negativamente a minha avaliação e elevaram o meu nível de risco, para monitorar esses fatores com mais atenção antes de assumir novos compromissos.*

- [x] Participação de cada indicador no índice; principais marcados (caso do artigo: reserva e comprometimento) — `analysis.test.ts` "caso do artigo… fatores lf e cr principais"
- [x] Na simulação, decomposição da variação (π: 64,9%, 27,0%, 8,1%) — `article.test.ts`, `simulations.test.ts`
- [x] IRE = 0 → sem decomposição; ΔIRE = 0 → sem π — `engine.test.ts` "tudo ótimo → IRE 0 e contributions null", `simulation.test.ts`
- [x] Propriedade |Σ ΔC − ΔIRE| < 1e-9 — `simulation.test.ts` (fast-check)

### HU23 — Linha do tempo do saldo (RF22, RF23)
*Como usuário, quero acompanhar a evolução das minhas finanças através de uma linha do tempo com meu saldo futuro, para mapear os meses em que minhas despesas sufocarão minha renda e tomar decisões prévias que evitem um efeito cascata de inadimplência.*

- [x] Caso do artigo: folga 1600 nos meses 1–10 e 2000 nos 11–12; saldo final 26000 — `projection.test.ts`
- [x] Horizonte = maior prazo entre as dívidas (mínimo 12 meses) — `projection.test.ts`
- [x] Primeiro mês sem folga e primeiro mês com saldo negativo destacados — `projection.test.ts`
- [x] Editar uma dívida atualiza a projeção — `analysis.test.ts` "editar uma dívida e recarregar…", E2E 5
- [x] Gráfico com tabela equivalente e rótulos de mês na virada do ano — `ProjectionPage.tsx`, `engine.test.ts` "rótulos de mês com virada de ano"

---

# Por spec

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
- [x] CR > 100% → `exceedsIncome: true` e ícone de alerta na interface — *ícone testado em `components.test.tsx` "HU09 – critério 7"*
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
