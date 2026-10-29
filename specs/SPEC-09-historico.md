# SPEC-09 — Histórico e evolução do risco

| | |
|---|---|
| **Status** | Aprovada para implementação |
| **Depende de** | SPEC-07 (é quem grava o histórico) |
| **Bloqueia** | — |
| **Rastreabilidade** | UC10 (FA01, E01, E02) · RF19, RF20 · HU17, HU18 · D-09 · OS4 |

## 1. Objetivo
Mostrar como o IRE e a faixa do usuário evoluíram ao longo do tempo. A gravação já acontece na SPEC-07 (1 registro por dia); esta spec cuida da leitura e do gráfico.

## 2. Endpoint `GET /api/v1/history?from=YYYY-MM-DD&to=YYYY-MM-DD` (auth + termos)
- Padrão: últimos 12 meses. Máximo de 366 dias por consulta; intervalo inválido → 400.
- Ordenado por `record_date` crescente (UC10 passo 3).
```json
{ "points": [ { "date": "2026-10-29", "ire": "0.19", "band": 1, "label": "Baixo risco" }, … ],
  "trend": "INSUFICIENTE" | "MELHORANDO" | "ESTAVEL" | "PIORANDO" }
```
- `trend`: com menos de 2 pontos, `INSUFICIENTE` (FA01). Senão, compara o último ponto com o primeiro do período: diferença ≤ −0,05 → `MELHORANDO`; ≥ +0,05 → `PIORANDO`; senão, `ESTAVEL`.
- Sem registros → `points: []` (E01; a interface mostra a mensagem). Erro → 500 (E02).

## 3. Interface (página "Evolução")
- Gráfico de linha do IRE (0 a 1) com faixas coloridas de fundo (0–0,20 verde etc.) e rótulos das faixas no eixo Y, para não depender só da cor.
- Tooltip com data em pt-BR, IRE e rótulo da faixa.
- Tabela acessível com os mesmos pontos.
- Seletor de período: 3 meses, 6 meses, 12 meses.
- 0 pontos: "Ainda não há histórico. Ele começa a ser registrado quando você cadastra seus dados."
- 1 ponto: mostra o ponto e "Ainda não há dados suficientes para mostrar uma tendência." (FA01).
- Frase de tendência: "Seu risco está melhorando / estável / piorando nos últimos N meses."

## 4. Critérios de aceite
- [ ] Usuário com 3 dias de alterações → 3 pontos em ordem
- [ ] Várias alterações no mesmo dia → 1 ponto (o último valor)
- [ ] `trend` correto nos 4 casos
- [ ] Período fora do limite → 400
- [ ] Histórico de outro usuário nunca aparece
