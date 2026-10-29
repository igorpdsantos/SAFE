# SPECS — Índice das especificações do SAFE

Cada spec é a definição **implementável** de uma parte do sistema: contratos (tipos e JSON), regras, telas, erros e critérios de aceite. Este arquivo só agrega e resume; **o conteúdo de verdade está em `specs/`**.

## Como usar
- **Nome:** `SPEC-NN` (dois dígitos, sem reaproveitar número). Arquivo: `specs/SPEC-NN-nome-curto.md`.
- **Tarefas:** cada spec vira tarefas `T-NN.M` no `TASKS.md` (ex.: `T-05.3` é a 3ª tarefa da SPEC-05), cada uma com sua trilha (`A`, `B` ou `A+B`; ver `CONTRIBUTING.md`). Em geral, a trilha A faz o backend de cálculo (01, 04–09 API, 12) e a B faz login, privacidade, frontend e testes (02, 03, 10, 11, 13–15).
- **Hierarquia:** `PRD.md` (o quê e por quê) → `SEGURANCA_LGPD.md` (regras de privacidade e segurança) → `specs/` (como, em detalhe) → `TASKS.md` (execução). Se uma spec conflitar com o PRD ou com a SEGURANCA_LGPD, **pare e corrija a spec** antes de codar.
- **Mudou uma regra?** Atualize a spec, a linha dela aqui (se o resumo mudou) e as tarefas afetadas.
- **Status possíveis:** Rascunho · Aprovada para implementação · Implementada · Opcional.

## Mapa de dependências
```
SPEC-01 Fundação ──┬─> SPEC-02 Login/Sessão ──> SPEC-03 Termos ──┐
                   │                                              ├─> SPEC-04 Orçamento ──┬─> SPEC-07 Análise ──> SPEC-09 Histórico
SPEC-05 Motor IRE ─┼──────────────────────────────────────────────┘                       ├─> SPEC-08 Simulação
                   └─> SPEC-06 Projeção ──────────────────────────────────────────────────┘
SPEC-11 Frontend base ──> SPEC-15 Linguagem/Glossário ──> telas das SPEC-03, 04, 06–10, 14
SPEC-10 Privacidade (depois da 04) · SPEC-12 Avaliação (depois da 05/08) · SPEC-13 Qualidade (contínua) · SPEC-14 Opcional (por último)
```
**Caminho crítico até 02/11:** 01 → 05 → 04 → 07 → 08 (+ 11 e 15 para as telas).

## Especificações

