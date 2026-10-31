# PRD — SAFE: Sistema de Apoio à decisão Financeira e prevenção do Endividamento

| | |
|---|---|
| **Produto** | SAFE (na especificação aparece como SARE; o nome oficial passa a ser SAFE) |
| **Contexto** | TCC de Engenharia de Software, Universidade São Judas Tadeu. Orientador: Prof. Nelson Aguiar |
| **Equipe** | Gabriel D. M. Ferreira, Guilherme P. Santos, Gustavo C. G. Perez, Gustavo X. F. Santos, Higor S. Santos, Igor P. Santos, Matheus C. Silva, Michael D. Braga |
| **Fontes** | `docs/referencias/artigo_completo.tex` (modelo IRE e simulação, Seções 4 a 7), `docs/referencias/especificacao_software_original.pdf` (especificação: RF, RNF, UC, HU, modelo de dados), áudio do grupo de 28/10/2026 (dashboard) |
| **Status** | Nenhum código escrito em 29/10/2026. Entrega do software: **02/11/2026** |
| **Versão** | 1.0 — 29/10/2026 |

Em caso de conflito, esta é a ordem de precedência: **este PRD** > artigo > especificação em PDF. Para segurança, privacidade, login, sessão, cookies e armazenamento no navegador, vale o **`SEGURANCA_LGPD.md`**, que prevalece sobre este PRD nesses temas. Este PRD já resolve as inconsistências conhecidas entre os dois documentos. A Seção 12 lista as decisões tomadas e o que ainda precisa ser validado pelo grupo.

### Documentos do projeto
| Arquivo | Papel |
|---|---|
| `README.md` | Porta de entrada: visão geral, mapa dos documentos, estrutura, como rodar e como trabalhar |
| `PRD.md` (este) | O quê e por quê: problema, escopo, modelo matemático, requisitos, decisões |
| `SEGURANCA_LGPD.md` | Regras de privacidade e segurança (prevalece nesses temas) |
| `SPECS.md` + `specs/SPEC-NN-*.md` | Como, em detalhe: contratos, regras, telas e critérios de aceite de cada parte |
| `TASKS.md` | Execução: tarefas `T-NN.M` com status `[ ]` / `[~]` / `[x]` atualizado em tempo real |
| `CLAUDE.md` / `AGENTS.md` | Instruções para quem programa (pessoa ou qualquer IA): stack, convenções e fluxo de trabalho |
| `CONTRIBUTING.md` | Fluxo no GitHub: duas trilhas (A e B), branches, PRs, merges na `main` e arquivos com risco de conflito |

---

## 1. Problema

Em julho de 2026, 82,0% das famílias brasileiras tinham dívidas, 29,8% tinham contas em atraso e 19,0% dos endividados comprometiam mais da metade da renda com dívidas (Peic/CNC). Os aplicativos de finanças pessoais registram o passado ("para onde foi o dinheiro"). Nenhum responde, **antes da contratação**, o que acontece com o orçamento se a pessoa assumir um novo compromisso.

## 2. Objetivo do produto

Permitir que o consumidor:
1. registre sua situação financeira (renda, despesas, dívidas e reserva);
2. veja um diagnóstico do risco atual pelo **Índice de Risco de Endividamento (IRE)**, com os fatores que o explicam;
3. **simule** uma nova compra parcelada ou empréstimo e compare o risco atual com o projetado antes de contratar;
4. acompanhe a projeção do fluxo mensal e a evolução do risco ao longo do tempo.

O SAFE **descreve** o impacto de uma decisão. Ele **não autoriza, não bloqueia, não recomenda produtos e não indica investimentos**.

### Objetivos da solução (DSR)

| Objetivo | Descrição | Sprint |
|---|---|---|
| OS1 | Registrar a situação financeira com segurança e conformidade com a LGPD | 1 |
| OS2 | Diagnosticar a saúde financeira atual (indicadores, IRE, projeção) | 2 |
| OS3 | Apoiar a decisão antes de contrair novas dívidas (simulação, comparação, alertas, fatores) | 3 |
| OS4 | Acompanhar a evolução do risco (histórico e gráfico) | 4 |

### Requisitos de projeto (RP)

| RP | Descrição | RFs |
|---|---|---|
| RP1 | Representar a situação financeira | RF04–RF07, RF21 |
| RP2 | Quantificar o risco | RF08–RF13 |
| RP3 | Antecipar o efeito das decisões | RF17, RF18, RF22, RF23 |
| RP4 | Explicar o resultado | RF14–RF16, RF19, RF20 |
| RP5 | Proteger os dados pessoais | RF01–RF03, RF24 |

## 3. Usuários

