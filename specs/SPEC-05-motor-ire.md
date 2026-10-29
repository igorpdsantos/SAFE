# SPEC-05 — Motor do IRE (indicadores, normalização, índice, faixas e fatores)

| | |
|---|---|
| **Status** | Aprovada para implementação |
| **Depende de** | SPEC-01 (só `decimal.js`; pode ser feita em paralelo) |
| **Bloqueia** | SPEC-06, SPEC-07, SPEC-08, SPEC-12 |
| **Rastreabilidade** | RF08–RF14, RF16 · HU09–HU13, HU20–HU22 · RNF08, RNF12, RNF14 · PRD §5 · D-05, D-06, D-10 · artigo Seção 5 |

## 1. Objetivo
Implementar o modelo matemático do PRD §5 como **funções puras** em `backend/src/engine/`. Não acessam banco, Redis, Express nem `Date.now()`. É a peça central do TCC: API, testes e scripts de avaliação usam exatamente este código.

## 2. Tipos
```ts
// engine/types.ts
import Decimal from 'decimal.js';

export interface DebtInput { id: number | string; installment: Decimal; remaining: number; balance: Decimal } // só dívidas ativas
export interface BudgetSnapshot {
  incomes: Decimal[]; expenses: Decimal[]; debts: DebtInput[]; reserves: Decimal[];
  referenceDate: string; // 'YYYY-MM-DD'
}
export interface EngineConfig {
  weights: { cr: Decimal; cp: Decimal; lf: Decimal; ne: Decimal };     // 0.40 0.30 0.20 0.10 (soma = 1)
  caps:    { cr: Decimal; ne: Decimal; lf: Decimal; cpShare: Decimal }; // 0.50 12 6 0.30
  bandUpperBounds: [Decimal, Decimal, Decimal, Decimal];                // 0.20 0.40 0.60 0.80
  delta: Decimal;                // 0.05 (SPEC-08)
  minimumExistential: Decimal;   // 600.00
  mainFactorsShare: Decimal;     // 0.75
}
export type IndicatorKey = 'cr' | 'cp' | 'lf' | 'ne';
export interface Totals { income: Decimal; expenses: Decimal; installments: Decimal; balance: Decimal; reserve: Decimal }
export interface Indicators { cr: Decimal; ne: Decimal; lf: Decimal | null /* null se D = 0 */; cp: Decimal }
export interface Risks { cr: Decimal; cp: Decimal; lf: Decimal; ne: Decimal; saturated: Record<IndicatorKey, boolean> }
export type RiskBand = 1 | 2 | 3 | 4 | 5;
export interface IreResult { raw: Decimal; rounded: Decimal; band: RiskBand }
export interface Contribution { key: IndicatorKey; weighted: Decimal /* R_i·W_i */; share: Decimal /* C_i */; isMain: boolean }
export interface Diagnosis {
  totals: Totals; indicators: Indicators; risks: Risks; ire: IreResult;
  contributions: Contribution[] | null;  // null se IRE = 0
  residualIncome: Decimal;               // R_m − P_Σ
  critical: { negativeCapacity: boolean; belowMinimumExistential: boolean };
}
```
`engine/config.ts` exporta `DEFAULT_CONFIG` com os valores do artigo e `withConfig(overrides)`, usado pela análise de sensibilidade (SPEC-12).

## 3. Funções (assinaturas e regras)

### 3.1 `totals(s: BudgetSnapshot): Totals`
Somas simples: R_m = Σ incomes, D = Σ expenses, P_Σ = Σ debts.installment, S_Σ = Σ debts.balance, Res = Σ reserves.

### 3.2 `computeIndicators(t: Totals): Indicators`
Pré-condição: `t.income > 0`; senão lança `InsufficientDataError('income')`, que a API traduz para 409 `INSUFFICIENT_DATA`.
```
cr = P_Σ / R_m
ne = S_Σ / R_m
lf = D > 0 ? Res / D : null
cp = R_m − (D + P_Σ)
```

### 3.3 `normalize(ind, t, cfg): Risks`
```
R_cr = min(cr / caps.cr, 1)
R_ne = min(ne / caps.ne, 1)
R_lf = lf === null ? 0 : max(1 − lf / caps.lf, 0)                 (D-10)
R_cp = clamp(1 − cp / (caps.cpShare · R_m), 0, 1)                    (D-06: teto em 1)
```
`saturated[k] = true` quando o min/max/clamp **cortou** o valor:
- `cr ≥ caps.cr`;
- `ne ≥ caps.ne`;
- `lf !== null && lf ≥ caps.lf`;
- `cp ≤ 0` ou `cp ≥ caps.cpShare·R_m`.

### 3.4 `computeIre(r: Risks, cfg): IreResult`
`raw = Σ W_k·R_k` (precisão total); `rounded = raw` arredondado em 2 casas (half-up); `band` = primeira faixa cujo limite superior ≥ `rounded` (0,20→1; 0,40→2; 0,60→3; 0,80→4; senão 5).

