# Segurança e LGPD — SAFE

> **Status:** projeto aprovado para implementação, 29/10/2026. Este documento vem **antes do código**: toda funcionalidade que coleta, guarda, mostra ou apaga dado de usuário segue o que está aqui. Se algo não estiver previsto, a regra é **não coletar e não guardar** até decidirmos.
>
> Complementa o `PRD.md` (requisitos RF01–RF03, RF24, RNF02, RNF03, RNF09, RNF11) e o `CLAUDE.md`. Em caso de conflito sobre segurança ou privacidade, vale este documento.
>
> Referências: Lei 13.709/2018 (LGPD); Resolução CD/ANPD nº 2/2022 (agentes de pequeno porte); Resolução CD/ANPD nº 15/2024 (comunicação de incidentes); Guia Orientativo da ANPD sobre cookies (2022); Lei 12.965/2014 (Marco Civil da Internet); OWASP ASVS e OWASP Top 10. **Não é parecer jurídico.** Antes de abrir para usuários reais, validar com o orientador e com a instituição.

---

## 1. Resumo das decisões (o que muda em relação à especificação)

| # | Decisão | Por quê |
|---|---|---|
| S-01 | **Sessão opaca no servidor (Redis)**, com cookie `HttpOnly`. **Sem JWT no navegador e nada em `localStorage`.** Substitui o "JWT Bearer" da especificação | JWT no navegador fica exposto a XSS e não pode ser revogado no logout; a sessão no servidor pode ser apagada na hora |
| S-02 | **Só cookies estritamente necessários.** Sem analytics, pixel, fontes, CDNs ou scripts de terceiros | Com isso não há cookie que exija consentimento; o aviso de cookies é informativo, sem botão "aceitar/rejeitar" |
| S-03 | **Base legal principal: execução de contrato** (art. 7º, V), pelos Termos de Uso aceitos pelo titular. **Consentimento separado** (art. 7º, I) só para usos opcionais (participar da pesquisa do TCC) | Consentimento embutido nos termos é genérico e pode ser nulo (art. 8º, §4º). O serviço não funciona sem os dados, então "contrato" é a base adequada |
| S-04 | **Minimização:** sem nome, CPF, telefone, endereço, data de nascimento, banco ou número de conta. Do Google, só `sub` e `email` | Princípio da necessidade (art. 6º, III); quanto menos dado, menor o dano num vazamento |
| S-05 | **Categorias em vez de texto livre** nas despesas e dívidas; a descrição livre é opcional, curta e vem com aviso | Texto livre pode receber dado sensível ("remédio para…", saúde) ou de terceiros (art. 5º, II; art. 11) |
| S-06 | **Exclusão real (hard delete) em cascata**, incluindo cache, sessões e revogação do token Google. Em backup, o dado some no ciclo de 30 dias | RF24 e art. 18, VI; o titular é avisado do prazo do backup |
| S-07 | **Somente maiores de 18 anos** (autodeclaração no primeiro acesso) | Evita o regime de dados de crianças e adolescentes (art. 14), que exige consentimento dos pais |
| S-08 | **Pesquisa do TCC só com dados fictícios** (como o artigo já prevê). Dados reais de participantes só com TCLE e anonimização | Separa o produto da pesquisa; Resolução CNS 510/2016 |
| S-09 | **Fonte da verdade do aceite é o banco**, não o cookie. O cookie do RF03 é só um atalho que evita consultar o banco | O controlador precisa provar o aceite (art. 8º, §2º); cookie pode ser apagado ou forjado |

---

## 2. Enquadramento na LGPD

### 2.1 A LGPD se aplica?
- O SAFE trata **dados pessoais** (e-mail, identificador Google) ligados a **dados financeiros** de uma pessoa identificável. Logo, tudo isso é dado pessoal (art. 5º, I).
- Dado financeiro **não** é "dado sensível" na lista do art. 5º, II. Mesmo assim, o projeto o trata com o **mesmo rigor de um sensível**: o vazamento expõe o titular a fraude e constrangimento, como o próprio artigo reconhece.
- Para **fins exclusivamente acadêmicos**, o art. 4º, II, "b" afasta parte da lei, mas mantém os arts. 7º e 11. **Decisão:** projetar como se a LGPD se aplicasse integralmente. O artigo afirma conformidade com a LGPD, e o sistema pode ser usado por terceiros.

