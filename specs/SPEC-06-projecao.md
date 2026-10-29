# SPEC-06 — Projeção do fluxo financeiro

| | |
|---|---|
| **Status** | Aprovada para implementação |
| **Depende de** | SPEC-05 (tipos); SPEC-04 (snapshot, só para o endpoint) |
| **Bloqueia** | SPEC-08 (projeção com e sem a decisão), tela de projeção |
| **Rastreabilidade** | UC08 (FA01, E01, E02) · RF22, RF23 · HU23 · RNF13 · PRD §7 · D-08 · artigo Eq. sim-fluxo |

## 1. Objetivo
Mostrar, mês a mês, quanto sobra (fluxo livre) e como evolui o saldo acumulado, com base nas dívidas ativas e suas parcelas restantes. A mesma função gera a série "com a decisão" na simulação.

## 2. Função pura (`engine/projection.ts`)
```ts
export interface ProjectionPoint { month: number /* t = 1..H */; label: string /* 'nov/2026' */; free: Decimal; balance: Decimal; debtsActive: number }
export interface Projection { horizon: number; points: ProjectionPoint[]; firstNonPositiveFreeMonth: number | null; firstNegativeBalanceMonth: number | null }

export function project(s: BudgetSnapshot, extra?: { installment: Decimal; n: number }): Projection
```
Regras (PRD §7):
```
H         = max(12, max_j(remaining_j), extra?.n ?? 0)
FL_t      = R_m − D − Σ_j installment_j · [t ≤ remaining_j] − (extra ? extra.installment · [t ≤ extra.n] : 0)
Saldo_t   = Res + Σ_{k=1..t} FL_k
label_t   = mês de referenceDate + t, formato 'mmm/aaaa' em pt-BR minúsculo ('nov/2026')
```
- t = 1 é o **mês seguinte** à `referenceDate`.
- Renda e despesas são constantes no horizonte (premissa; exibir na interface).
- Sem arredondamento interno; a API formata com 2 casas.
- Renda 0 → `InsufficientDataError`.

## 3. Endpoint
`GET /api/v1/projection` (auth + termos) → 200:
```json
{ "horizon": 12,
  "assumptions": ["Renda e despesas constantes", "Dívidas pagas até a última parcela informada"],
  "points": [ { "month": 1, "label": "nov/2026", "free": "1600.00", "balance": "7600.00", "debtsActive": 1 }, ... ],
  "firstNonPositiveFreeMonth": null, "firstNegativeBalanceMonth": null }
```
- Cache Redis `cache:projection:<userId>` com TTL de 10 min, invalidado pela SPEC-04.
- Sem renda → 409 `INSUFFICIENT_DATA` (E01), com `fields: { "income": "Cadastre sua renda para ver a projeção" }`.
- **Não persiste nada** (o diagrama de sequência da especificação confirma).

## 4. Interface (página "Projeção")
- Gráfico de linhas (Recharts) com duas séries: **Sobra do mês** (barras) e **Saldo acumulado** (linha). Eixo X com `label`; eixo Y em R$.
- Linha de referência em R$ 0. Meses com sobra ≤ 0 ficam destacados em vermelho, **com** texto na tabela (não só cor).
- Tabela acessível abaixo do gráfico com os mesmos dados (leitores de tela).
- Frase-resumo: "Nos próximos 12 meses, sua sobra mensal fica entre R$ X e R$ Y." Se houver meses negativos: "Em mmm/aaaa sua sobra fica negativa."
- Caixa "Premissas" com o texto de `assumptions`.

## 5. Critérios de aceite
- [ ] Caso do artigo (R_m 4000, D 2000, dívida de R$ 400 com 10 parcelas, Res 6000): FL_1..10 = 1600, FL_11..12 = 2000; Saldo_1 = 7600, Saldo_12 = 6000 + 16000 + 4000 = 26000; H = 12
- [ ] Com `extra` {600, 12}: FL_1..10 = 1000, FL_11..12 = 1400
- [ ] Dívida com 18 parcelas → H = 18; simulação com n = 24 → H = 24
- [ ] `firstNonPositiveFreeMonth` e `firstNegativeBalanceMonth` corretos num cenário com déficit
- [ ] Rótulos de mês corretos na virada de ano (dez/2026 → jan/2027)
- [ ] Editar uma dívida e recarregar a projeção mostra o novo valor (cache invalidado)
