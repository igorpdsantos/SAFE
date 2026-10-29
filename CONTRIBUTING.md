# Como trabalhamos no GitHub — SAFE

Dois programadores, cada um com sua IA, em branches separadas. A `main` é a base estável e recebe merges frequentes. Este arquivo vale para as pessoas **e** para as IAs (Claude, Copilot, Cursor, Codex etc.).

## 1. Trilhas
Cada tarefa do `TASKS.md` tem dono: `A`, `B` ou `A+B`.

| Trilha | Escopo | Pastas que mais mexe |
|---|---|---|
| **A** | Fundação, motor do IRE, projeção, orçamento, análise, simulação, histórico (API), avaliação | `backend/src/engine`, `backend/src/modules/{budget,analysis,simulations,history}`, `backend/prisma`, `evaluation/` |
| **B** | Login, sessão, termos, privacidade, todo o frontend, glossário e linguagem, testes de segurança e E2E | `backend/src/modules/{auth,terms,privacy}`, `backend/src/http/middlewares`, `frontend/`, `backend/test/security` |

Cada um **só implementa tarefas da própria trilha**. Precisa de algo da outra trilha? Combine antes: ou o dono faz, ou a tarefa troca de trilha no `TASKS.md` (num PR `docs:`).

## 2. Branches
- `main`: protegida. Só recebe código via Pull Request com CI verde. Nada de push direto.
- Uma branch **por spec ou por grupo pequeno de tarefas**, criada a partir da `main` atualizada:
  ```
  <trilha>/spec-<NN>-<assunto>
  a/spec-05-motor-ire
  b/spec-02-login-sessao
  a/spec-04-orcamento
  b/spec-11-frontend-base
  ```
- Documentação (specs, PRD, TASKS fora de status): `docs/<assunto>`, ex.: `docs/ajuste-spec-08`.
- **Branches curtas:** de algumas horas a 1 dia. Não existe "a branch do Igor" que dura a semana inteira. Isso evita um merge gigante no fim.

## 3. Ciclo de uma tarefa
```bash
git switch main && git pull
git switch -c a/spec-05-motor-ire
# 1. marcar T-05.1 como [~] no TASKS.md
git commit -am "T-05.1: inicia" && git push -u origin a/spec-05-motor-ire
gh pr create --draft --title "SPEC-05: motor do IRE (T-05.1–T-05.9)" --body "Tarefas: T-05.1 …"
# 2. codar + testes; commits pequenos "T-05.1: tipos e config do motor"
# 3. marcar [x] no TASKS.md no mesmo commit em que a tarefa termina
# 4. repetir para as próximas tarefas da mesma spec
# 5. quando a spec (ou o grupo) estiver pronto:
gh pr ready
```
O PR em rascunho (Draft) aberto desde o início é o "tempo real" para o outro programador: ele vê o `TASKS.md` e o código evoluindo pelo GitHub sem esperar o merge.

## 4. Manter a branch atualizada
Pelo menos **1 vez por dia** e **sempre que um marco (M1–M5 do `TASKS.md`) entrar na `main`**:
```bash
git fetch origin
git merge origin/main        # preferir merge a rebase depois que a branch já foi publicada
npm install && npm test
```

## 5. Pull Request
- **Título:** `SPEC-NN: <assunto> (T-NN.a–T-NN.b)`.
- **Corpo:** lista das tarefas, o que mudou, como testar, prints (se tiver tela) e o checklist abaixo.
- [ ] CI verde (lint, typecheck, testes, cobertura do `engine/` ≥ 80%, `npm audit`)
- [ ] Critérios de aceite da spec atendidos
- [ ] `TASKS.md`: só linhas da minha trilha alteradas
- [ ] Nada de segredo, `.env`, dado real ou `console.log` com dado de usuário
- [ ] Textos de interface seguem a SPEC-15 (se mexeu em tela)
- [ ] Regras da SEGURANCA_LGPD respeitadas (se mexeu em login, cookies, formulários, logs, exportação ou exclusão)

**Revisão:** o outro programador revisa (pode usar a IA dele para ajudar, mas a aprovação é humana). Se ele não conseguir em até ~2 h, o autor pode mergear com CI verde e avisar no grupo. O prazo é curto.

**Merge:** *Squash and merge*, com a mensagem `SPEC-NN: assunto (T-…)`. Depois, apagar a branch.

## 6. Arquivos com risco de conflito e como tratar
| Arquivo | Regra |
|---|---|
| `TASKS.md` | Cada um só mexe nas linhas da sua trilha. Não existe contagem manual (o painel vem de `node scripts/tasks-status.mjs`). Conflito na tabela "Bloqueios" → manter as duas linhas |
| `backend/prisma/schema.prisma` e migrations | O schema completo nasce na base (T-01.3). Mudança depois disso: **só a trilha A**, com uma migration por PR. Se B precisar de campo novo, pede para A. Conflito em migration → apagar a sua, mergear a `main` e gerar de novo (`prisma migrate dev`) |
| `package.json` / `package-lock.json` | Conflito no lock → aceitar o da `main` e rodar `npm install` para regerar. Avise no PR quando adicionar dependência |
| `backend/src/http/routes.ts` | Cada módulo exporta seu próprio router; aqui é só **uma linha por módulo**. Conflito → manter as duas linhas |
| `.env.example` | Só acrescentar variáveis, em ordem alfabética dentro de cada bloco |
| `frontend/src/content/glossary.ts` | Trilha B é a dona. A trilha A sugere termos novos no PR |
| `specs/*.md`, `PRD.md`, `SEGURANCA_LGPD.md` | Mudança só em PR `docs/…` próprio, pequeno e mergeado rápido, avisando o outro |

## 7. Commits
- Formato: `T-NN.M: o que foi feito` (ex.: `T-05.3: normalize com clamp de R_CP`). Para várias tarefas: `T-05.3, T-05.4: …`.
- Documentação: `docs: …`. Correções sem tarefa: `fix: …`. Sempre que possível, ligar a uma tarefa.
- Pequenos e frequentes; nunca commitar com teste quebrado na `main`.

## 8. IAs (Claude, Copilot, Cursor, Codex…)
- Toda IA lê o `CLAUDE.md` (o `AGENTS.md` aponta para ele) e segue o fluxo de tarefas.
- **No início de cada sessão, a IA confirma a trilha** pelo nome da branch (`a/…` ou `b/…`). Se não der para saber, pergunta à pessoa.
- A IA **não**:
  - pega tarefa da outra trilha;
  - mexe em linhas de outra trilha no `TASKS.md`;
  - faz push na `main`, faz merge de PR ou force-push;
  - altera migrations já mergeadas;
  - commita `.env`.
- A IA pode abrir PR em rascunho e marcar como pronto quando os critérios estiverem cumpridos. **O merge é sempre feito por uma pessoa.**
- Se duas IAs discordarem de uma regra, a pessoa decide e a spec é atualizada.

## 9. Configuração única do repositório (T-00.4)
- Proteção da `main`: exigir PR, exigir CI verde (`ci`), bloquear force-push e exclusão.
- Merge permitido: só *squash*. "Automatically delete head branches" ligado.
- Secrets do Actions: só os necessários para o CI (nenhum de produção no CI).
- Labels: `trilha-a`, `trilha-b`, `docs`, `bloqueado`.