### 2.2 Papéis
| Papel | Quem |
|---|---|
| **Controlador** | Equipe do projeto SAFE (os 8 autores), enquanto o sistema for operado no âmbito do TCC |
| **Operadores** | Provedor de hospedagem (servidor, banco, backups) e Google (autenticação) |
| **Encarregado (DPO)** | Dispensável para agente de pequeno porte (Res. CD/ANPD 2/2022), **mas é obrigatório um canal de contato**: e-mail do projeto publicado na Política de Privacidade. Indicar um responsável da equipe para responder |
| **Titular** | Usuário maior de 18 anos |

### 2.3 Princípios (art. 6º) → como o SAFE cumpre

| Princípio | Implementação |
|---|---|
| Finalidade | Uso dos dados **só** para calcular indicadores, IRE, projeção, simulação e histórico do próprio usuário. Nada de marketing, venda, compartilhamento ou treino de modelo |
| Adequação / Necessidade | Coletar só o que entra nas fórmulas do PRD (Seção 5). Inventário na Seção 3 |
| Livre acesso | Tela "Meus dados" + exportação JSON (`GET /me/export`) |
| Qualidade | Edição de todos os dados (RF21) |
| Transparência | Política de Privacidade, Termos, avisos contextuais (Seção 7) |
| Segurança / Prevenção | Seções 4 a 6 |
| Não discriminação | O IRE não é usado para conceder ou negar nada; o sistema não bloqueia decisões |
| Responsabilização | Registro das operações (Seção 3), log de auditoria, este documento e o RIPD simplificado (Seção 10) |

---

## 3. Inventário de dados (registro das operações — art. 37)

| Dado | Onde fica | Finalidade | Base legal | Obrigatório? | Retenção |
|---|---|---|---|---|---|
| `oauth_subject` (ID Google) | `usuario` | Identificar a conta no login | Contrato | Sim | Enquanto a conta existir |
| E-mail | `usuario` | Identificação e canal de contato da conta | Contrato | Sim | Enquanto a conta existir |
| Declaração de maioridade | `aceitacao_termos` | Cumprir o art. 14 | Obrigação legal / contrato | Sim | Enquanto a conta existir |
| Aceite de termos e política (versões, data/hora) | `aceitacao_termos` | Provar o aceite | Contrato / exercício regular de direitos (art. 7º, VI) | Sim | Conta + 6 meses após exclusão, **desvinculado do e-mail** (Seção 8.2) |
| Renda, despesas, dívidas, reserva (valores, categorias, parcelas) | tabelas do orçamento | Calcular IRE, projeção e simulação | Contrato | Sim, para o cálculo | Enquanto a conta existir |
| Descrição livre (opcional) | `despesa`, `divida`, `renda` | Ajudar o usuário a reconhecer o item | Contrato | **Não** | Enquanto a conta existir |
| Indicadores, IRE, histórico, alertas | `indicador_financeiro`, `historico_indicadores`, `alerta` | Diagnóstico e evolução | Contrato | Gerado | Enquanto a conta existir |
| Simulações (V, n, p, risco) | `simulacao_financeira` | Histórico de simulações do usuário | Contrato | Gerado | Últimos 12 meses; o resto é apagado automaticamente |
| Log de auditoria | `log_auditoria` | Segurança e prova (RNF03) | Legítimo interesse (art. 7º, IX) / exercício de direitos | Gerado | 6 meses |
| Registro de acesso (data/hora, IP) | logs do servidor | Segurança; Marco Civil art. 15 | Obrigação legal / legítimo interesse | Gerado | 6 meses, depois apagado |
| Sessão | Redis | Manter o login | Contrato | Gerado | Até logout ou expiração (30 min ociosa / 8 h absoluta) |
| Consentimento de pesquisa | `consentimento_pesquisa` | Participar do estudo do TCC | **Consentimento** | **Não** | Até revogação ou fim da pesquisa |

