# SPEC-02 — Autenticação e sessão

| | |
|---|---|
| **Status** | Aprovada para implementação |
| **Depende de** | SPEC-01 |
| **Bloqueia** | SPEC-03, SPEC-04 e todas as rotas autenticadas |
| **Rastreabilidade** | UC01 (FA01–FA03, E01–E03) · RF01 · HU01 · RNF02 · S-01, S-04 · SEGURANCA_LGPD §4, §5.1, §5.4 |

## 1. Objetivo
Login com Google (OpenID Connect) sem guardar senha nem token do Google, e sessão opaca no servidor (Redis) com cookie `HttpOnly`. Inclui CSRF, logout, "sair de todos os dispositivos", expiração e rate limit.

## 2. Fluxo de login (UC01)
```
GET /api/v1/auth/google
  → gera state, nonce, code_verifier (32 bytes cada, base64url)
  → cookie __Host-safe_oauth = assinado(SESSION_SECRET){state, nonce, verifier}  (HttpOnly, Secure*, SameSite=Lax, Path=/, Max-Age=600)
  → 302 para accounts.google.com com response_type=code, scope="openid email", code_challenge (S256), state, nonce, prompt=select_account

GET /api/v1/auth/google/callback?code&state
  → lê e apaga __Host-safe_oauth; confere state (E03 se divergir/expirado)
  → troca code por tokens (com code_verifier); valida id_token: assinatura JWKS, iss, aud, exp, nonce, email_verified = true
  → descarta access/refresh token (não persistir)
  → upsert usuario por oauth_subject (= sub): cria no 1º acesso (FA02, state='ATIVO', dt_criacao=now) ou atualiza email e last_login_at (FA03)
  → cria sessão (§3) → 302 para APP_ORIGIN + "/" (ou "/termos" se o aceite não estiver em dia; SPEC-03)
```
\* Em `NODE_ENV=development` sobre `http://localhost`, o prefixo `__Host-` e `Secure` não funcionam. Usar o nome `safe_sid` sem `Secure` **só** em desenvolvimento, via config. Vale para os três cookies.

**Erros (UC01):**
| Caso | Comportamento |
|---|---|
| E01 usuário cancelou (`error=access_denied`) | 302 `/login?erro=cancelado` → "O acesso não foi concluído." |
| E02 Google indisponível (timeout 5 s ou erro de rede) | 302 `/login?erro=indisponivel` → "Serviço de login indisponível. Tente novamente." |
| E03 state/nonce inválido, expirado ou token inválido | 302 `/login?erro=invalido` → "Não foi possível validar o login. Tente de novo." |
| E-mail não verificado | 302 `/login?erro=email` → "Sua conta Google precisa ter o e-mail verificado." |
| Conta `INATIVO` | Tratar como novo acesso; reativa (`state='ATIVO'`) |

Biblioteca: `openid-client` (descoberta do emissor `https://accounts.google.com`). Não usar Passport.

## 3. Sessão
| Item | Regra |
|---|---|
| ID | `randomBytes(32)` em base64url; o cookie leva o ID e o Redis guarda a chave `sess:<sha256(id)>` (o ID cru nunca vai para o Redis) |
| Valor no Redis | `{ userId, createdAt, lastSeenAt, csrf }` (JSON) |
| TTL | Redis `EX 1800` renovado a cada requisição autenticada (30 min ociosa). Se `now − createdAt > 8 h` → destrói e 401 `SESSION_EXPIRED` |
| Índice | `user_sessions:<userId>` (SET de hashes) para "sair de todos" e para a exclusão de conta |
| Cookie | `__Host-safe_sid=<id>; HttpOnly; Secure; SameSite=Lax; Path=/` **sem Max-Age** (some ao fechar o navegador) |
| CSRF | `csrf = randomBytes(32)`, enviado também em `__Host-safe_csrf` (sem HttpOnly) |
| Novo login | Sempre gera ID novo; se havia cookie antigo, destrói a sessão antiga (contra fixação de sessão) |

Middleware `requireAuth`: lê o cookie, busca no Redis, aplica as expirações, atualiza `lastSeenAt` e TTL e põe `req.userId`. Sem sessão → 401 `UNAUTHENTICATED`.

## 4. CSRF
Middleware `requireCsrf` em todo `POST/PUT/PATCH/DELETE` sob `/api/v1` (exceto o callback, que é GET):
1. `Origin` (ou `Referer`, se faltar `Origin`) deve ser igual a `APP_ORIGIN`.
2. O cabeçalho `X-SAFE-CSRF` deve ser igual ao `csrf` da sessão (comparação em tempo constante).

Se falhar → 403 `CSRF_FAILED`. O frontend lê `__Host-safe_csrf` (`document.cookie`) e envia no cabeçalho.

## 5. Endpoints
| Método e rota | Auth | Resposta |
|---|---|---|
| `GET /auth/google` | não | 302 Google |
| `GET /auth/google/callback` | não | 302 app |
| `GET /auth/me` | sim | `200 { "userId": 12, "email": "a@b.com", "termsUpToDate": true }` (o frontend usa para saber se está logado) |
| `POST /auth/logout` | sim + CSRF | Destrói a sessão, expira os 2 cookies, `Clear-Site-Data: "cache", "cookies", "storage"` → 204 |
| `POST /auth/logout-all` | sim + CSRF | Destrói todas as sessões do usuário (índice) → 204 + mesmos cabeçalhos |

Função utilitária `destroyAllSessions(userId)`, reutilizada pela SPEC-10.

## 6. Rate limit (Redis, janela deslizante)
| Escopo | Limite | Chave |
|---|---|---|
| `/auth/google*` | 10/min | IP |
| API autenticada (geral) | 120/min | sessão |
| `POST /simulations` | 30/min | sessão |
| `GET /me/export` | 5/h | usuário |
| `DELETE /me` | 3/h | usuário |

Excedeu → 429 `RATE_LIMITED` + `Retry-After`.

## 7. Auditoria
Grava em `log_auditoria`: `LOGIN` (a cada login), `LOGOUT`, `LOGOUT_ALL`. Sem IP no log de auditoria; IP só no log de acesso do servidor (6 meses).

## 8. Critérios de aceite
- [ ] Login completo cria o usuário no 1º acesso e reaproveita no 2º (mesmo `sub`, e-mail atualizado)
- [ ] Banco e Redis **não** contêm access token, refresh token nem id_token do Google
- [ ] `state` adulterado → `/login?erro=invalido`; cancelar no Google → `/login?erro=cancelado`
- [ ] Cookie de sessão é HttpOnly, SameSite=Lax, sem Max-Age (Secure e `__Host-` em produção)
- [ ] 31 min sem requisição → 401 `SESSION_EXPIRED`; sessão com 8 h → 401 mesmo com uso contínuo (teste com relógio falso)
- [ ] Login gera ID novo; o ID antigo deixa de funcionar
- [ ] POST sem `X-SAFE-CSRF`, com valor errado ou com `Origin` de outro site → 403 `CSRF_FAILED`
- [ ] Logout: o cookie antigo reenviado → 401; resposta tem `Clear-Site-Data`
- [ ] Logout-all derruba sessões abertas em dois "navegadores" (dois cookies)
- [ ] 11º login no mesmo minuto e IP → 429
- [ ] Nenhum log contém cookie, csrf ou e-mail
