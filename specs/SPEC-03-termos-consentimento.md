# SPEC-03 — Termos, política, maioridade e consentimento de pesquisa

| | |
|---|---|
| **Status** | Aprovada para implementação |
| **Depende de** | SPEC-02 |
| **Bloqueia** | SPEC-04 a SPEC-10 (o middleware `requireTermsAccepted` protege as rotas financeiras) |
| **Rastreabilidade** | UC02 (FA01, FA02, E01, E02) · RF02, RF03 · HU02, HU03 · S-03, S-07, S-09 · SEGURANCA_LGPD §2, §7 |

## 1. Objetivo
Garantir que ninguém use as funções financeiras sem ter aceitado a **versão vigente** dos Termos de Uso, ter tomado ciência da Política de Privacidade e ter declarado ter 18 anos ou mais. Registrar a prova no banco. Oferecer o consentimento **opcional e separado** de participação na pesquisa do TCC.

## 2. Versões e textos
- `TERMS_VERSION` e `PRIVACY_VERSION` vêm do `.env` (ex.: `1.0`).
- Os textos ficam em `frontend/public/legal/termos-v1.0.md` e `privacidade-v1.0.md`, servidos estáticos e versionados no Git. O conteúdo mínimo de cada um está em SEGURANCA_LGPD §7.1. **A redação final é tarefa da equipe** (T-03.5).
- Mudou uma das versões → todo usuário precisa aceitar de novo no próximo acesso (FA02).

## 3. Regra "termos em dia"
```
termsUpToDate(userId) = existe aceitacao_termos com user_id = userId
                        AND terms_version = TERMS_VERSION AND privacy_version = PRIVACY_VERSION AND age_confirmed = true
```
Resultado em cache na sessão (`termsOk: true`) depois da primeira verificação positiva; invalidado ao aceitar.

Middleware `requireTermsAccepted` em todas as rotas de SPEC-04 a SPEC-10 (exceto `GET /me/export` e `DELETE /me`, que funcionam mesmo sem termos em dia: o titular pode sempre exportar ou apagar seus dados). Falhou → 403 `TERMS_REQUIRED`.

O cookie `safe_terms` (RF03) guarda só `"<terms_version>|<privacy_version>"`. É **atalho de interface** para o frontend decidir a rota inicial. O servidor **nunca** confia nele.

## 4. Endpoints
| Método e rota | Auth | Corpo / resposta |
|---|---|---|
| `GET /terms/current` | sim | `200 { "termsVersion": "1.0", "privacyVersion": "1.0", "termsUrl": "/legal/termos-v1.0.md", "privacyUrl": "/legal/privacidade-v1.0.md", "accepted": false }` |
| `POST /terms/accept` | sim + CSRF | Corpo `{ "termsVersion": "1.0", "privacyVersion": "1.0", "acceptTerms": true, "acknowledgePrivacy": true, "ageConfirmed": true, "researchConsent": false }` |
| `GET /me/research-consent` | sim | `200 { "granted": false, "grantedAt": null }` |
| `PUT /me/research-consent` | sim + CSRF | `{ "granted": true }` → 200 |

**`POST /terms/accept`:**
- As versões enviadas devem ser iguais às vigentes, senão 409 `TERMS_OUTDATED` "Os termos foram atualizados; recarregue a página".
- `acceptTerms`, `acknowledgePrivacy` e `ageConfirmed` precisam ser `true`, senão 400 com `fields` (E01).
- Grava `aceitacao_termos { user_id, terms_version, privacy_version, age_confirmed: true, dt_accept_terms: now, token_id: uuid }` (FA01: se já existe aceite idêntico, devolve 200 sem duplicar).
- Se `researchConsent = true`, cria `consentimento_pesquisa { granted_at: now, text_version: TERMS_VERSION }`.
- Define o cookie `safe_terms` (HttpOnly, Secure, SameSite=Lax, Max-Age 1 ano).
- Audita `TERMS_ACCEPT` (e `RESEARCH_CONSENT_GRANT`, se for o caso).
- Erro ao gravar → 500 e o aceite **não** é considerado (E02).

**`PUT /me/research-consent`:** `granted = false` preenche `revoked_at` no registro ativo (revogação, art. 8º §5); `granted = true` cria um novo registro. Audita.

## 5. Interface (rota `/termos`)
Tela única, sem nada pré-marcado:
- [ ] Li e aceito os **Termos de Uso** (link abre o texto num painel)
- [ ] Li a **Política de Privacidade** (link)
- [ ] Declaro ter **18 anos ou mais**
- [ ] *(opcional)* Aceito participar da pesquisa do TCC com meus dados anonimizados. Posso revogar quando quiser.

"Continuar" só habilita com os três obrigatórios. "Não aceito" → explica que sem os termos não é possível usar o SAFE e oferece "Sair" (logout).

No primeiro acesso a qualquer página, mostrar a faixa informativa de cookies (SEGURANCA_LGPD §5.1). "Entendi" grava `localStorage.safe_cookie_notice = "1"`.

## 6. Critérios de aceite
- [ ] Usuário recém-criado → toda rota financeira devolve 403 `TERMS_REQUIRED`; o frontend redireciona para `/termos`
- [ ] Aceite válido → rotas liberadas; registro no banco com as duas versões e `age_confirmed = true`
- [ ] Faltando qualquer um dos 3 obrigatórios → 400 com `fields` e nada gravado
- [ ] Trocar `TERMS_VERSION` para `1.1` → o mesmo usuário volta a receber 403 e vê a tela de novo (FA02)
- [ ] Apagar o cookie `safe_terms` no navegador não muda nada no servidor (a prova está no banco)
- [ ] Forjar `safe_terms=1.1|1.1` não libera nada
- [ ] Consentimento de pesquisa pode ser dado e revogado; a revogação guarda `revoked_at`
- [ ] `GET /me/export` e `DELETE /me` funcionam sem termos em dia