### Proibido coletar (não criar campo, não pedir no formulário)
Nome completo, CPF, RG, telefone, endereço, data de nascimento, gênero, foto (a do Google **não** é usada), nome de banco, agência, número de conta ou de cartão, senha, geolocalização, contatos, dados de terceiros.

**Escopo do OAuth:** pedir somente `openid email`. **Não** pedir `profile`.

---

## 4. Autenticação e sessão

### 4.1 Login com Google (UC01)
- Fluxo **OpenID Connect Authorization Code com PKCE**, com `state` e `nonce` aleatórios (≥ 128 bits) guardados num cookie temporário (10 min) e conferidos no callback.
- Validar o **ID token** no servidor: assinatura (JWKS do Google), `iss`, `aud` = nosso client ID, `exp` e `nonce`. Aceitar só `email_verified = true`.
- Identificar o usuário por `sub`, **não** por e-mail (o e-mail pode mudar).
- O SAFE **não guarda** access token nem refresh token do Google. Eles são usados só no callback e descartados.
- Redirect URIs cadastradas no Google: lista fixa e exata (`https://<domínio>/api/v1/auth/google/callback` e a de `localhost` em desenvolvimento).

### 4.2 Sessão (S-01)
| Item | Regra |
|---|---|
| Identificador | Aleatório de 256 bits (`crypto.randomBytes(32)`), guardado no Redis como `sess:<hash do id>` → `{userId, createdAt, lastSeenAt, termsVersionOk}` |
| Cookie | `__Host-safe_sid`; `HttpOnly; Secure; SameSite=Lax; Path=/`; **sem `Domain`** e **sem `Max-Age`** (cookie de sessão: some ao fechar o navegador) |
| Expiração | **30 min sem uso** (deslizante) e **8 h absolutas**. Expirou → 401 e volta ao login |
| Fixação de sessão | Gerar um **novo** ID a cada login; nunca reaproveitar ID anterior |
| Logout | Apaga a chave no Redis, expira o cookie e limpa o estado do frontend (Seção 5.3) |
| Sair de todos os dispositivos | Botão em "Minha conta": apaga todas as sessões do `userId` (índice `user_sessions:<userId>`) |
| "Lembrar de mim" | **Não existe** |
| Exclusão de conta | Apaga todas as sessões do usuário |

### 4.3 CSRF
- `SameSite=Lax` já bloqueia `POST/PUT/PATCH/DELETE` vindos de outros sites.
- Defesa extra: toda requisição que altera estado precisa (a) do cabeçalho `X-SAFE-CSRF` igual ao cookie `__Host-safe_csrf` (*double submit*, valor aleatório por sessão) e (b) de `Origin` igual ao domínio do SAFE. Senão, responde 403.
- Nenhuma ação que altera estado aceita `GET`.

### 4.4 Autorização (evitar IDOR)
- O `userId` vem **sempre da sessão**, nunca do corpo, da URL ou de query string.
- Todo método de repositório recebe `userId` como primeiro parâmetro, e toda consulta filtra por ele (`WHERE user_id = $1 AND id = $2`). Registro de outro usuário → **404** (não 403, para não revelar que existe).
- Teste automatizado obrigatório: o usuário A tenta ler, editar e apagar a dívida do usuário B e recebe 404.
- Middleware de **termos aceitos**: rotas financeiras devolvem 403 `TERMS_REQUIRED` se a versão aceita não for a vigente.

### 4.5 Limites
- Rate limit (Redis): login 10/min por IP; API 120/min por sessão; simulação 30/min por sessão; exportação 5/hora; exclusão de conta 3/hora.
- Tamanho máximo do corpo JSON: 10 KB. Validação `zod` com limites numéricos (ex.: valores entre 0 e 10.000.000,00; até 100 itens por tipo).

---

## 5. Navegador: cookies, `localStorage`, cache e outros modos

### 5.1 Cookies usados (lista fechada)