- **Usuário (ator principal):** consumidor adulto que pensa em assumir uma compra parcelada ou um empréstimo. Pode ter pouco letramento financeiro e não conhecer termos e siglas de finanças. **Regra de produto:** o usuário precisa sempre entender o que está vendo, o que está sendo pedido, para que serve e o que pode fazer com o resultado. Todo termo técnico ou sigla vem com explicação (texto entre parênteses e tooltip), e todo pedido de dado diz a finalidade (RNF16, SPEC-15).
- **Provedor OAuth 2.0 (ator secundário):** Google Identity. O SAFE não armazena senhas.

## 4. Escopo

### Dentro do escopo (v1)
- Login OAuth (Google), aceite versionado dos termos e exclusão definitiva da conta.
- CRUD de renda (várias fontes), despesas (fixas e variáveis), dívidas e reserva (pode haver várias).
- Cálculo dos 4 indicadores, do IRE, da faixa, da decomposição estática e dos alertas.
- Projeção do fluxo livre mensal e do saldo acumulado.
- Simulação de **nova obrigação parcelada** (valor V, n parcelas, parcela p) com comparação, decomposição ΔC_i, desfechos e explicação textual.
- Histórico do IRE e gráfico de evolução.
- Scripts de avaliação do modelo (personas, sensibilidade, comparação com regra simples), necessários para a Seção 7 do artigo.

### Fora do escopo (v1)
- Simular nova **despesa recorrente** (o modelo só cobre parcelas; ver D-07).
- Juros e CET, pagamento com a reserva, amortização antecipada, cenários de estresse, renda variável, orçamento familiar.
- Open Finance ou integração bancária.
- Recomendação de produtos ou investimentos.
- Mínimo existencial personalizado (o valor é um parâmetro fixo).

### Módulo "Entenda os dados" (opcional; implementado em 31/10/2026, SPEC-14)
Proposto no áudio de 28/10. É uma aba com gráficos de séries públicas (Peic/CNC e BCB/SGS, últimos 5 anos), com filtro por período e glossário (Selic, inadimplência, comprometimento de renda), explicando o contexto e o que o IRE avalia. **Regras:** dados estáticos versionados no repositório (JSON/CSV com fonte e data de extração), sem orientação de investimento e sem impacto no cálculo do IRE. Recebe a identificação **RF25 / UC11 / HU24**. O módulo de cálculo do IRE e a simulação vêm antes dele.

- **HU24:** "Como usuário, quero ver dados públicos sobre endividamento e entender os termos usados, para interpretar melhor meu próprio resultado."
- **UC11 – Consultar o contexto do endividamento.** Ator: usuário logado. Fluxo principal: (1) abre "Entenda os dados"; (2) o sistema mostra as séries da Peic/CNC (famílias endividadas, em atraso, sem condição de pagar e renda comprometida) e do BCB/SGS (29037 endividamento, 29034 comprometimento da renda com ajuste sazonal — a 29265, sem ajuste, fica na tabela — e 4189 Selic), cada uma com fonte, unidade e data de extração; (3) o usuário escolhe o período (1, 3 ou 5 anos, ou os meses); (4) lê "Como o SAFE calcula seu risco" (pesos, faixas e limitações) e o glossário. Regra: os dados vêm de CSVs versionados (`backend/data/context/`, atualizados pela equipe com `npm run context:update`); o navegador nunca acessa sites de terceiros e nada disso altera o IRE.

---

## 5. Modelo matemático (núcleo do produto)

> Fonte: artigo, Seções 5 e 6. **Toda a aritmética usa decimal de ponto fixo** (nunca `number`/`float`). Ver a Seção 5.8 sobre arredondamento.

### 5.1 Entradas consolidadas

| Símbolo | Definição | Origem |
|---|---|---|
| R_m | Renda mensal líquida = soma de `RENDA.MONTH_VALUE` do usuário | RF04 |
| D | Despesas mensais = soma de `DESPESA.VALUE` (fixas + variáveis) | RF05 |
| P_Σ | Soma das parcelas das dívidas **ativas** (parcelas restantes ≥ 1) | RF06 |
| S_Σ | Saldo devedor total das dívidas ativas (ver D-04) | RF06/RF09 |
| Res | Reserva = soma de `RESERVA_FINANCEIRA.RESERVE_VALUE` | RF07 |
| m_j | Parcelas restantes da dívida j **no mês corrente** (ver D-03) | RF06 |

**Pré-condição do cálculo:** R_m > 0. Sem renda, nada é calculado e a interface mostra o botão "Cadastrar renda" (UC07 E01, HU09 critério 4).

### 5.2 Indicadores brutos (RF08–RF11)

```
CR = P_Σ / R_m                       comprometimento da renda (razão; exibir em %)
NE = S_Σ / R_m                       nível de endividamento (em "meses de renda")
LF = Res / D                         liquidez (em "meses de despesa"); se D = 0 → ver 5.3
CP = R_m − (D + P_Σ)                 capacidade de pagamento (R$/mês; pode ser negativa)
```

