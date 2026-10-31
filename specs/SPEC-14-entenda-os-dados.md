# SPEC-14 — (Opcional) Aba "Entenda os dados"

| | |
|---|---|
| **Status** | **Opcional.** Só depois das SPEC-01 a 13 estarem prontas (primeiro corte se faltar tempo) |
| **Depende de** | SPEC-01, SPEC-11 |
| **Bloqueia** | — |
| **Rastreabilidade** | RF25 · UC11 · HU24 (novos) · áudio do grupo de 28/10/2026 · artigo Seção 7.2 (séries BCB) · PRD §4 |

## 1. Objetivo
Dar contexto educativo: mostrar como o endividamento das famílias brasileiras evoluiu nos últimos 5 anos e explicar, em linguagem simples, o que o SAFE avalia. **Não** orienta investimentos e **não** influencia o cálculo do IRE.

**HU24:** "Como usuário, quero ver dados públicos sobre endividamento e entender os termos usados, para interpretar melhor meu próprio resultado."

## 2. Dados
- Arquivos estáticos versionados em `backend/data/context/`:
  - `peic.csv` (CNC: % de famílias endividadas, com contas em atraso e sem condições de pagar; comprometimento médio);
  - `bcb-29037.csv` (endividamento das famílias / renda 12 meses);
  - `bcb-29265.csv` (comprometimento de renda com o serviço da dívida);
  - `bcb-29034.csv` (a mesma medida **com ajuste sazonal** do BCB; é a que o gráfico e a manchete mostram, porque a 29265 sobe e desce com o 13º e as festas e inverte a leitura da direção; a 29265 continua na tabela — T-14.7, 31/10/2026);
  - `selic.csv` (BCB SGS 432 ou 4189, a confirmar nos metadados).
- Cada arquivo tem cabeçalho com: fonte, URL, data de extração e unidade.
- Script `npm run context:update` baixa as séries do SGS (`api.bcb.gov.br/dados/serie/bcdata.sgs.<n>/dados?formato=json`) e grava o CSV. **Rodado manualmente pela equipe**, nunca pelo navegador do usuário (evita requisição a terceiros; SEGURANCA_LGPD §6.2).
- A planilha e o dashboard que o colega já montou servem de fonte e de referência visual. Converter os dados para os CSVs acima.

## 3. Endpoint
`GET /api/v1/context/series?from=AAAA-MM&to=AAAA-MM` (público ou logado, sem dados pessoais) →
`{ "series": [ { "id": "peic_endividadas", "name": "Famílias com dívidas (%)", "source": "CNC – Peic", "unit": "%", "points": [ { "date": "2026-07", "value": "82.0" } ] }, … ] }`

## 4. Interface (rota `/entenda`)
- Filtro de período (1, 3 ou 5 anos, ou personalizado).
- Gráficos de linha por série, cada um com tabela, fonte e data de extração visíveis.
- **Glossário:** comprometimento de renda, endividamento × inadimplência, Selic, mínimo existencial (R$ 600 e Lei 14.181/2021), reserva de emergência.
- **"Como o SAFE calcula seu risco":** os 4 indicadores, os pesos (40/30/20/10), as faixas e as limitações (sem calibração com inadimplência; não é diagnóstico).
- Aviso: "Dados públicos agregados da população brasileira. Não representam a sua situação individual nem são recomendação de investimento."

## 5. Critérios de aceite
- [ ] Séries com fonte, unidade e data de extração exibidas
- [ ] Filtro de período funciona
- [ ] Nenhuma requisição do navegador a domínios externos
- [ ] Nenhum texto sugere investimento ou produto financeiro
- [ ] RF25, UC11 e HU24 acrescentados ao PRD e citados em uma frase na Seção 4 do artigo (ou em Trabalhos futuros, se não entrar)