| Nome | Finalidade | Atributos | Duração | Tipo |
|---|---|---|---|---|
| `__Host-safe_sid` | Sessão autenticada | HttpOnly, Secure, SameSite=Lax | Sessão do navegador (servidor: 30 min / 8 h) | Estritamente necessário |
| `__Host-safe_csrf` | Proteção CSRF (*double submit*) | Secure, SameSite=Lax (sem HttpOnly, o JS precisa ler) | Igual à sessão | Estritamente necessário |
| `__Host-safe_oauth` | `state`, `nonce` e `code_verifier` do login, assinados | HttpOnly, Secure, SameSite=Lax | 10 min, apagado no callback | Estritamente necessário |
| `safe_terms` | Versão dos termos aceita (RF03), atalho de UI; **não** é prova | Secure, SameSite=Lax, HttpOnly | 1 ano | Estritamente necessário |

**Nenhum outro cookie pode ser criado.** Como todos são estritamente necessários, o Guia da ANPD dispensa o consentimento. Ainda assim, o SAFE:
- mostra uma **faixa informativa** no primeiro acesso: "Usamos apenas cookies essenciais para login e segurança. Não usamos cookies de publicidade ou rastreamento. [Saiba mais]". O botão é "Entendi", não "Aceitar";
- publica a tabela acima na Política de Privacidade (seção "Cookies").

> Se no futuro alguém quiser analytics, isso **obriga** a criar um banner com consentimento real (opção de recusar tão fácil quanto aceitar, nada pré-marcado) e a atualizar este documento.

### 5.2 `localStorage`, `sessionStorage` e IndexedDB

| Pode guardar | **Não pode guardar** |
|---|---|
| Preferência de tema (claro/escuro) | Qualquer valor financeiro, indicador, IRE ou simulação |
| Que a faixa de cookies já foi fechada (`safe_cookie_notice=1`) | Token, ID de sessão, e-mail, `sub` |
| Que o cartão "Como o SAFE funciona" já foi visto (`safe_onboarding_done=1`) | |
| | Rascunho de formulário (renda, dívida, simulação) |
| | Cache persistente de requisições (React Query **não** usa `persistQueryClient`) |

Os dados financeiros ficam **só na memória** do app React e somem ao recarregar ou sair. Para isso:
- Service worker: **não usar** (sem PWA offline nesta versão).
- `autocomplete="off"` nos campos de valor; os campos não usam `name` genérico que o navegador sugira guardar.

### 5.3 Cache do navegador, botão "voltar" e logout
- Toda resposta da API com dado de usuário: `Cache-Control: no-store`, `Pragma: no-cache`. Isso impede cache em disco e reduz o risco de o botão "voltar" mostrar dados depois do logout.
- **No logout:** `queryClient.clear()`, limpar estado global, apagar `sessionStorage` e redirecionar com `location.replace('/login')` (substitui o histórico).
- **Sessão expirada (401):** limpar o estado da mesma forma e mostrar "Sua sessão expirou por inatividade".
- A resposta de logout envia `Clear-Site-Data: "cache", "cookies", "storage"`.

### 5.4 Outros modos e situações

| Situação | Comportamento |
|---|---|
| **Aba anônima / navegação privada** | Funciona igual. Nada fica no aparelho ao fechar a janela, porque nada é persistido no cliente |
| **Várias abas** | Compartilham a mesma sessão. Logout numa aba avisa as outras via `BroadcastChannel('safe-auth')`, e elas limpam o estado e vão para o login |
| **Computador compartilhado** | Aviso na tela de login: "Em computador compartilhado, sempre clique em Sair". Expiração por inatividade de 30 min, sem "lembrar de mim" |
| **Celular** | Layout responsivo (RNF10); mesmas regras. Sem app nativo |
| **Cookies bloqueados no navegador** | Login impossível; mostrar "Ative cookies para este site: usamos só cookies essenciais de login" |
| **JavaScript bloqueado** | Mostrar `<noscript>` explicando que o app precisa de JavaScript |
| **Extensões do navegador** | Fora do nosso controle; a CSP (Seção 6.2) reduz o risco de injeção na página |
| **Impressão / captura de tela** | Permitidas; o dado é do próprio usuário |

---

## 6. Proteção dos dados

### 6.1 Em trânsito
- HTTPS obrigatório (TLS 1.2+, preferindo 1.3; RNF02). HTTP → redireciona 301 para HTTPS.
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
- Conexão da API com Postgres e Redis dentro da rede privada do Docker; em banco gerenciado, exigir TLS (`sslmode=require`).

