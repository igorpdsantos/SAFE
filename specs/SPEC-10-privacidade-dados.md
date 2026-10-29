# SPEC-10 — Direitos do titular: meus dados, exportação, exclusão e retenção

| | |
|---|---|
| **Status** | Aprovada para implementação |
| **Depende de** | SPEC-02, SPEC-03, SPEC-04 (e as tabelas das SPEC-07 a 09) |
| **Bloqueia** | Publicação para qualquer usuário |
| **Rastreabilidade** | RF24 · HU19 · RNF09, RNF11 · S-06 · SEGURANCA_LGPD §3, §8 · LGPD art. 18 |

## 1. Objetivo
Permitir que o titular veja, exporte e apague seus dados, e aplicar automaticamente as regras de retenção.

## 2. Endpoints (auth; **não** exigem termos em dia)
| Método e rota | Regras |
|---|---|
| `GET /me` | `{ email, createdAt, lastLoginAt, termsAcceptedAt, termsVersion, privacyVersion, researchConsent, counts: { incomes, expenses, debts, reserves, simulations, historyPoints, alerts } }` |
| `GET /me/export` | Rate limit 5/h. `Content-Type: application/json`, `Content-Disposition: attachment; filename="safe-meus-dados-AAAA-MM-DD.json"`. Gerado na hora, **não** fica salvo. Audita `EXPORT` |
| `DELETE /me` | CSRF + corpo `{ "confirm": "EXCLUIR" }` (senão 400). Rate limit 3/h |

### 2.1 Conteúdo da exportação (RNF11 / portabilidade)
```json
{ "exportedAt": "…", "format": "safe-export-v1",
  "account": { "email": "…", "createdAt": "…" },
  "acceptances": [ { "termsVersion": "1.0", "privacyVersion": "1.0", "acceptedAt": "…" } ],
  "researchConsent": [ … ],
  "incomes": [ … ], "expenses": [ … ], "debts": [ … ], "reserves": [ … ],   // descrições decifradas
  "currentIndicators": { … }, "history": [ … ], "simulations": [ … ], "alerts": [ … ] }
```
Não inclui `oauth_subject`, `token_id` nem logs internos.

### 2.2 Exclusão (SEGURANCA_LGPD §8.2) — uma transação
1. `UPDATE aceitacao_termos SET user_id = NULL` e `UPDATE log_auditoria SET user_id = NULL` do usuário.
2. Inserir `log_auditoria { user_id: NULL, operacao: 'ACCOUNT_DELETED', entidade: 'usuario', entidade_id: <id>, dt_evento: now }`.
3. `INSERT exclusoes_pendentes_backup (user_id, deleted_at)`.
4. `DELETE FROM usuario WHERE user_id = $1`. O cascade apaga renda, despesa, dívida, reserva, indicador, histórico, simulações, alertas e consentimento de pesquisa.

Depois do commit:
5. `destroyAllSessions(userId)` (SPEC-02) e `DEL cache:*:<userId>`.
6. Responder 204 com `Clear-Site-Data: "cache", "cookies", "storage"` e expirar os cookies.

Tokens do Google não são guardados (SPEC-02), então não há o que revogar. A interface sugere: "Se quiser, remova o acesso do SAFE em myaccount.google.com/permissions."

## 3. Jobs de retenção (diários, 03:00 America/Sao_Paulo, `node-cron` dentro da API)
| Job | Regra |
|---|---|
| `purgeInactiveAccounts` | `last_login_at < now − 12 meses` → mesmo fluxo do §2.2 |
| `purgeOldSimulations` | `simulacao_financeira.dt_simulation < now − 12 meses` → DELETE |
| `purgeAudit` | `log_auditoria.dt_evento < now − 6 meses` → DELETE |
| `purgeOrphanAcceptances` | `aceitacao_termos.user_id IS NULL AND dt_accept_terms < now − 6 meses` → DELETE |
| `purgeBackupDeletionList` | `exclusoes_pendentes_backup.deleted_at < now − 30 dias` → DELETE |

Cada job loga só a contagem de registros afetados.

## 4. Backups (RNF09) — procedimento documentado no README
- `pg_dump` diário, criptografado (`age` ou o recurso do provedor), retenção de 30 dias.
- **Restauração:** depois de restaurar, rodar `npm run privacy:reapply-deletions`, que apaga de novo todo `user_id` presente em `exclusoes_pendentes_backup`.

## 5. Interface ("Minha conta")
- **Meus dados:** e-mail, data de criação, versões aceitas, contagens e o interruptor "Participar da pesquisa do TCC" (SPEC-03).
- **Baixar meus dados (JSON).**
- **Sair de todos os dispositivos** (SPEC-02).
- **Excluir minha conta:** tela com a lista do que será apagado, "Esta ação não pode ser desfeita", campo para digitar `EXCLUIR` e botão vermelho. Depois: tela "Sua conta e seus dados foram excluídos. Cópias de segurança são apagadas automaticamente em até 30 dias." (sem sessão).
- Links para a Política de Privacidade e o e-mail de contato do projeto.

## 6. Critérios de aceite
- [ ] Exportação contém todos os dados do usuário (descrições legíveis) e nenhum dado de outro usuário
- [ ] Após `DELETE /me`: nenhuma linha com aquele `user_id` em nenhuma tabela; `aceitacao_termos` e `log_auditoria` só com `user_id NULL`; nenhuma chave Redis do usuário; o cookie antigo → 401
- [ ] `confirm` ausente ou diferente de `EXCLUIR` → 400 e nada apagado
- [ ] Jobs testados com relógio falso: conta inativa 12 meses + 1 dia é apagada; com 11 meses, não
- [ ] `privacy:reapply-deletions` apaga usuários restaurados que estão na lista
