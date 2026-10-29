# SPEC-08 — Simulação de nova decisão financeira

| | |
|---|---|
| **Status** | Aprovada para implementação |
| **Depende de** | SPEC-04, SPEC-05, SPEC-06 |
| **Bloqueia** | SPEC-12 (simulation-check), tela de simulação |
| **Rastreabilidade** | UC09 (FA01–FA03, SF01–SF03, E01–E04) · RF15–RF18 · HU14–HU16 · RNF01, RNF05 · PRD §6 · D-07, D-11, D-12 · artigo Seção 6 |

## 1. Objetivo
Responder "o que acontece com meu risco se eu assumir esta compra parcelada?". O sistema compara o IRE atual com o projetado, decompõe a variação por indicador, classifica o desfecho, explica em texto e mostra a projeção com e sem a decisão. **Nada muda no orçamento real.**

## 2. Função pura (`engine/simulation.ts`)
```ts
export interface SimulationInput { value: Decimal /* V */; installments: number /* n */; installmentValue: Decimal /* p */ }
export type Outcome = 'SEM_AGRAVAMENTO' | 'AGRAVAMENTO' | 'CRITICO';
export interface FactorDelta {
  key: IndicatorKey; before: Decimal; after: Decimal;       // valor bruto (lf pode ser null)
  riskBefore: Decimal; riskAfter: Decimal; delta: Decimal;  // ΔC_i = W_i·(R_after − R_before)
  share: Decimal | null;                                    // π_i (null se ΔIRE = 0)
  isMain: boolean; unchanged: boolean; saturatedBoth: boolean;
}
export interface SimulationResult {
  input: SimulationInput; financialCost: Decimal;           // max(n·p − V, 0)
  current: Diagnosis; projected: Diagnosis;
  deltaIre: Decimal; factors: FactorDelta[]; outcome: Outcome; alertSeverity: 0 | 1 | 2 | 3 | 4 | 5;
  residualIncomeAfter: Decimal; projection: { without: Projection; with: Projection };
  explanation: string;
}
export function validateSimulation(i: SimulationInput): void   // lança SimulationValidationError
export function simulate(s: BudgetSnapshot, i: SimulationInput, cfg = DEFAULT_CONFIG): SimulationResult
```

### 2.1 Validação (E01, E02)
| Regra | Erro |
|---|---|
| `value` > 0, `installmentValue` > 0, `installments` inteiro de 1 a 600 | `VALIDATION_ERROR` com `fields` |
| `n·p ≥ V − n·0,01` (D-11) | `INCONSISTENT_SIMULATION`: "O total das parcelas (R$ X) é menor que o valor da compra (R$ V). Confira os valores." |

### 2.2 Cenário projetado (SF01, SF02; PRD §6.2)
Copiar o snapshot **em memória** e acrescentar a dívida `{ id: 'sim', installment: p, remaining: n, balance: n·p }`. Rodar `diagnose()` nos dois snapshots. Pela construção, o resultado equivale a:
```
CR' = (P_Σ + p)/R_m;  NE' = (S_Σ + n·p)/R_m;  CP' = CP − p;  LF' = LF
```
(é o mês de maior exposição, t = 1).

### 2.3 Comparação (SF03; PRD §6.3)
- `deltaIre = projected.ire.raw − current.ire.raw` (precisão total).
- `delta_k = W_k·(R'_k − R_k)`; `share_k = delta_k / deltaIre` se `deltaIre > 0`, senão `null`.
- `unchanged = (delta_k = 0)`.
- `saturatedBoth = current.risks.saturated[k] && projected.risks.saturated[k] && before ≠ after`. Mostra "no limite da escala" com a variação bruta.
- Ordenação: `delta` decrescente; `unchanged` no fim.
- `isMain`: mesma regra dos 75% da SPEC-05 §3.5, aplicada a `share`.

### 2.4 Desfecho (PRD §6.4) — avaliado nesta ordem
```
residualIncomeAfter = R_m − (P_Σ + p)
CRITICO        se projected.indicators.cp ≤ 0  OU  residualIncomeAfter < minimumExistential   → alertSeverity 5
AGRAVAMENTO    se deltaIre ≥ delta  OU  projected.ire.band > current.ire.band                 → alertSeverity = projected.ire.band
SEM_AGRAVAMENTO caso contrário                                                                 → alertSeverity 0
```
O sistema **nunca bloqueia**: sempre devolve o resultado.

### 2.5 Projeção
`without = project(snapshot)`, `with = project(snapshot, { installment: p, n })` (SPEC-06).

### 2.6 Explicação (`engine/explain.ts`)
Frases montadas a partir de templates por indicador, só com os **principais fatores**, em ordem:
| Indicador | Template |
|---|---|
| cr | "elevaria o comprometimento da sua renda com dívidas de {before%} para {after%}" |
| cp | "reduziria sua folga mensal de {R$ before} para {R$ after}" (se `after ≤ 0`: "deixaria sua renda sem folga: faltariam {R$ \|after\|} por mês") |
| ne | "aumentaria o total das suas dívidas de {before} para {after} meses de renda" |

Montagem:
- `"Esta compra " + junção com vírgulas e " e " + ". "`.
- Se houver 2 ou mais principais: `"Esses fatores respondem por {Σπ%} do aumento do risco."`; se houver 1: `"Esse fator responde por {π%} do aumento do risco."`
- `deltaIre = 0`: "Esta decisão não altera o seu índice de risco."
- `CRITICO` por mínimo existencial: acrescentar "Depois das parcelas, sobrariam {R$} da sua renda, abaixo do valor mínimo de referência de R$ 600."
- Números formatados em pt-BR (`25,0%`, `R$ 1.000,00`).