### 6.2 Cabeçalhos de segurança (via `helmet`)
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;
                         connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
```
- Sem scripts inline e sem `dangerouslySetInnerHTML`. Fontes e bibliotecas **empacotadas no build**, sem Google Fonts nem CDN (evita enviar o IP do usuário a terceiros).
- Frontend e API no **mesmo domínio** (`/` e `/api`), então não precisa de CORS. Se for preciso, liberar só a origem exata, com `credentials`.

### 6.3 Em repouso
| Camada | Medida |
|---|---|
| Disco do banco e dos backups | Criptografia AES-256 do provedor (volume ou banco gerenciado). Backups criptografados e de acesso restrito |
| Campos de texto livre (`description`) | Criptografia na aplicação com AES-256-GCM (chave em variável de ambiente `DATA_ENC_KEY`, IV aleatório por registro). São os campos mais propensos a conter dado pessoal |
| Valores numéricos | Em claro no banco (o motor precisa deles), protegidos pela criptografia de disco e pelo acesso restrito. Tabelas financeiras **só** têm `user_id`, nunca e-mail (pseudonimização) |
| Redis | Sem persistência em disco para sessões (`save ""`) ou com volume criptografado; cache com TTL ≤ 10 min |
| Segredos | `.env` fora do Git; em produção, segredos do provedor ou GitHub Secrets. Rotacionar se vazar |

### 6.4 Logs
- Logs da aplicação **não** podem conter: valores financeiros, e-mail, corpo de requisições, cookies, tokens ou IDs de sessão. Usar o logger com *redaction* (`pino` com `redact`).
- Pode conter: `userId`, rota, status, duração e `requestId`.
- `log_auditoria` registra **que** algo mudou (operação, entidade, id, campos alterados, data/hora), **sem** os valores antigos ou novos.
- Erros 500 mostram mensagem genérica com o `requestId`; o stack trace fica só no servidor.

### 6.5 Dependências e código
- `npm audit` e Dependabot no CI; nada de pacote abandonado para auth ou cripto.
- ORM (Prisma) com consultas parametrizadas; SQL cru só com parâmetros.
- Validação `zod` em toda entrada; o frontend também valida, mas quem decide é o servidor.

---

## 7. Transparência: documentos e avisos

### 7.1 Documentos públicos (links no rodapé e no primeiro acesso)
1. **Política de Privacidade**, com: quem somos e contato; dados coletados (inventário da Seção 3, em linguagem simples); finalidades; bases legais; que **não** compartilhamos nem vendemos; operadores (hospedagem e Google) e transferência internacional (o login passa pelos servidores do Google, art. 33); retenção; direitos do titular (art. 18) e como exercê-los; cookies (tabela 5.1); segurança; menores de 18; incidentes; data e versão.
2. **Termos de Uso**, com: o que o SAFE é e **não é** (não é aconselhamento financeiro, não recomenda produtos nem investimentos, o IRE não é diagnóstico nem garantia, os pesos não foram calibrados com dados de inadimplência); responsabilidade do usuário pela veracidade dos dados; uso só por maiores de 18; versão.

Os dois têm **versão** (`terms_version`, `privacy_version`). Mudou a versão → o UC02 FA02 pede novo aceite no próximo login.

### 7.2 Primeiro acesso (UC02) — tela única, clara e sem pré-marcação
- [ ] Li e aceito os **Termos de Uso** (obrigatório)
- [ ] Li a **Política de Privacidade** (obrigatório; é ciência, não consentimento)
- [ ] Declaro ter **18 anos ou mais** (obrigatório)
- [ ] *(opcional)* Aceito participar da **pesquisa do TCC** com meus dados anonimizados (consentimento separado; pode revogar em "Minha conta")

O botão "Continuar" só habilita com os três obrigatórios. Recusar → "Sem aceitar os termos não é possível usar o SAFE", com opção de sair. Grava em `aceitacao_termos`: `user_id`, `terms_version`, `privacy_version`, `age_confirmed`, `accepted_at` e `token_id` (UUID do cookie `safe_terms`).

### 7.3 Avisos contextuais (textos curtos, na tela)
| Onde | Aviso |
|---|---|
| Login | "Entramos com sua conta Google. Recebemos só seu e-mail; não temos acesso à sua senha nem ao seu Gmail." |
| Formulários de despesa, dívida e renda | "Não escreva nomes de pessoas, dados de saúde, número de conta ou de cartão na descrição." |
| Dashboard e resultado do IRE | "O índice é um apoio para entender sua situação, não um diagnóstico nem uma garantia." |
| Simulação | "Simulação: nada é salvo no seu orçamento. Considera que a compra não usa sua reserva e não muda suas despesas." |
| Faixa verde | "Segundo os critérios do modelo, seu orçamento atual comporta esta decisão. Isso não é uma recomendação para contratar." |
| Login (rodapé) | "Em computador compartilhado, sempre clique em Sair." |
| Exclusão de conta | Ver Seção 8.2 |

---

## 8. Direitos do titular (art. 18) — tela "Minha conta → Meus dados"

| Direito | Como o SAFE atende | Prazo |
|---|---|---|
| Confirmação e acesso (I, II) | Tela com todos os dados; exportação | Imediato |
| Correção (III) | Edição em cada cadastro (RF21) | Imediato |
| Anonimização, bloqueio ou eliminação de excessivos (IV) | Não coletamos excessivos; pedido pelo canal de contato | 15 dias |
| Portabilidade (V) | `GET /me/export` → arquivo JSON legível (RNF11) | Imediato |
| Eliminação (VI) | `DELETE /me` (RF24) | Imediato; backups em até 30 dias |
| Informação sobre compartilhamento (VII) | Política: só operadores (hospedagem e Google) | — |
| Revogação do consentimento (IX) | Desmarcar "pesquisa do TCC" em "Minha conta" | Imediato |
| Petição à ANPD | Informado na Política | — |

### 8.1 Exportação
JSON com: conta (e-mail, data de criação), aceites, renda, despesas, dívidas, reservas, indicadores atuais, histórico e simulações. Gerado na hora e enviado como download (`Content-Disposition: attachment`), **sem** ficar salvo no servidor. Registrar em `log_auditoria` (operação `EXPORT`).

### 8.2 Exclusão definitiva (RF24)
Fluxo: "Excluir minha conta" → tela explicando o que será apagado e que **não tem volta** → digitar `EXCLUIR` → confirmar.

O servidor, numa transação:
1. Apaga o usuário. O `ON DELETE CASCADE` remove renda, despesas, dívidas, reservas, indicadores, histórico, simulações, alertas e consentimento de pesquisa.
2. Em `aceitacao_termos` e `log_auditoria`: troca `user_id` por `NULL` e grava só um registro mínimo de que houve exclusão, sem e-mail (prova do atendimento ao pedido; art. 16 e art. 7º, VI). Esse registro é apagado em 6 meses.
3. Apaga sessões e cache do usuário no Redis.
4. Revoga a autorização no Google (se houver) e responde com `Clear-Site-Data`.
5. Grava o ID numa lista `exclusoes_pendentes_backup` (só o `user_id` numérico e a data), aplicada se algum backup dos últimos 30 dias for restaurado.

Mensagem final: "Sua conta e seus dados foram excluídos. Cópias de segurança são apagadas automaticamente em até 30 dias."

### 8.3 Contas inativas
Conta sem login por **12 meses** → excluída automaticamente pelo mesmo fluxo (job diário). Informado na Política.

---

## 9. Incidentes de segurança

1. Quem detectar avisa o responsável da equipe pelo canal combinado.
2. Conter: revogar sessões (`FLUSH` das chaves `sess:*`), trocar segredos e, se preciso, tirar o sistema do ar.
3. Avaliar se o incidente pode causar **risco ou dano relevante** aos titulares.
4. Se sim: comunicar a **ANPD** e os **titulares** em até **3 dias úteis** (Res. CD/ANPD 15/2024), informando o que vazou, quem foi afetado, as medidas tomadas e o contato.
5. Registrar o incidente (data, causa, dados, medidas) e mantê-lo por 5 anos, mesmo que não seja comunicado.

---

## 10. RIPD simplificado (art. 38) — principais riscos

| Risco | Prob. | Impacto | Medidas |
|---|---|---|---|
| Vazamento do banco | Baixa | Alto | Criptografia em repouso, pseudonimização (sem e-mail nas tabelas financeiras), descrição criptografada, acesso restrito, backups criptografados |
| Sequestro de sessão (XSS ou roubo de cookie) | Média | Alto | Cookie HttpOnly, CSP estrita, sem scripts de terceiros, expiração de 30 min |
| Usuário A vê dados do usuário B (IDOR) | Média | Alto | `userId` só da sessão, filtro em todo repositório, teste automatizado |
| Dados visíveis em computador compartilhado | Média | Médio | Nada persistido no cliente, `no-store`, logout limpa tudo, aviso |
| Dado sensível em texto livre | Média | Médio | Categorias, descrição opcional com aviso, criptografia do campo |
| Dado em log | Média | Médio | Logger com *redaction*, auditoria sem valores |
| Interpretação do IRE como garantia | Média | Médio | Avisos contextuais, Termos de Uso |
| Uso por menor de idade | Baixa | Médio | Autodeclaração 18+ |

---

## 11. Mudanças no modelo de dados (somam-se ao PRD 11.2)

```
usuario               + last_login_at timestamptz            -- conta inativa (8.3)
aceitacao_termos      + privacy_version varchar(10) NOT NULL
                      + age_confirmed boolean NOT NULL
                      ~ user_id passa a aceitar NULL (ON DELETE SET NULL) para o registro mínimo pós-exclusão (8.2)
                      ~ token_id uuid UNIQUE NOT NULL