### 5.3 Normalização em risco [0, 1]

```
R_CR = min(CR / 0,50 , 1)
R_NE = min(NE / 12 , 1)
R_LF = max(1 − LF / 6 , 0)           se D = 0 → R_LF = 0
R_CP = clamp(1 − CP / (0,30 · R_m), 0, 1)
```

> **Atenção:** a fórmula de R_CP no artigo é `max(1 − CP/(0,30·R_m), 0)`, sem teto. Com CP negativo, o resultado passa de 1 (ex.: CP = −600 e R_m = 4000 dá 1,5). O texto do artigo diz que "CP negativo ou nulo mantém o risco no **limite máximo**", então a implementação **deve** aplicar o teto em 1. O artigo deve ser corrigido para `min(max(…, 0), 1)`.

**Saturação:** um indicador está "no limite da escala" quando seu R_i é 0 ou 1 por efeito do min/max (R_CR = 1 com CR ≥ 0,5; R_NE = 1 com NE ≥ 12; R_LF = 0 com LF ≥ 6; R_CP = 1 com CP ≤ 0; R_CP = 0 com CP ≥ 0,3·R_m).

### 5.4 Pesos e IRE (RF12)

| Indicador | Peso W_i |
|---|---|
| CR — comprometimento da renda | 0,40 |
| CP — capacidade de pagamento | 0,30 |
| LF — liquidez | 0,20 |
| NE — nível de endividamento | 0,10 |

```
IRE = 0,40·R_CR + 0,30·R_CP + 0,20·R_LF + 0,10·R_NE        ∈ [0, 1]
```

Pesos, tetos de normalização (0,50; 12; 6; 0,30), limites das faixas, δ e ME devem ficar em **um único objeto de configuração**, injetável no motor. A análise de sensibilidade (Seção 9) depende disso.

### 5.5 Faixas de risco (RF13)

A classificação usa o **IRE arredondado em 2 casas** (half-up), o que torna as faixas contíguas.

| Nível | Faixa | IRE arredondado | Cor | Recomendação exibida |
|---|---|---|---|---|
| 1 | Baixo | 0,00–0,20 | verde | Orçamento equilibrado; segundo os critérios do modelo, comporta novos compromissos. Não é garantia. |
| 2 | Moderado | 0,21–0,40 | amarelo | Prudência e planejamento antes de novos créditos de longo prazo. |
| 3 | Atenção | 0,41–0,60 | laranja | Aproximando-se do limite; evite ampliar dívidas. |
| 4 | Alto | 0,61–0,80 | vermelho-claro | Interrompa novas contratações e redefina prioridades. |
| 5 | Crítico | 0,81–1,00 | vermelho-intenso + ícone | Foco em contenção de danos e renegociação. |

**RNF05:** a faixa **nunca** é transmitida só pela cor. Sempre aparecem também o ícone e o rótulo textual.

### 5.6 Decomposição estática (RF16 — "por que meu risco é este")

```
C_i = (R_i · W_i) / IRE            i ∈ {CR, CP, LF, NE};  Σ C_i = 1
```
- Usar o IRE **sem arredondar**.
- Se IRE = 0, não calcular e exibir "Não há fatores de risco".
- Ordenar de forma decrescente. Os "principais fatores" são o menor conjunto, em ordem decrescente, cuja soma de C_i atinge **75%**.

### 5.7 Alertas na situação atual (RF15, UC07)

- Faixa ≥ 3 (Atenção) gera alerta com severidade = nível da faixa.
- **Regra crítica (fora do índice):** CP ≤ 0 **ou** renda residual `R_m − P_Σ < ME` gera alerta com severidade 5, qualquer que seja a faixa.
- Os alertas são gravados em `ALERTA` (status `NAO_LIDO`/`LIDO`).

### 5.8 Precisão e arredondamento (RNF12) — regra única

1. Calcular indicadores, riscos, IRE e ΔC_i com **precisão total** (mínimo 10 casas decimais), sem arredondar etapas intermediárias.
2. Arredondar (half-up, 2 casas) **somente**: (a) o IRE usado para classificar a faixa; (b) os valores exibidos; (c) os valores persistidos em colunas `NUMERIC(…,2)`.
3. Motivo: se cada R_i fosse arredondado, Σ ΔC_i deixaria de bater com ΔIRE e o teste de consistência da PA4 falharia.

---

## 6. Simulação (RF17, RF18, UC09 — artigo Seção 6)

### 6.1 Entrada e validação
O usuário informa **V** (valor total), **n** (quantidade de parcelas) e **p** (valor da parcela).

| Regra | Erro |
|---|---|
| V > 0, p > 0, n inteiro ≥ 1 | UC09 E01: campos inválidos |
| n·p ≥ V − n·0,01 (tolerância de 1 centavo por parcela, para aceitar V=1000, n=3, p=333,33) | UC09 E02: "o total das parcelas é menor que o valor da compra" |
| Situação atual sem renda | UC09 E03 |

