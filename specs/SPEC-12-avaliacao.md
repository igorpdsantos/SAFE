# SPEC-12 — Ferramentas de avaliação do modelo (Seção 7 do artigo)

| | |
|---|---|
| **Status** | Aprovada para implementação |
| **Depende de** | SPEC-05, SPEC-08 (e SPEC-07 só para o script de latência) |
| **Bloqueia** | Resultados do artigo (PA1–PA4, RNF01) |
| **Rastreabilidade** | PRD §9 · artigo Seções 7.2 a 7.5 e 7.7 · RNF01, RNF14 |

## 1. Objetivo
Gerar, de forma reprodutível, os números que o artigo hoje tem como placeholder. Os scripts usam **o mesmo motor da API** (`backend/src/engine`), sem banco.

## 2. Personas (`evaluation/personas.csv`)
- 30 linhas: `id,descricao,renda,despesas,parcelas,saldo_devedor,reserva,regra_geracao`.
- Distribuição: 8 de baixo comprometimento, 8 moderado, 8 alto e 6 casos-limite. Os casos-limite são: reserva zero, renda baixa (R$ 1.500), muitas dívidas pequenas, uma dívida grande, despesas = renda, sem dívidas com reserva zero.
- A coluna `regra_geracao` documenta a regra, por exemplo "CR alvo 0,35; LF 0; D = 55% da renda".
- O gerador `evaluation/generate-personas.ts` usa semente fixa (`seed=2026`) e regras explícitas, **e** o CSV final vai para o Git. Os especialistas avaliam exatamente esse arquivo.
- Contexto agregado (BCB SGS 29037 e 29265) só é citado no artigo; **não** é rótulo de validação.

## 3. Scripts (`npm run eval:<nome>`; saída em `evaluation/results/<nome>-AAAAMMDD.csv`, mais um resumo no terminal)

| Script | Entrada | Saída | PA |
|---|---|---|---|
| `personas` | personas.csv | `id, CR, CP, LF, NE, R_cr, R_cp, R_lf, R_ne, IRE, faixa` e a planilha `especialistas.csv` (só `id` + descrição legível dos valores, **sem** o IRE, para avaliação às cegas) | PA1 |
| `agreement` | resultados de `personas` + `evaluation/especialistas-respostas.csv` (id, avaliador, faixa 1–5) | Spearman ρ (IRE × mediana dos especialistas), Kappa ponderado quadrático por avaliador vs IRE, matriz de confusão, lista de discordâncias | PA1 |
| `sensitivity` | personas.csv | Para cada peso k e δ ∈ {−20%, −10%, +10%, +20%}: `w_k' = w_k·(1+δ)`, renormaliza Σw = 1 e calcula **M** = proporção de personas que mudam de faixa (artigo Eq. mudanca-faixa). Bloco separado para os limites das faixas deslocados em ±0,02 e ±0,05. Lista quais personas mudaram | PA2 |
| `baseline` | personas.csv | Regra simples: CR < 30% baixo, 30–50% médio, > 50% alto (limite configurável `--limit`). Compara com o IRE agrupado em 3 níveis (1–2 / 3 / 4–5), conta as divergências e lista cada caso com o motivo (ex.: "CR 25%, reserva 0") | PA3 |
| `simulation-check` | 200 cenários aleatórios (semente fixa) + 9 cenários de mínimo existencial (renda residual 599,99 / 600 / 600,01 × 3 perfis) | Verifica ΔIRE ≥ 0, ΔC_lf = 0, \|Σ ΔC − ΔIRE\| < 1e-9 e a detecção correta de ME. Conta e lista falhas (o esperado é 0) | PA4 |
| `latency` | API rodando + usuário de teste | 500 requisições a `/analysis` e `POST /simulations`: mediana, p95, p99, hardware e versão. Critério p95 ≤ 1 s | RNF01 |

Estatística: implementar Spearman (com empates) e Kappa ponderado em `evaluation/stats.ts` com teste unitário contra valores conhecidos (exemplo da literatura). Não depender de Python.

## 4. Reprodutibilidade
- `evaluation/README.md` explica como rodar cada script, a versão do motor (`git rev-parse HEAD`, escrita no cabeçalho de cada CSV) e a data.
- Os resultados usados no artigo ficam commitados em `evaluation/results/`.

## 5. Critérios de aceite
- [ ] `personas.csv` com 30 linhas e regras documentadas; o gerador produz o mesmo arquivo de novo
- [ ] `especialistas.csv` não contém IRE nem faixa
- [ ] `sensitivity` com pesos sem perturbação dá M = 0 (sanidade)
- [ ] `simulation-check` reporta 0 falhas
- [ ] `stats.ts` testado: Spearman de listas idênticas = 1; Kappa de avaliações idênticas = 1
- [ ] Cada CSV tem cabeçalho com o commit e a data
