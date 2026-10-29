# SPEC-07 — Análise da situação financeira e alertas

| | |
|---|---|
| **Status** | Aprovada para implementação |
| **Depende de** | SPEC-04, SPEC-05 |
| **Bloqueia** | SPEC-09 (histórico), Dashboard (SPEC-11) |
| **Rastreabilidade** | UC07 (FA01, FA02, SF01–SF03, E01, E02) · RF08–RF16 · HU09–HU14, HU20–HU22 · RNF01, RNF05, RNF13 · PRD §5.5–5.7 · D-09, D-14 |

## 1. Objetivo
Entregar o diagnóstico atual (indicadores, riscos, IRE, faixa, fatores e alertas) pronto para o dashboard. Manter `indicador_financeiro` (registro vigente), o histórico do dia e os alertas atualizados sempre que o orçamento muda.

## 2. Serviço `analysisService`
```ts
getAnalysis(userId): Promise<AnalysisDTO>   // usa cache; calcula se faltar
refresh(userId): Promise<void>              // chamado pelo evento budgetChanged (SPEC-04)
```
`refresh`:
1. `snapshot = buildSnapshot(userId, hoje)`; `d = diagnose(snapshot)`. Sem renda → apaga `indicador_financeiro` do usuário e termina.
2. Upsert de `indicador_financeiro` (único por usuário): `rent_perc = cr·100`, `debt_level = ne`, `financial_liquidity = lf` (null se D = 0), `payments_capacity = cp`, `risk_index = raw`, `risk_level = band`, `dt_calculated = now`.
3. Upsert de `historico_indicadores (user_id, record_date = hoje)` com `risk` e `risk_level`. É **1 registro por dia**, sempre o último cálculo do dia (D-09).
4. **Alertas** (D-14), com `type_alert` estável para não duplicar:
   - `band ≥ 3` → `FAIXA_<band>`, severidade = band;
   - `critical.negativeCapacity` → `CAPACIDADE_NEGATIVA`, severidade 5;
   - `critical.belowMinimumExistential` → `MINIMO_EXISTENCIAL`, severidade 5.

   Para cada tipo: se já existe alerta `NAO_LIDO` igual, não cria outro. Se a condição deixou de existir, marca os `NAO_LIDO` desse tipo como `LIDO` (resolvidos). A `description` é a frase do §4 (sem valores pessoais além do necessário).
5. Grava `cache:analysis:<userId>` (TTL 10 min).

`getAnalysis` lê o cache. Se não houver, chama o mesmo `refresh` (grava indicador, histórico do dia e alertas, como manda a D-09 do PRD: "após qualquer alteração de dados ou consulta da análise") e cacheia. O histórico guarda o IRE **arredondado** (o mesmo que define a faixa).

## 3. Endpoint `GET /api/v1/analysis` (auth + termos)
```json
{ "calculatedAt": "2026-10-29T18:00:00Z",
  "totals": { "income": "4000.00", "expenses": "2000.00", "installments": "400.00", "debtBalance": "6000.00", "reserve": "6000.00" },
  "indicators": {
    "cr": { "value": "0.1000", "display": "10,00%", "risk": "0.2000", "saturated": false, "level": "OK" },
    "cp": { "value": "1600.00", "display": "R$ 1.600,00", "risk": "0.0000", "saturated": true },
    "lf": { "value": "3.0000", "display": "3,0 meses", "risk": "0.5000", "saturated": false },
    "ne": { "value": "1.5000", "display": "1,5 mês de renda", "risk": "0.1250", "saturated": false } },
  "ire": { "raw": "0.1925", "value": "0.19", "band": 1, "label": "Baixo risco", "color": "risk-1", "icon": "check-circle",
           "recommendation": "…" },
  "factors": [ { "key": "lf", "name": "Reserva de emergência (liquidez)", "points": "0.1000", "share": "0.5195", "isMain": true }, … ] | null,
  "residualIncome": "3600.00",
  "alerts": [ { "id": 3, "type": "FAIXA_3", "severity": 3, "message": "…", "createdAt": "…" } ] }
```
- `cr.level` (HU09 critério 6): `OK` < 30%, `ATENCAO` 30–50%, `ALTO` > 50%. `cr > 100%` → `display` "115,00%" + `exceedsIncome: true` (critério 7).
- `display` já vem formatado em pt-BR pelo backend, para padronizar.
- Sem renda → 409 `INSUFFICIENT_DATA` com `fields: { income: "Cadastre sua renda" }` (E01; HU09 critério 4).
- Erro no cálculo → 500 e **nenhum** resultado parcial (E02).

`GET /api/v1/alerts?status=NAO_LIDO` → lista. `PATCH /api/v1/alerts/:id` `{ "status": "LIDO" }` (CSRF) → 200.

## 4. Textos (pt-BR, não técnicos)
| Situação | Mensagem |
|---|---|
| `FAIXA_3` | "Seu orçamento está se aproximando do limite. Evite assumir novas dívidas agora." |
| `FAIXA_4` | "Seu risco está alto. O ideal é não contratar novos créditos e rever prioridades." |
| `FAIXA_5` | "Seu risco é crítico. Priorize renegociar suas dívidas." |
| `CAPACIDADE_NEGATIVA` | "Suas despesas e parcelas já passam da sua renda mensal." |
| `MINIMO_EXISTENCIAL` | "Depois das parcelas, sobra menos de R$ 600 da sua renda, o valor mínimo de referência usado pelo SAFE." |

Faixa 1 (ver SEGURANCA_LGPD §7.3): "Segundo os critérios do modelo, seu orçamento atual está equilibrado. Isso não é uma garantia nem uma recomendação para contratar."

Rodapé fixo: "O índice é um apoio para entender sua situação, não um diagnóstico."

## 5. Interface (Dashboard, página inicial)
- **Card do IRE:** valor (0,19), faixa com cor + ícone + rótulo (RNF05), recomendação e "o que isso significa?" (abre explicação das faixas).
- **4 cards de indicador:** nome amigável, valor `display`, barra do risco normalizado (0–1) com texto "risco 0,20 de 1". Saturado → selo "no limite da escala".
- **"Por que meu risco é este?":** lista de fatores (`factors`) com barra de participação; principais em destaque. `factors = null` → "Não há fatores de risco no momento."
- **Alertas:** banner no topo com o mais grave; botão "Marcar como lido".
- **Estado sem dados:** checklist "Cadastre renda → despesas → dívidas → reserva" com links.

## 6. Critérios de aceite
- [ ] Caso do artigo → JSON com os valores do §3 (IRE 0,19, banda 1; fatores lf e cr principais)
- [ ] Usuário sem renda → 409 e tela com o botão "Cadastrar renda"
- [ ] Alterar uma dívida dispara `refresh`: `indicador_financeiro` atualizado e um único registro de histórico no dia, mesmo após 5 alterações
- [ ] Faixa 3 cria `FAIXA_3` uma vez; recalcular sem mudança não duplica; baixar para faixa 2 marca como `LIDO`
- [ ] CP ≤ 0 gera `CAPACIDADE_NEGATIVA` (sev. 5) mesmo com faixa baixa; renda residual < 600 gera `MINIMO_EXISTENCIAL`
- [ ] CR > 100% → `exceedsIncome: true` e ícone de alerta na interface
- [ ] p95 de `GET /analysis` ≤ 1 s (RNF01); com cache, < 300 ms (RNF13)