Exemplo do artigo: "Esta compra elevaria o comprometimento da sua renda com dívidas de 10,0% para 25,0% e reduziria sua folga mensal de R$ 1.600,00 para R$ 1.000,00. Esses fatores respondem por 91,9% do aumento do risco."

## 3. Endpoints (auth + termos; POST com CSRF; rate limit 30/min)
**`POST /api/v1/simulations`**, corpo `{ "value": "6000.00", "installments": 12, "installmentValue": "600.00" }` → 200:
```json
{ "id": 41, "financialCost": "1200.00",
  "current":   { "ire": { "value": "0.19", "raw": "0.1925", "band": 1, "label": "Baixo risco", "color": "risk-1", "icon": "check-circle" } },
  "projected": { "ire": { "value": "0.38", "raw": "0.3775", "band": 2, "label": "Risco moderado", "color": "risk-2", "icon": "info" } },
  "deltaIre": "0.1850", "outcome": "AGRAVAMENTO", "alertSeverity": 2,
  "factors": [ { "key": "cr", "name": "Comprometimento da renda", "before": "10,00%", "after": "25,00%", "riskBefore": "0.2000", "riskAfter": "0.5000",
                 "points": "0.1200", "share": "0.6486", "isMain": true, "unchanged": false, "saturatedBoth": false }, … ],
  "residualIncomeAfter": "3000.00",
  "explanation": "Esta compra elevaria …",
  "projection": { "without": { … SPEC-06 … }, "with": { … } },
  "assumptions": ["A compra não usa sua reserva", "Suas despesas não mudam", "O risco projetado considera o mês em que todas as parcelas estão ativas"] }
```
- Grava `simulacao_financeira { simulated_value, qtd_installments, value_installment, current_risk, estimated_risk, outcome, dt_simulation, state: 'ATIVA' }`. **Nada mais é gravado**: renda, despesas, dívidas, reserva, indicador, histórico e alertas ficam iguais.
- Sem renda → 409 `INSUFFICIENT_DATA` (E03). Falha → 500 (E04).

**`GET /api/v1/simulations`** → últimas 20 simulações (`id`, data, V, n, p, risco atual e estimado, desfecho).

**`PATCH /api/v1/simulations/:id`** `{ "state": "DESCARTADA" }` → 200.

**(D-12, opcional)** `POST /api/v1/simulations/:id/register` → cria a dívida real (`installmentValue = p`, `remainingInstallments = n`, `balanceDue = null`, `category = 'CREDIARIO'`, editável depois) e marca `state = 'EFETIVADA'`. Dispara `budgetChanged`.

## 4. Interface (página "Simular")
- **Formulário:** Valor da compra, Número de parcelas, Valor da parcela. Botão auxiliar "calcular parcela sem juros" preenche `p = V/n` (arredondado para cima no centavo). Aviso de premissas acima do botão "Simular".
- **Bloco 1 — Síntese:** dois cards (Hoje → Com esta compra), cada um com IRE, cor + ícone + rótulo, e a variação "+0,19". Banner conforme `outcome`:
  - `SEM_AGRAVAMENTO`: neutro, "Esta compra não muda significativamente o seu risco".
  - `AGRAVAMENTO`: cor da faixa projetada, "Esta compra aumenta o seu risco".
  - `CRITICO`: vermelho-intenso com ícone, "Atenção: com esta compra sua renda não cobre suas despesas e parcelas" ou a frase do mínimo existencial.
- **Bloco 2 — Fatores:** tabela com Indicador · Antes · Depois · Pontos · Participação. Principais em negrito com selo "principal". `unchanged` → "não alterado por esta decisão". `saturatedBoth` → "no limite da escala".
- **Bloco 3 — Explicação:** `explanation` em destaque + custo financeiro implícito ("Você pagará R$ 1.200,00 a mais que o valor à vista").
- **Bloco 4 — Projeção:** gráfico com duas linhas de sobra mensal (sem e com a compra), meses ≤ 0 marcados.
- Botões: "Simular outros valores" (FA01: mantém o formulário preenchido) e, se D-12 entrar, "Registrar como dívida".
- Rodapé: "Simulação: nada foi salvo no seu orçamento. A decisão é sua."

## 5. Critérios de aceite
- [ ] Caso do artigo (PRD §6.6) devolve exatamente: IRE 0,19 → 0,38, ΔIRE 0,185, ΔC {cr 0,12; cp 0,05; ne 0,015; lf 0}, π {64,9%; 27,0%; 8,1%; 0}, principais cr + cp, `AGRAVAMENTO`, severidade 2, renda residual 3000, custo 1200 e o texto do §2.6
- [ ] Propriedades (fast-check): ΔIRE ≥ 0; ΔC_lf = 0; \|Σ ΔC − ΔIRE\| < 1e-9
- [ ] V = 1000, n = 3, p = 333,33 é aceito; V = 1000, n = 3, p = 300 → `INCONSISTENT_SIMULATION`
- [ ] Parcela que leva CP' ≤ 0 → `CRITICO` mesmo se a faixa não mudar
- [ ] Renda residual depois = 599,99 → `CRITICO`; 600,00 → não crítico por essa regra
- [ ] Usuário já saturado em CR (≥ 50%) → ΔC_cr = 0 com `saturatedBoth = true` e variação bruta exibida
- [ ] Após simular, `GET /incomes|expenses|debts|reserves`, `/analysis` e `/history` retornam exatamente o mesmo de antes
- [ ] p95 de `POST /simulations` ≤ 1 s