| Spec | Título | Resumo | Rastreabilidade | Depende de |
|---|---|---|---|---|
| [SPEC-01](specs/SPEC-01-fundacao.md) | Fundação do projeto | Monorepo, Docker (Postgres + Redis), Prisma com **todas** as tabelas, Express com middlewares base (helmet/CSP, `no-store`, limite 10 KB), logger sem dados pessoais, **decimal como string no JSON**, formato único de erro, `.env.example` e CI | RNF02, RNF08, RNF12, RNF15 · D-02 | — |
| [SPEC-02](specs/SPEC-02-autenticacao-sessao.md) | Autenticação e sessão | Login Google (OIDC + PKCE, escopo `openid email`, sem guardar tokens do Google), **sessão opaca no Redis** (30 min ociosa / 8 h absoluta), CSRF (*double submit* + Origin), logout, logout-all, rate limits | UC01 · RF01 · HU01 · S-01 | 01 |
| [SPEC-03](specs/SPEC-03-termos-consentimento.md) | Termos, política, 18+ e consentimento de pesquisa | Aceite **versionado** com prova no banco (o cookie é só atalho), declaração de maioridade, consentimento de pesquisa separado e revogável, middleware `requireTermsAccepted`, faixa informativa de cookies | UC02 · RF02, RF03 · HU02, HU03 · S-03, S-07, S-09 | 02 |
| [SPEC-04](specs/SPEC-04-orcamento.md) | Orçamento | CRUD de renda, despesas, dívidas e reserva com **categorias**, descrição curta **criptografada**, parcelas restantes calculadas pela `reference_date`, saldo usado no cálculo, auditoria sem valores, evento `budgetChanged` e o **snapshot** para o motor | UC03–UC06 · RF04–RF07, RF21 · HU04–HU08 · D-03, D-04 | 01, 02, 03, 05 (tipos) |
| [SPEC-05](specs/SPEC-05-motor-ire.md) | **Motor do IRE** | Funções puras: totais, 4 indicadores, normalização (com teto em R_CP), IRE, faixas (pelo valor arredondado), decomposição estática com os 75%, regras críticas, `elapsedMonths`, config injetável. **Testes com o caso do artigo** e propriedades | RF08–RF14, RF16 · HU09–HU13, HU20–HU22 · D-05, D-06, D-10 | 01 (só decimal) |
| [SPEC-06](specs/SPEC-06-projecao.md) | Projeção do fluxo | `project()` puro: sobra mensal e saldo acumulado em horizonte max(12, parcelas), com ou sem nova parcela; endpoint com cache; gráfico + tabela + premissas | UC08 · RF22, RF23 · HU23 · D-08 | 05 (04 para o endpoint) |
| [SPEC-07](specs/SPEC-07-analise-alertas.md) | Análise e alertas | `GET /analysis` com indicadores formatados, IRE, faixa, fatores e alertas; `refresh` no `budgetChanged` grava o indicador vigente, **1 ponto de histórico por dia** e alertas sem duplicar; Dashboard | UC07 · RF08–RF16 · HU09–HU14, HU20–HU22 · D-09, D-14 | 04, 05 |
| [SPEC-08](specs/SPEC-08-simulacao.md) | **Simulação** | Validação (tolerância de 1 centavo), cenário em memória, ΔIRE e ΔC_i exatos, π_i, desfechos (crítico → agravamento → sem agravamento), explicação em texto, projeção dupla; **não altera o orçamento**; tela em 4 blocos | UC09 · RF15–RF18 · HU14–HU16 · D-07, D-11, D-12 | 04, 05, 06 |
| [SPEC-09](specs/SPEC-09-historico.md) | Histórico e evolução | `GET /history` por período com tendência (melhorando/estável/piorando); gráfico com faixas de fundo + tabela | UC10 · RF19, RF20 · HU17, HU18 | 07 |
| [SPEC-10](specs/SPEC-10-privacidade-dados.md) | Direitos do titular | "Meus dados", exportação JSON, **exclusão definitiva** em cascata (com registro mínimo sem e-mail), jobs de retenção (inativos 12 meses, simulações 12 meses, auditoria 6 meses), procedimento de backup e restauração | RF24 · HU19 · RNF09, RNF11 · S-06 | 02, 03, 04 |
| [SPEC-11](specs/SPEC-11-frontend-base.md) | Frontend base | Rotas, guardas, cliente HTTP com CSRF, **nada persistido no navegador** (lista fechada de chaves), limpeza no logout e entre abas, tokens de cor das faixas, componentes de risco acessíveis, layout responsivo, tela de login | RNF05, RNF06, RNF10, RNF13 | 01, 02, 03 |
| [SPEC-12](specs/SPEC-12-avaliacao.md) | Ferramentas de avaliação | 30 personas reprodutíveis, planilha cega para especialistas, Spearman/Kappa, **sensibilidade** (M por peso e por limite), comparação com a regra só de CR, verificação da simulação, latência; resultados em CSV para o artigo | PRD §9 · artigo §7 (PA1–PA4) · RNF01 | 05, 08 |
| [SPEC-13](specs/SPEC-13-qualidade-testes.md) | Qualidade e homologação | Pirâmide de testes, **suíte de segurança** (IDOR, CSRF, sessão, cookies, logs, cripto, exclusão), 10 fluxos E2E, métricas para o artigo, checklist de entrega | RNF01, RNF05–08, RNF10, RNF13–15 | todas |
| [SPEC-14](specs/SPEC-14-entenda-os-dados.md) | *(Opcional)* Entenda os dados | Aba educativa com séries Peic/BCB (5 anos, filtro), glossário e "como o SAFE calcula"; dados estáticos versionados; sem orientação de investimento | RF25 · UC11 · HU24 (novos) | 01, 11, 15 |
| [SPEC-15](specs/SPEC-15-linguagem-glossario.md) | **Linguagem simples e glossário** *(transversal)* | Regras L1–L12 (sigla nunca sozinha, termo com tradução, número com significado, todo pedido diz **para que serve**, todo resultado diz **o que fazer**), glossário central com 33 termos, componentes `<Term>` (tooltip por toque/teclado), `<FieldHelp>`, `<HelpPanel>`, `<ResultExplainer>`, página `/glossario`, onboarding | RNF05 · SEGURANCA_LGPD §2.3/§7 · pedido da equipe | 11 |

## Cobertura dos requisitos
| Requisito | Spec |
|---|---|
| RF01 | 02 |
| RF02, RF03 | 03 |
| RF04–RF07, RF21 | 04 |
| RF08–RF14 | 05 (cálculo) + 07 (API e tela) |
| RF15 | 07 (situação atual) + 08 (simulação) |
| RF16 | 05 (estática) + 07 + 08 (dinâmica) |
| RF17, RF18 | 08 |
| RF19, RF20 | 07 (gravação) + 09 (leitura) |
| RF22, RF23 | 06 |
| RF24 | 10 |
| RF25 (opcional) | 14 |
| RNF01 | 12, 13 |
| RNF02, RNF03 | 01, 02, 04 |
| RNF05 | 11, 15 |
| RNF06 | 11 |
| RNF08 | 05, 13 |
| RNF09, RNF11 | 10 |
| RNF10 | 11 |
| RNF12 | 01, 05 |
| RNF13 | 07, 11 |
| RNF14 | 05 |
| RNF15 | 01, 04 |
| RNF04 (99,5%) e RNF07 (100 usuários) | metas declaradas; não verificadas no TCC (PRD §10) |