- **Custo financeiro implícito** = max(n·p − V, 0), exibido junto ao resultado.
- A nova obrigação entra como dívida com parcela p, n parcelas restantes e saldo **n·p**.

### 6.2 Cenário projetado (em memória, sem gravar nada no orçamento real)

```
CR_proj = (P_Σ + p) / R_m
NE_proj = (S_Σ + n·p) / R_m
CP_proj = CP − p
LF_proj = LF                       (premissa: a decisão não mexe na reserva nem nas despesas)
```
O IRE projetado corresponde ao **mês de maior exposição**, quando todas as parcelas estão ativas ao mesmo tempo. Como a nova dívida começa no próximo mês e toda dívida ativa tem m_j ≥ 1, esse mês é t = 1 e as fórmulas acima já o representam. É uma leitura conservadora do risco.

A interface informa as premissas: "a simulação considera que a compra não usa sua reserva e não muda suas despesas".

Apenas os parâmetros e o risco estimado vão para `SIMULACAO_FINANCEIRA`. Renda, despesas, dívidas e reserva **não mudam**.

### 6.3 Decomposição dinâmica ("o que a decisão muda")

```
ΔIRE = IRE_proj − IRE_atual = Σ_i W_i·(R_i_proj − R_i_atual) = Σ_i ΔC_i
π_i  = ΔC_i / ΔIRE                 (definido só se ΔIRE > 0)
```
Propriedades que **devem** ter teste automatizado:
- ΔIRE ≥ 0 para qualquer entrada válida;
- ΔC_LF = 0 sempre;
- |Σ ΔC_i − ΔIRE| < 1e-9 (sem arredondamento intermediário).

### 6.4 Desfechos (UC09 FA02/FA03)

Parâmetros: **δ = 0,05** e **ME = R$ 600,00** (configuráveis; ME é o valor presumido do Decreto 11.567/2023, tratado como parâmetro e não como verdade legal).

| Desfecho | Condição (avaliada nesta ordem) | Tratamento |
|---|---|---|
| Agravamento crítico | CP_proj ≤ 0 **ou** `R_m − (P_Σ + p) < ME` | Alerta de severidade máxima (5), qualquer que seja a faixa |
| Agravamento | ΔIRE ≥ δ **ou** faixa_proj > faixa_atual | Alerta com a severidade da faixa projetada |
| Sem agravamento relevante | caso contrário | Comparação sem alerta |

O sistema **nunca bloqueia** a decisão.

### 6.5 Apresentação (4 blocos)

1. **Síntese:** IRE atual e projetado, com faixa, cor, ícone e rótulo, e o ΔIRE.
2. **Fatores:** tabela ordenada por ΔC_i com valor bruto antes e depois, R_i antes e depois, ΔC_i em pontos e π_i. Os principais fatores (soma de π ≥ 75%) ficam em destaque. Indicadores com ΔC_i = 0 aparecem no fim com a nota "não alterado por esta decisão". Indicadores saturados nos dois cenários mostram a variação bruta e o rótulo "no limite da escala".
3. **Explicação textual:** gerada por templates por indicador, em linguagem simples. Exemplo:
   > "Esta compra elevaria o comprometimento da sua renda com dívidas de 10,0% para 25,0% e reduziria sua folga mensal de R$ 1.600 para R$ 1.000. Esses dois fatores respondem por 91,9% do aumento do risco."
4. **Projeção:** gráfico do fluxo livre mensal com e sem a decisão (Seção 7), marcando os meses com FL ≤ 0.

Casos especiais: ΔIRE = 0 mostra "Esta decisão não altera o índice" (sem ordenar fatores). Repetir a simulação com outros valores (FA01) não altera os dados.

### 6.6 Caso de teste de referência (artigo, Tabela "exemplo-sim")

Entradas: R_m = 4.000; D = 2.000; P_Σ = 400; S_Σ = 6.000; Res = 6.000. Simulação: V = 6.000, n = 12, p = 600 (custo implícito R$ 1.200).

| Indicador | Atual | Projetado | R_atual | R_proj | ΔC_i | π_i |
|---|---|---|---|---|---|---|
| CR | 10,0% | 25,0% | 0,20 | 0,50 | 0,120 | 64,9% |
| CP (R$) | 1.600 | 1.000 | 0,00 | 0,1667 | 0,050 | 27,0% |
| NE (meses) | 1,5 | 3,3 | 0,125 | 0,275 | 0,015 | 8,1% |
| LF (meses) | 3,0 | 3,0 | 0,50 | 0,50 | 0,000 | 0,0% |
| **IRE** | **0,1925 → 0,19 (Baixo)** | **0,3775 → 0,38 (Moderado)** | | | **0,185** | 100% |

