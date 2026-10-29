# SPEC-13 — Qualidade, testes de integração, segurança e homologação

| | |
|---|---|
| **Status** | Aprovada para implementação |
| **Depende de** | Todas as specs funcionais (roda em paralelo, conforme elas ficam prontas) |
| **Bloqueia** | Entrega (02/11) |
| **Rastreabilidade** | RNF01, RNF05–RNF08, RNF10, RNF13–RNF15 · SEGURANCA_LGPD §12 · artigo Seção 7.7 (verificação técnica) · Sprint 4 (testes e2e e homologação) |

## 1. Objetivo
Garantir que o sistema entregue atende os critérios de aceite, os requisitos de segurança e os números que o artigo vai citar (cobertura, latência).

## 2. Pirâmide de testes
| Nível | Ferramenta | O que cobre | Onde |
|---|---|---|---|
| Unidade | Vitest + fast-check | Motor (SPEC-05, 06, 08), `lib/` (decimal, crypto), validações zod | `backend/src/**/*.test.ts` |
| Integração de API | Vitest + Supertest + Postgres e Redis de teste (Docker) | Cada endpoint: sucesso, validação, 401/403/404, efeitos colaterais | `backend/test/api/*.test.ts` |
| Segurança | Supertest | Suíte do §3 | `backend/test/security/*.test.ts` |
| E2E | Playwright | Fluxos do §4 com login simulado | `frontend/e2e/*.spec.ts` |

**Login em teste:** a rota `POST /api/v1/test/login { email }` só existe com `NODE_ENV=test`. Ela cria a sessão sem Google e **nunca** é registrada em produção (teste que confirma que a rota devolve 404 em produção).

## 3. Suíte de segurança (obrigatória)
- [ ] **IDOR:** o usuário A tenta GET, PUT e DELETE em renda, despesa, dívida, reserva, simulação e alerta do usuário B → 404 em todos
- [ ] **CSRF:** sem cabeçalho, com cabeçalho errado ou com `Origin` estranho → 403
- [ ] **Sessão:** expiração ociosa, expiração absoluta, logout invalida, logout-all invalida
- [ ] **Termos:** rotas financeiras sem aceite → 403
- [ ] **Cabeçalhos:** CSP, HSTS (produção), `nosniff`, `no-referrer`, `no-store` em `/api`
- [ ] **Cookies:** só os 4 previstos, com os atributos certos
- [ ] **Logs:** capturar a saída do logger durante a suíte e verificar que não aparece e-mail, valor monetário de teste (ex.: `987654.32`), cookie nem csrf
- [ ] **Criptografia:** `description` no banco ≠ texto; a API devolve o texto
- [ ] **Exclusão:** nenhum resto do usuário no banco nem no Redis
- [ ] **Entrada:** corpo > 10 KB → 413; valores negativos, `NaN`, `"1e9"` e strings enormes → 400
- [ ] **Rate limit:** limites da SPEC-02 §6
- [ ] **Rota de teste** ausente em produção

## 4. Fluxos E2E (Playwright)
1. Primeiro acesso: login → termos → aviso de cookies → dashboard vazio com checklist.
2. Cadastro completo do caso do artigo (renda 4000, despesas 2000, dívida 400×10 com saldo 6000, reserva 6000) → dashboard mostra IRE 0,19 "Baixo risco".
3. Simulação 6000 / 12 / 600 → 0,38 "Risco moderado", CR e CP como principais, explicação exibida; orçamento inalterado.
4. Simulação que leva a CP ≤ 0 → banner crítico.
5. Projeção mostra 12 meses; editar a dívida atualiza a projeção.
6. Evolução mostra pelo menos 1 ponto.
7. Logout → voltar não mostra dados; outra aba também sai.
8. Exportar dados → arquivo JSON baixado com a renda cadastrada.
9. Excluir conta → tela de confirmação; novo login cria conta vazia.
10. Celular (375 px): fluxos 2 e 3.

## 5. Métricas para o artigo
- Cobertura de `engine/` ≥ 80% (RNF08): relatório `coverage/` no CI; anotar o valor real no artigo.
- Latência: script `latency` (SPEC-12); anotar mediana e p95 reais.
- Critérios de aceite: planilha `docs/aceite.md` com cada HU e seus critérios marcados (alimenta "Corretude funcional" no artigo).

## 6. Homologação (02/11)
- [ ] CI verde (lint, typecheck, unidade, integração, segurança, cobertura, `npm audit`)
- [ ] E2E 1–10 passando localmente
- [ ] Checklist "antes de abrir" da SEGURANCA_LGPD §12 completo
- [ ] README com instalação, variáveis, comandos, backup e restauração
- [ ] Tag `v1.0.0` no Git
