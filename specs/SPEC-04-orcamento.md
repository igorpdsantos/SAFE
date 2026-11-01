# SPEC-04 — Orçamento: renda, despesas, dívidas e reserva

| | |
|---|---|
| **Status** | Aprovada para implementação |
| **Depende de** | SPEC-01, SPEC-02, SPEC-03; tipos e `elapsedMonths` da SPEC-05 |
| **Bloqueia** | SPEC-07, SPEC-08, SPEC-06 (endpoint), SPEC-10 |
| **Rastreabilidade** | UC03, UC04, UC05, UC06 (FA01, FA02, E01, E02) · RF04–RF07, RF21 · HU04–HU08 · RNF03, RNF15 · D-03, D-04 · S-04, S-05 · SEGURANCA_LGPD §3, §6.3, §11 |

## 1. Objetivo
CRUD das quatro entidades que formam a situação financeira do usuário, com validação, categorias, descrição criptografada, auditoria e o **snapshot** que alimenta o motor.

## 2. Entidades e validação (zod; valores monetários como string — SPEC-01 §4.1)

| Entidade | Campos do cliente | Regras |
|---|---|---|
| **Renda** (`/incomes`) | `description?`, `monthValue` | `monthValue` > 0 e ≤ 10.000.000,00; máx. 20 rendas por usuário |
| **Despesa** (`/expenses`) | `description?`, `category`, `type` (`FIXA`/`VARIAVEL`), `value` | `value` ≥ 0 e ≤ 10.000.000,00; máx. 100 |
| **Dívida** (`/debts`) | `description?`, `category`, `installmentValue`, `remainingInstallments`, `totalInstallments?`, `balanceDue?` | `installmentValue` > 0; `remainingInstallments` inteiro 0–600; `totalInstallments` ≥ `remainingInstallments` (se informado); `balanceDue` ≥ 0 (se informado); máx. 100 |
| **Reserva** (`/reserves`) | `description?`, `value` | `value` ≥ 0; máx. 20 |

- `description`: opcional, 1–60 caracteres depois do `trim`, sem quebra de linha.
- Erros de validação → 400 `VALIDATION_ERROR` com `fields` em pt-BR (E01). Ex.: `"monthValue": "Informe um valor maior que zero"`.

### 2.1 Categorias (enum no código; rótulo pt-BR no frontend)
- **Despesa:** `MORADIA`, `ALIMENTACAO`, `TRANSPORTE`, `SAUDE`, `EDUCACAO`, `CONTAS_CASA`, `LAZER`, `OUTROS`.
- **Dívida:** `CARTAO_CREDITO`, `EMPRESTIMO_PESSOAL`, `CONSIGNADO`, `FINANC_VEICULO`, `FINANC_IMOVEL`, `CREDIARIO`, `CHEQUE_ESPECIAL`, `OUTROS`.

### 2.2 Descrição criptografada (S-05)
`lib/crypto.ts`: `encrypt(text) → Buffer` = `iv(12 bytes) ‖ ciphertext ‖ authTag(16)` com AES-256-GCM e a chave `DATA_ENC_KEY`. `decrypt(buf) → string`. A coluna `description` é `bytea`. O repositório cifra ao gravar e decifra ao ler; o resto do código só vê texto.

### 2.3 Parcelas restantes "hoje" (D-03)
- Ao **criar** a dívida, ou quando o cliente **muda** `remainingInstallments`, o servidor grava `reference_date = hoje` (America/Sao_Paulo).
- Na leitura: `remainingNow = max(remainingInstallments − elapsedMonths(reference_date, hoje), 0)` (função da SPEC-05).
- `active = remainingNow ≥ 1`. Dívida inativa continua listada (marcada "quitada") mas **não entra** no snapshot.

### 2.4 Saldo usado no cálculo (D-04)
`balanceUsed = balanceDue` se informado; senão, `installmentValue × remainingNow`. Se informado, a interface avisa: "Atualize o saldo devedor de vez em quando; ele não diminui sozinho."

### 2.5 Renda e consignado (D-16)
- A renda informada é a líquida **dos descontos obrigatórios** (INSS, imposto de renda). Descontos de empréstimo em folha (consignado) **não** são tirados da renda: o consignado é cadastrado como dívida, categoria `CONSIGNADO`.
- Assim a parcela conta uma vez só e pesa no comprometimento da renda, como qualquer outra dívida.
- `<FieldHelp>` do campo de renda: "Quanto você recebe por mês, já sem INSS e imposto de renda. Se você tem consignado, some a parcela de volta e cadastre o consignado em Dívidas." Placeholder "Ex.: 2.700,00".
- Ao escolher a categoria `CONSIGNADO` numa dívida, a interface lembra: "Confira se você somou a parcela deste consignado de volta à sua renda, para ela não contar duas vezes."