despesa / divida      + category varchar(30) NOT NULL         -- lista fixa no código (S-05)
renda                 ~ description passa a ser bytea (criptografada) e opcional, máx. 60 caracteres antes da cifra
despesa / divida      ~ description idem
log_auditoria         ~ user_id ON DELETE SET NULL; detalhes jsonb só com nomes de campos, nunca valores
consentimento_pesquisa(consent_id PK, user_id FK ON DELETE CASCADE, granted_at timestamptz, revoked_at timestamptz NULL,
                       text_version varchar(10))                -- [novo]
exclusoes_pendentes_backup(user_id int, deleted_at timestamptz) -- [novo] sem e-mail; apagar após 30 dias
```

Categorias sugeridas — **despesa:** Moradia, Alimentação, Transporte, Saúde, Educação, Contas da casa, Lazer, Outros. **Dívida:** Cartão de crédito, Empréstimo pessoal, Consignado, Financiamento de veículo, Financiamento imobiliário, Crediário/compra parcelada, Cheque especial, Outros.

---

## 12. Checklist antes de programar e antes de publicar

**Antes do código**
- [ ] Equipe validou as decisões S-01 a S-09
- [ ] Definido o responsável pelo canal de privacidade e criado o e-mail do projeto
- [ ] Projeto criado no Google Cloud com consentimento OAuth de escopo `openid email` e redirect URIs exatas
- [ ] `.env.example` com `SESSION_SECRET`, `DATA_ENC_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DATABASE_URL` e `REDIS_URL` (valores fictícios)

**Antes de abrir para qualquer pessoa usar**
- [ ] Política de Privacidade e Termos de Uso publicados, com versão
- [ ] Testes passando: IDOR, CSRF, expiração de sessão, logout limpando o estado, exclusão em cascata, exportação
- [ ] Cabeçalhos conferidos (securityheaders.com ou `curl -I`)
- [ ] Nenhum cookie além dos 4 da tabela 5.1 (conferir no DevTools)
- [ ] `localStorage` só com `theme`, `safe_cookie_notice` e `safe_onboarding_done` (conferir no DevTools após usar tudo)
- [ ] Logs revisados sem valores, e-mails ou tokens
- [ ] Hospedagem com criptografia em repouso e backups criptografados, de preferência em região no Brasil
- [ ] Estudo com usuários usando **dados fictícios**; se houver dado real, TCLE e procedimento ético aprovados pelo orientador ou CEP