Resultado esperado: desfecho **Agravamento** (mudou de faixa), principais fatores CR + CP (91,9%), renda residual R$ 3.000 ≥ ME (sem alerta crítico). **Esse caso deve ser o primeiro teste unitário do motor.**

---

## 7. Projeção do fluxo (RF22, RF23, UC08)

```
FL_t    = R_m − D − Σ_j P_j·1[t ≤ m_j] − p·1[t ≤ n]      (último termo só na série "com decisão")
Saldo_t = Res + Σ_{k=1..t} FL_k                           (saldo acumulado estimado)
```
- t = 1 é o próximo mês.
- **Horizonte:** H = max(12, maior m_j, n).
- Renda e despesas ficam constantes no horizonte.
- Marcar os meses com FL_t ≤ 0 e o primeiro mês com Saldo_t < 0.
- A projeção é calculada sob demanda e não é persistida (pode ir para o cache Redis).

---

## 8. Requisitos funcionais

Prioridade: **E** = Essencial, **I** = Importante, **D** = Desejável.

| ID | Requisito | Prior. | UC | HU | Sprint |
|---|---|---|---|---|---|
| RF01 | Login via OAuth 2.0 (Google) | E | UC01 | HU01 | 1 |
| RF02 | Exigir aceite dos termos (versão vigente) antes do uso | E | UC02 | HU02 | 1 |
| RF03 | Registrar o aceite também em cookie | E | UC02 | HU03 | 1 |
| RF04 | CRUD de renda mensal | E | UC03 | HU04 | 1 |
| RF05 | CRUD de despesas fixas e variáveis | E | UC04 | HU05 | 1 |
| RF06 | CRUD de dívidas e compromissos | E | UC05 | HU06 | 1 |
| RF07 | CRUD de reserva financeira | E | UC06 | HU07 | 1 |
| RF08 | Calcular CR | E | UC07 | HU09 | 2 |
| RF09 | Calcular NE | E | UC07 | HU10 | 2 |
| RF10 | Calcular LF | E | UC07 | HU11 | 2 |
| RF11 | Calcular CP | E | UC07 | HU12 | 2 |
| RF12 | Calcular o IRE | E | UC07 | HU20 | 2 |
| RF13 | Classificar em 5 faixas | E | UC07 | HU13 | 2 |
| RF14 | Exibir os indicadores usados no índice | E | UC07 | HU21 | 2 |
| RF15 | Exibir alertas de risco | I | UC07/UC09 | HU14 | 3 |
| RF16 | Informar os fatores que mais contribuíram | I | UC07/UC09 | HU22 | 3 |
| RF17 | Simular nova decisão (V, n, p) | I | UC09 | HU15 | 3 |
| RF18 | Comparar IRE atual e projetado | I | UC09 | HU16 | 3 |
| RF19 | Armazenar histórico de indicadores e IRE | D | UC10 | HU17 | 4 |
| RF20 | Gráfico de evolução do IRE | D | UC10 | HU18 | 4 |
| RF21 | Alterar ou excluir qualquer dado financeiro | I | UC03–06 | HU08 | 1 |
| RF22 | Projetar a situação financeira no tempo | E | UC08 | HU23 | 2 |
| RF23 | Exibir a evolução estimada do saldo | E | UC08 | HU23 | 2 |
| RF24 | Exclusão definitiva da conta e dos dados (LGPD) | I | — | HU19 | 1 |
| RF25 | *(opcional)* Aba "Entenda os dados" com séries Peic/BCB | D | UC11 | HU24 | — |

### Critérios de aceite de referência (HU09 — CR)
1. CR = soma das parcelas ativas / renda líquida.
2. Exibido em % com 2 casas.
3. Sem dívidas, mostra "0%".
4. Sem renda, não calcula e mostra o botão "Cadastrar renda".
5. Recalcula logo após salvar uma dívida.
6. Cores: verde < 30%, amarelo 30–50%, vermelho > 50%, sempre com rótulo.
7. CR > 100% mostra o valor (ex.: 115%) com ícone de alerta.

As demais HUs seguem o mesmo padrão: cálculo conforme a Seção 5, estado vazio, dados ausentes, atualização imediata e acessibilidade.

## 9. Ferramentas de avaliação (necessárias para a Seção 7 do artigo)

Scripts de linha de comando sobre o **mesmo motor** usado pela API:

| Script | Saída | Pergunta do artigo |
|---|---|---|
| `personas` | Lê `evaluation/personas.csv` (30 cenários com regras de geração documentadas) e gera IRE e faixa por persona | PA1 (planilha para os especialistas classificarem às cegas; depois, Spearman e Kappa ponderado) |
| `sensitivity` | Para cada peso w_i, perturbações de −20%, −10%, +10% e +20%, renormalizando a soma para 1, e calcula M = proporção de personas que mudam de faixa. Repete separadamente para os limites das faixas | PA2 (referência: M < 15% para ±10%) |
| `baseline` | Compara o IRE com a regra simples só de CR (limite padrão 30%, configurável) e lista as divergências | PA3 |
| `simulation-check` | Roda cenários de simulação e verifica ΔIRE ≥ 0, ΔC_LF = 0, Σ ΔC_i = ΔIRE e a detecção de ME com renda residual acima, perto e abaixo de R$ 600 | PA4 |
| `latency` | Mede mediana e p95 dos endpoints de cálculo e simulação | RNF01 |

As saídas vão para CSV em `evaluation/results/` com a data no nome do arquivo.

## 10. Requisitos não funcionais

| ID | Categoria | Requisito | Como verificar |
|---|---|---|---|
| RNF01 | Desempenho | 95% das consultas, cálculos e simulações em ≤ 1 s | script `latency` (p95) |
| RNF02 | Segurança | HTTPS (TLS 1.3 em produção); sessão opaca no servidor, cookie HttpOnly (`SEGURANCA_LGPD.md` §4–6) | config + testes de segurança |
| RNF03 | Segurança | Log de auditoria de alteração e exclusão de dados financeiros e do aceite dos termos | tabela `LOG_AUDITORIA` |
| RNF04 | Confiabilidade | 99,5% de disponibilidade (meta declarada; não verificável no TCC) | — |
| RNF05 | Usabilidade | Diagnóstico claro; cor + ícone + rótulo; acessibilidade | revisão + SUS |
| RNF06 | Portabilidade | Chrome, Firefox, Safari e Edge (2 últimas versões) | teste manual |
| RNF07 | Escalabilidade | 100 usuários simultâneos simulando | teste de carga (se der tempo) |
| RNF08 | Manutenibilidade | ≥ 80% de cobertura de testes unitários no motor (IRE + projeção) | CI |
| RNF09 | Confiabilidade | Backup diário com retenção de 30 dias (meta declarada) | — |
| RNF10 | Compatibilidade | Layout responsivo (desktop, tablet e celular) | teste manual |
| RNF11 | Privacidade | Exportar os dados do usuário (JSON) e anonimizar | endpoint `/me/export` |
| RNF12 | Precisão | Decimal de ponto fixo, 2 casas na exibição (Seção 5.8) | testes |
| RNF13 | Desempenho | Atualização do dashboard e dos gráficos < 300 ms após edição | medição no front |
| RNF14 | Adequação | Resultados de acordo com o modelo matemático | testes do motor |
| RNF15 | Adequação | Entradas inconsistentes geram mensagens sem derrubar os demais cálculos | testes |
| RNF16 | Usabilidade / Compreensão | **[novo]** Linguagem simples: nenhuma sigla ou termo técnico sem explicação; todo campo diz o que é e para que serve; todo resultado diz o que significa e o que fazer; glossário central com tooltips acessíveis por toque e teclado | SPEC-15 §6 + revisão de texto + pergunta no estudo com usuários |

## 11. Arquitetura e dados

### 11.1 Arquitetura (artigo, Seção 4; especificação, Seção 6)
Arquitetura em camadas com API REST `/api/v1`:
- **Apresentação:** SPA com dashboard, cadastros, simulação e histórico.
- **API:** gateway/controllers com validação da sessão (cookie opaco + Redis; ver `SEGURANCA_LGPD.md` §4), roteando para 4 serviços:
  1. Usuários e LGPD (RP5);
  2. Orçamento (RP1);
  3. **Motor IRE e Projeção** (RP2/RP3): **sem estado, sem acesso ao banco**; recebe um snapshot do orçamento e devolve os resultados;
  4. Simulação e Diagnóstico (RP3/RP4).
- **Persistência:** PostgreSQL (dados transacionais) e Redis (cache do dashboard e do IRE recente).
- **Acesso a dados:** padrão Repository, para que o motor rode com dados em memória nos testes e nos scripts de avaliação.

### 11.2 Modelo de dados (PostgreSQL) — versão corrigida

Mudanças em relação ao PDF estão marcadas com **[novo]** ou **[corrigido]**. Todas as FKs para `usuario` usam `ON DELETE CASCADE` (RF24), exceto `aceitacao_termos` e `log_auditoria`, que usam `ON DELETE SET NULL`. **Os campos e tabelas adicionais de privacidade estão em `SEGURANCA_LGPD.md` §11** (categorias, descrição criptografada, versões de política, maioridade, consentimento de pesquisa, `last_login_at`).

