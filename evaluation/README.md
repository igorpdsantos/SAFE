# Avaliação do modelo (SPEC-12, artigo Seção 7)

Os scripts usam **o mesmo motor da API** (`backend/src/engine`), sem banco. Cada CSV em `results/` começa com uma linha `# commit: <sha> · data: <AAAA-MM-DD>`, que diz exatamente com qual versão do motor ele foi gerado.

| Comando (na raiz) | O que faz | Pergunta do artigo |
|---|---|---|
| `npm run generate-personas` | Gera `personas.csv` (30 personas fictícias, semente 2026, regras na coluna `regra_geracao`). Rodar de novo produz o mesmo arquivo | — |
| `npm run eval:personas` | IRE, riscos e faixa de cada persona → `results/personas-*.csv`; planilha cega `especialistas.csv` (só id e descrição, sem índice) | PA1 |
| `npm run eval:agreement` | Spearman ρ (IRE × mediana dos especialistas), Kappa ponderado quadrático por avaliador, matriz de confusão e discordâncias. Precisa de `especialistas-respostas.csv` com as colunas `id,avaliador,faixa` | PA1 |
| `npm run eval:sensitivity` | Pesos ±10% e ±20% (renormalizados) e limites das faixas ±0,02 e ±0,05: **M** = proporção de personas que mudam de faixa | PA2 |
| `npm run eval:baseline [-- --limit=0.30]` | Regra simples só de comprometimento da renda × IRE em 3 níveis, com o motivo de cada divergência | PA3 |
| `npm run eval:simulation-check` | 200 cenários aleatórios + 9 de mínimo existencial: ΔIRE ≥ 0, ΔC_lf = 0, \|Σ ΔC − ΔIRE\| < 1e-9 e detecção do mínimo. Sai com erro se houver falha | PA4 |
| `npm run eval:latency [-- --url=http://localhost:3000]` | 500 requisições a `GET /analysis` e `POST /simulations`: mediana, p95, p99 e hardware. Precisa da API em modo de teste (`npm run dev:demo`) | RNF01 |

`scripts/stats.ts` implementa Spearman (com empates) e Kappa ponderado, testados em `scripts/stats.test.ts`.

As personas são **fictícias** (S-08). O contexto agregado do BCB (SGS 29037 e 29265) só é citado no artigo e não é usado como rótulo de validação.

## Resultados de 29/10/2026 (commit `1b6af5f`)

- **Personas:** 30, distribuídas nas faixas 1: 7 · 2: 3 · 3: 10 · 4: 2 · 5: 8.
- **Sensibilidade (PA2):** sem perturbação, M = 0 (sanidade). Com pesos ±10% e ±20%, o maior M foi 0,100 (3 de 30 personas mudam de faixa no pior cenário). Detalhe por peso em `results/sensitivity-20261029.csv`.
- **Regra simples × IRE (PA3):** 12 divergências em 30 personas; cada uma com o motivo em `results/baseline-20261029.csv`.
- **Simulação (PA4):** 209 cenários, **0 falhas**.
- **Latência (RNF01), Apple M4, Node 22:** `GET /analysis` mediana 1,0 ms e p95 1,8 ms; `POST /simulations` mediana 1,5 ms e p95 2,1 ms.
- **Concordância (PA1):** aguardando as respostas dos especialistas em `especialistas-respostas.csv`.