### 3.5 `staticDecomposition(r, ire, cfg): Contribution[] | null`
- Se `ire.raw = 0` → `null`.
- `weighted_k = W_k·R_k`; `share_k = weighted_k / ire.raw`.
- Ordenar por `weighted` decrescente, com desempate fixo na ordem `cr, cp, lf, ne`.
- `isMain`: percorrer acumulando `share` e marcar até o acumulado atingir `mainFactorsShare` (0,75). O item que faz atingir também é marcado. Itens com `weighted = 0` nunca são principais.

### 3.6 `diagnose(s, cfg = DEFAULT_CONFIG): Diagnosis`
Encadeia 3.1 a 3.5 e calcula:
```
residualIncome = R_m − P_Σ
critical.negativeCapacity       = cp ≤ 0
critical.belowMinimumExistential = residualIncome < minimumExistential
```

### 3.7 `elapsedMonths(from: 'YYYY-MM-DD', to: 'YYYY-MM-DD'): number`
Meses inteiros completos: `(y2−y1)·12 + (m2−m1) − (d2 < d1 ? 1 : 0)`, mínimo 0. Ex.: 2026-10-29 → 2026-12-28 = 1; → 2026-12-29 = 2. Usado pela SPEC-04 (D-03).

## 4. Regras de precisão (D-05)
- `Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })` no módulo do motor.
- **Nenhuma** função do motor arredonda, exceto `computeIre().rounded`. Formatação e arredondamento para exibir ficam na camada HTTP (`toRatioString`, `toMoneyString`).

## 5. Rótulos (para API e interface)
| band | `label` | `color` (token) | `icon` |
|---|---|---|---|
| 1 | Baixo risco | `risk-1` verde | `check-circle` |
| 2 | Risco moderado | `risk-2` amarelo | `info` |
| 3 | Risco de atenção | `risk-3` laranja | `alert-triangle` |
| 4 | Risco alto | `risk-4` vermelho-claro | `alert-octagon` |
| 5 | Risco crítico | `risk-5` vermelho-intenso | `siren` |

Recomendações por faixa: textos do PRD §5.5, em `engine/labels.ts`.

Nomes dos indicadores para a interface:
- `cr` = "Comprometimento da renda"
- `cp` = "Folga mensal (capacidade de pagamento)"
- `lf` = "Reserva de emergência (liquidez)"
- `ne` = "Tamanho total das dívidas (nível de endividamento)"

## 6. Testes obrigatórios (`engine/*.test.ts`)

**T1 — caso de referência do artigo (situação atual):** R_m 4000, D 2000, P 400, S 6000, Res 6000 →
`cr 0.10, ne 1.5, lf 3, cp 1600; R = {cr 0.2, cp 0, lf 0.5, ne 0.125}; raw 0.1925; rounded 0.19; band 1`. Contribuições: lf 0,10 (51,9%), cr 0,08 (41,6%), ne 0,0125 (6,5%), cp 0. Principais: lf + cr (93,5% ≥ 75%).

**T2 — fronteiras de faixa:** construir riscos que dão `raw` 0,2049 → 0,20 → banda 1; 0,2050 → 0,21 → banda 2; idem para 0,40/0,41, 0,60/0,61 e 0,80/0,81.

**T3 — saturações:**
- cr = 0,75 → R_cr 1 e saturado;
- cp = −600 com R_m 4000 → R_cp **1** (não 1,5) e saturado;
- lf = 8 → R_lf 0 e saturado;
- ne = 20 → R_ne 1.

**T4 — casos-limite:**
- renda 0 → `InsufficientDataError`;
- D = 0 → `lf null` e R_lf 0;
- sem dívidas → cr 0, ne 0;
- tudo ótimo → IRE 0 e `contributions null`.

**T5 — mínimo existencial:** residualIncome 599,99 → `belowMinimumExistential true`; 600,00 → false; 600,01 → false.

**T6 — propriedades (fast-check, 1000 casos aleatórios com valores de 0 a 100.000):**
- 0 ≤ raw ≤ 1;
- Σ share = 1 quando raw > 0;
- cada R_k ∈ [0, 1];
- `diagnose` é determinística (mesma entrada → mesmo resultado).

**T7 — `elapsedMonths`:** exemplos do §3.7, virada de ano e dia 31 → 30.

**T8 — configuração:** `withConfig` com pesos alterados muda o resultado e não altera `DEFAULT_CONFIG` (imutável).

## 7. Critérios de aceite
- [ ] Todos os testes do §6 passam
- [ ] Cobertura de `engine/` ≥ 80% de linhas e ramos (RNF08)
- [ ] `engine/` não importa nada de `prisma`, `express`, `ioredis` nem `lib/` de infraestrutura (regra ESLint `no-restricted-imports`)
- [ ] Nenhum `number` usado para valor monetário ou risco dentro de `engine/` (revisão + lint)