```
usuario(user_id PK identity, user_email varchar(254) UNIQUE NOT NULL, oauth_subject varchar(255) UNIQUE NOT NULL [novo],
        dt_criacao timestamptz NOT NULL, state varchar(8) NOT NULL CHECK (state IN ('ATIVO','INATIVO')))
        -- [corrigido] removidos flag_terms e dt_aceite_terms (o aceite fica em aceitacao_termos; antes, o NOT NULL quebrava o 1º login)

aceitacao_termos(record_id PK, user_id FK, terms_version varchar(10) NOT NULL [novo], dt_accept_terms timestamptz NOT NULL,
                 token_id uuid UNIQUE NOT NULL [corrigido: era INTEGER])

renda(rent_id PK, user_id FK, description varchar(100) [novo], month_value numeric(15,2) NOT NULL CHECK (> 0),
      dt_user_creation timestamptz, last_modified_date timestamptz)

despesa(expense_id PK, user_id FK, description varchar(200), value numeric(15,2) NOT NULL CHECK (>= 0),
        expense_type varchar(8) NOT NULL CHECK (IN ('FIXA','VARIAVEL')) [corrigido: era rent_type], dt_user_creation, last_modified_date)

divida(debt_id PK, user_id FK, description varchar(200), balance_due numeric(15,2) NULL CHECK (>= 0),
       value_installment numeric(15,2) NOT NULL CHECK (> 0), total_installment int, qtd_installment_remains int NOT NULL CHECK (>= 0),
       reference_date date NOT NULL [novo], dt_user_creation, last_modified_date)

reserva_financeira(reserve_id PK, user_id FK, reserve_value numeric(15,2) NOT NULL CHECK (>= 0), dt_user_creation, last_modified_date)

indicador_financeiro(kpi_id PK, user_id FK UNIQUE [corrigido: 1 registro vigente por usuário], rent_perc numeric(9,4),
       debt_level numeric(12,4), financial_liquidity numeric(12,4), payments_capacity numeric(15,2),
       risk_index numeric(6,4), risk_level smallint CHECK (1..5), dt_calculated timestamptz)
       -- [corrigido] rent_perc era numeric(5,2) e estourava acima de 999%

simulacao_financeira(simulation_id PK, user_id FK, simulated_value numeric(15,2), qtd_installments int, value_installment numeric(15,2),
       current_risk numeric(6,4) [novo], estimated_risk numeric(6,4), outcome varchar(20) [novo: SEM_AGRAVAMENTO|AGRAVAMENTO|CRITICO],
       dt_simulation timestamptz, state varchar(15))

historico_indicadores(history_id PK, user_id FK, risk_level smallint, risk numeric(6,4), record_date date,
       UNIQUE (user_id, record_date) [novo: 1 registro por dia])

alerta(alert_id PK, user_id FK, type_alert varchar(50), description varchar(500), severity smallint CHECK (1..5),
       dt_alert timestamptz, status varchar(11) NOT NULL CHECK (IN ('NAO_LIDO','LIDO')))

log_auditoria(log_id PK, user_id FK NULL, operacao varchar(20), entidade varchar(40), entidade_id int,
       dt_evento timestamptz NOT NULL, detalhes jsonb) [novo — RNF03]
```

### 11.3 Endpoints da API (`/api/v1`)

| Método | Rota | UC/RF |
|---|---|---|
| GET | `/auth/google` → `/auth/google/callback` | UC01/RF01 |
| POST | `/auth/logout`, `/auth/logout-all` (encerra todas as sessões) | UC01 |
| GET / PUT | `/me/research-consent` (consentimento opcional da pesquisa) | LGPD art. 8º |
| GET / POST | `/terms/current`, `/terms/accept` | UC02/RF02–03 |
| GET, POST, PUT, DELETE | `/incomes[/:id]`, `/expenses[/:id]`, `/debts[/:id]`, `/reserves[/:id]` | UC03–06/RF04–07, RF21 |
| GET | `/analysis` → indicadores, R_i, IRE, faixa, C_i, alertas | UC07/RF08–16 |
| GET | `/projection` → série FL_t e Saldo_t | UC08/RF22–23 |
| POST | `/simulations` (V, n, p) → comparação, ΔC_i, π_i, desfecho, texto, projeção dupla | UC09/RF17–18 |
| GET | `/simulations` | histórico de simulações |
| GET | `/history` | UC10/RF19–20 |
| GET / PATCH | `/alerts`, `/alerts/:id` | RF15 |
| GET | `/me/export` | RNF11 |
| DELETE | `/me` | RF24 |
| GET | `/context/series` *(opcional)* | RF25 |

Todo CRUD de dados financeiros: grava em `log_auditoria`, invalida o cache Redis do usuário e atualiza `indicador_financeiro` e o `historico_indicadores` do dia (upsert).

## 12. Decisões tomadas neste PRD (validar com o grupo)