### 2.6 Despesa variável com faixa (T-04.10)
- Despesa `VARIAVEL` é informada como **faixa**: `valueMin` (X, o menor valor do mês) e `valueMax` (Y, o maior). Regras: `0 ≤ X ≤ Y ≤ 10.000.000,00`. Despesa `FIXA` continua com `value` único e `valueMin`/`valueMax` ficam `null`.
- O motor, a projeção e a simulação usam **sempre o máximo (Y)**: é a leitura conservadora (D-10). Por isso o servidor grava `value = valueMax` e todo o cálculo continua lendo `value`, sem mudança no motor.
- Banco: colunas anuláveis `value_min` e `value_max` em `despesa`, com `CHECK` (ambas nulas ou ambas preenchidas, `value_min ≤ value_max`, `value = value_max` quando há faixa). A migration copia as variáveis já cadastradas para `value_min = value_max = value`.
- Compatibilidade: se uma despesa `VARIAVEL` chegar só com `value`, o servidor trata como faixa `X = Y = value`.
- Erros (L9): "Digite o menor valor do mês, por exemplo 300,00", "Digite o maior valor do mês, por exemplo 600,00" e "O menor valor não pode ser maior que o maior valor".
- Resposta da API (despesa): acrescenta `valueMin` e `valueMax` (string ou `null`); `value` é o valor usado no cálculo.
- Interface ("Meu orçamento"): ao escolher o tipo "Variável", o campo "Valor por mês" vira dois campos, "Menor valor do mês" e "Maior valor do mês", cada um com `<FieldHelp>`. A lista mostra "R$ 300,00 a R$ 600,00 por mês" e avisa que o cálculo usa o maior valor.
- Interface ("Seus números" no Painel, SPEC-07 §5): mostra **Renda líquida mensal**, **Despesas fixas mensais**, **Despesas variáveis mensais** (somando a faixa $X$ a $Y$), **Parcelas do mês** e **Renda depois de despesas e parcelas**, com seletor entre três cenários para as despesas variáveis: **Pior cenário** (máximo $Y$), **Cenário médio** (média entre mínimo e máximo de cada despesa variável) e **Melhor cenário** (mínimo $X$).

## 3. Endpoints (todos: `requireAuth` + `requireTermsAccepted`; os que alteram, também `requireCsrf`)
Para cada recurso `R` ∈ {`incomes`, `expenses`, `debts`, `reserves`}:

| Método | Rota | Resposta |
|---|---|---|
| GET | `/R` | `200 { "items": [...] }` em ordem de criação |
| POST | `/R` | `201 { item }` |
| PUT | `/R/:id` | `200 { item }` (substituição completa; FA01) |
| DELETE | `/R/:id` | `204` (FA02; a confirmação é no frontend) |

Exemplo de item de dívida:
```json
{ "id": 7, "description": "Notebook", "category": "CREDIARIO", "installmentValue": "400.00",
  "remainingInstallments": 10, "totalInstallments": 12, "balanceDue": null,
  "referenceDate": "2026-10-29", "remainingNow": 10, "active": true, "balanceUsed": "4000.00" }
```
`GET /budget/summary` → `200 { "incomeTotal": "4000.00", "expenseTotal": "2000.00", "installmentTotal": "400.00", "debtBalanceTotal": "6000.00", "reserveTotal": "6000.00", "counts": { "incomes": 1, "expenses": 3, "debts": 1, "reserves": 1 } }`.

`id` de outro usuário ou inexistente → 404 `NOT_FOUND`. Falha de persistência → 500, sem alteração parcial (transação; E02).

## 4. Efeitos colaterais de toda escrita (create/update/delete)
Na **mesma transação**:
1. `log_auditoria { user_id, operacao: CREATE|UPDATE|DELETE, entidade: 'divida', entidade_id, detalhes: { campos: ["installmentValue"] } }`. Só nomes de campos, **nunca** valores.

**Depois do commit:**
2. Apagar o cache Redis `cache:analysis:<userId>` e `cache:projection:<userId>`.
3. Emitir `budgetChanged(userId)` (EventEmitter interno). A SPEC-07 assina esse evento para recalcular `indicador_financeiro` e fazer o upsert do histórico do dia.

## 5. Snapshot para o motor
`budgetRepository.buildSnapshot(userId, today): BudgetSnapshot` (tipo da SPEC-05):
```ts
{ incomes: Decimal[], expenses: Decimal[],
  debts: { id: number, installment: Decimal, remaining: number /* remainingNow */, balance: Decimal /* balanceUsed */ }[]  // só ativas
  , reserves: Decimal[], referenceDate: string /* hoje */ }
```
É a **única** porta entre o banco e o motor. Também deve existir uma implementação em memória (`InMemoryBudgetRepository`) para testes.

## 6. Interface (página "Meu orçamento", abas Renda · Despesas · Dívidas · Reserva)
- Lista com valor formatado (`R$ 1.600,00`), categoria, tipo e descrição; botões Editar e Excluir (com diálogo "Excluir este item? Esta ação não pode ser desfeita.").
- Formulário com campos de valor em máscara pt-BR (convertidos para `"1600.00"` antes de enviar) e `autocomplete="off"`.
- Aviso fixo acima do campo de descrição (SEGURANCA_LGPD §7.3): "Não escreva nomes de pessoas, dados de saúde, número de conta ou de cartão."
- Dívidas quitadas aparecem esmaecidas com o rótulo "Quitada".
- Estado vazio de cada aba com uma frase explicando para que o dado serve no cálculo.
- Depois de salvar, invalidar as queries de análise e projeção (o dashboard atualiza; RNF13 < 300 ms após a resposta).

## 7. Critérios de aceite
- [ ] CRUD completo das 4 entidades, com 404 para id de outro usuário (teste de IDOR com dois usuários)
- [ ] Validações do §2 retornam 400 com mensagem por campo; nada é gravado
- [ ] `description` gravada no banco não é legível (bytea cifrado); a API devolve o texto
- [ ] Dívida criada com 10 parcelas em 29/10 → `remainingNow` 10 hoje; com relógio em 29/12 → 8; em 29/08 do ano seguinte → 0 e `active=false`
- [ ] `balanceUsed` segue o D-04 com e sem `balanceDue`
- [ ] Toda escrita gera uma linha de auditoria sem valores e invalida o cache
- [ ] `buildSnapshot` só inclui dívidas ativas e usa `remainingNow` e `balanceUsed`
- [ ] Limites de quantidade retornam 400 com mensagem clara
