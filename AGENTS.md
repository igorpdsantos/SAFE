# AGENTS.md

Instruções para qualquer assistente de IA que trabalhe neste repositório (Codex, Cursor, Copilot, Gemini, Claude etc.).

**As instruções completas estão no [`CLAUDE.md`](CLAUDE.md). Leia esse arquivo inteiro antes de qualquer ação.** Ele vale para todas as IAs, não só para o Claude.

Resumo do que nunca pode ser ignorado:
1. Leia, nesta ordem: `TASKS.md` → `CONTRIBUTING.md` → a spec da tarefa em `specs/` → `PRD.md` e `SEGURANCA_LGPD.md` quando a tarefa tocar nesses temas.
2. Descubra a trilha (`A` ou `B`) pelo nome da branch (`a/…` ou `b/…`); na dúvida, pergunte. Só pegue tarefas da sua trilha e só altere as linhas da sua trilha no `TASKS.md`.
3. Marque a tarefa como `[~]` e dê push **antes** de codar. Marque `[x]` só com testes passando e critérios de aceite cumpridos.
4. Nunca: push ou merge na `main`, force-push, commitar `.env`, alterar migration já mergeada, guardar dado financeiro no navegador, usar `number` para dinheiro, usar sigla ou termo técnico sem explicação na interface (SPEC-15).