| ID | Lacuna nos documentos | Decisão adotada |
|---|---|---|
| D-01 | Nome: SAFE, SARE ou ADFP | **SAFE** (título do artigo) |
| D-02 | Stack "Node.js ou Java" | **TypeScript (Node + Express) + React**, primeira opção da especificação (detalhes em `CLAUDE.md`) |
| D-03 | `qtd_installment_remains` não diminui com o tempo | Nova coluna `reference_date`. Parcelas restantes hoje = max(qtd − meses inteiros entre `reference_date` e hoje, 0). Dívidas com 0 parcelas ficam inativas |
| D-04 | Saldo devedor informado fica desatualizado | Usar `balance_due` se informado; se nulo, `value_installment × parcelas restantes` (mesma regra da simulação) |
| D-05 | Arredondamento | Seção 5.8: precisão total no cálculo; arredondar só para faixa, exibição e persistência |
| D-06 | R_CP sem teto no artigo | Aplicar teto em 1 (Seção 5.3) e corrigir o artigo |
| D-07 | O artigo promete "dívida **ou despesa**" | v1 simula só obrigação parcelada; ajustar o texto do artigo |
| D-08 | Horizonte da projeção indefinido | H = max(12, maior m_j, n) |
| D-09 | Quando gravar histórico | Upsert de 1 registro por dia, após qualquer alteração de dados ou consulta da análise |
| D-10 | D = 0 (divisão por zero na LF) | R_LF = 0 |
| D-11 | Validação n·p ≥ V reprova arredondamentos | Tolerância de R$ 0,01 por parcela |
| D-12 | Status "efetivada" da simulação sem fluxo | Botão "Registrar como dívida" cria a dívida a partir da simulação (state = `EFETIVADA`). Só entra se der tempo; senão, usar apenas `ATIVA`/`DESCARTADA` |
| D-13 | `DT_ACEITE_TERMS NOT NULL` quebrava o 1º login | Aceite só em `aceitacao_termos`, com versão |
| D-14 | Alertas na situação atual | Faixa ≥ 3 ou regra crítica (Seção 5.7) |
| D-15 | A especificação prevê JWT Bearer e cookie de termos sem regras de privacidade | Decisões S-01 a S-09 do `SEGURANCA_LGPD.md`: sessão opaca no Redis, só cookies essenciais, base legal contrato + consentimento separado para pesquisa, minimização, categorias, exclusão em cascata, 18+, aceite comprovado no banco |
| D-16 | Consignado é descontado antes de a renda cair na conta; se o usuário informar a renda já sem esse desconto **e** cadastrar o consignado como dívida, a parcela conta duas vezes. Se não cadastrar, o comprometimento da renda fica subestimado | A renda líquida é o valor **sem os descontos obrigatórios** (INSS, imposto de renda), mas **com** os descontos de empréstimos em folha devolvidos à conta. O consignado entra como dívida (categoria `CONSIGNADO`). Leitura conservadora, coerente com o objetivo preventivo (SPEC-04 §2.5) |

## 13. Plano de entrega (29/10 → 02/11)

| Dia | Entrega |
|---|---|
| 29–30/10 | Repositório, Docker Compose (Postgres e Redis), migrations, **motor IRE e projeção com testes** (caso 6.6 primeiro), OAuth e termos |
| 30–31/10 | CRUDs, `/analysis`, `/projection`, dashboard com faixas e fatores |
| 31/10–01/11 | Simulação completa (4 blocos), alertas, histórico e gráfico, exclusão e exportação de dados |
| 01/11 | Scripts de avaliação, testes e2e dos fluxos principais, cobertura ≥ 80% no motor |
| 02/11 | Homologação e entrega. Módulo "Entenda os dados" só se sobrar tempo |

O detalhamento em tarefas, com o status de cada uma, está no `TASKS.md`.

**Caminho crítico:** motor → `/analysis` → simulação. Se faltar tempo, cortar nesta ordem: RF25, D-12, RF20 (gráfico), RNF07.

## 14. Métricas de sucesso

- 100% dos critérios de aceite das HUs essenciais atendidos (corretude funcional).
- Motor reproduz exatamente o caso 6.6 e passa nas propriedades da Seção 6.3.
- Cobertura ≥ 80% no motor; p95 ≤ 1 s.
- Estudo com usuários (pós-entrega): taxa de acerto nas tarefas, SUS e itens TAM (artigo, Seção 7.6).

## 15. Limitações conhecidas (comunicar na interface e no artigo)
- Pesos e limiares são escolhas de modelagem, **sem calibração** com dados de inadimplência. O IRE ordena situações e não é diagnóstico nem previsão.
- Os dados são autodeclarados.
- A simulação não considera juros e CET, uso da reserva, renda variável ou orçamento familiar.
- O ME é um valor fixo (R$ 600), igual para todos.
- Os limites são relativos à renda: 30% pesa igual para quem ganha R$ 1.500 e para quem ganha R$ 15.000.
