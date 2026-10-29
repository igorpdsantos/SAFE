# SPEC-11 — Frontend: base, navegação e componentes compartilhados

| | |
|---|---|
| **Status** | Aprovada para implementação |
| **Depende de** | SPEC-01, SPEC-02, SPEC-03 |
| **Bloqueia** | Telas das SPEC-04 e 06 a 10 |
| **Rastreabilidade** | RNF05, RNF06, RNF10, RNF13 · SEGURANCA_LGPD §5, §7 · HU09 (cores) |

## 1. Objetivo
Montar a SPA (React + Vite + TypeScript) com roteamento, cliente HTTP seguro, estado de sessão **só em memória**, tema visual, componentes de risco acessíveis e as regras de navegador da SEGURANCA_LGPD. As telas de cada funcionalidade estão nas próprias specs.

## 2. Rotas
| Rota | Página | Acesso |
|---|---|---|
| `/login` | Login com Google + avisos (§6) | pública |
| `/termos` | Aceite (SPEC-03) | logado |
| `/` | Dashboard (SPEC-07) | logado + termos |
| `/orcamento` | Renda · Despesas · Dívidas · Reserva (SPEC-04) | logado + termos |
| `/projecao` | Projeção (SPEC-06) | logado + termos |
| `/simular` | Simulação (SPEC-08) | logado + termos |
| `/evolucao` | Histórico (SPEC-09) | logado + termos |
| `/conta` | Minha conta (SPEC-10) | logado |
| `/privacidade`, `/termos-de-uso` | Textos legais (markdown renderizado) | pública |
| `/glossario` | Glossário com busca (SPEC-15) | pública |
| `/conta-excluida` | Confirmação pós-exclusão | pública |

Guarda de rota: `GET /auth/me` ao abrir o app. 401 → `/login`. `termsUpToDate = false` → `/termos`.

## 3. Cliente HTTP (`src/api/client.ts`)
- `fetch` com `credentials: 'same-origin'` e `Content-Type: application/json`.
- Em POST, PUT, PATCH e DELETE, envia `X-SAFE-CSRF` lido do cookie `__Host-safe_csrf` (`safe_csrf` em desenvolvimento).
- Respostas:
  - 401 → `handleSessionEnd('expired')`;
  - 403 `TERMS_REQUIRED` → `/termos`;
  - 409 `INSUFFICIENT_DATA` → a página mostra o estado "cadastre sua renda";
  - 400 → erros por campo no formulário;
  - 429 → "Muitas tentativas, aguarde um pouco";
  - 500 → "Algo deu errado (código {requestId})".
- TanStack Query **sem persistência**: `gcTime` de 5 min e nunca `persistQueryClient`.

## 4. Regras de navegador (SEGURANCA_LGPD §5) — obrigatórias
- **Proibido** gravar em `localStorage`, `sessionStorage` ou IndexedDB, exceto `theme`, `safe_cookie_notice` e `safe_onboarding_done`. Criar `src/lib/storage.ts` como **única** porta de acesso, com essa lista fechada; lint proíbe `localStorage` direto.
- `handleSessionEnd(reason)`: `queryClient.clear()`, zera o estado global, `sessionStorage.clear()`, posta `logout` no `BroadcastChannel('safe-auth')` e chama `location.replace('/login?motivo=' + reason)`.
- Todas as abas ouvem `safe-auth` e executam a mesma limpeza.
- Sem service worker, PWA, Google Fonts ou CDN: fontes e ícones (`lucide-react`) vão no bundle.
- Campos de valor com `autocomplete="off"` e `inputMode="decimal"`.
- `<noscript>` explicando que o app precisa de JavaScript. Se `navigator.cookieEnabled === false`, aviso na tela de login.
- Sem `dangerouslySetInnerHTML`. Os textos legais em markdown usam `react-markdown` sem HTML bruto.

## 5. Design e componentes
- **Tokens CSS** (`:root`): `--risk-1` verde, `--risk-2` amarelo, `--risk-3` laranja, `--risk-4` vermelho-claro, `--risk-5` vermelho-intenso, com contraste AA para texto. Tema claro e escuro.
- **`<RiskBadge band>`:** cor + ícone + rótulo (RNF05). **Nunca** só a cor.
- **`<IreGauge value band>`:** barra de 0 a 1 com marcas nas fronteiras 0,20/0,40/0,60/0,80 e o valor em texto.
- **`<IndicatorCard>`:** nome, valor `display`, barra de risco, selo "no limite da escala".
- **`<FactorList factors>`:** barras horizontais de participação, com "principal" em texto.
- **`<MoneyInput>`:** máscara pt-BR que entrega a string `"1234.56"`.
- **`<ConfirmDialog>`:** confirmação acessível (foco preso, Esc fecha).
- **`<AlertBanner severity>`:** ícone + texto + "Marcar como lido".
- **`<CookieNotice>`:** faixa informativa da SEGURANCA_LGPD §5.1.
- **`<Disclaimer>`:** rodapé "O índice é um apoio…".
- **Ajuda contextual (SPEC-15):** `<Term>`, `<FieldHelp>`, `<HelpPanel>`, `<ResultExplainer>`, a página `/glossario` e o cartão "Como o SAFE funciona". Todo texto de interface segue as regras L1–L12 da SPEC-15.
- **Layout:** menu lateral no desktop e inferior no celular (RNF10). Itens: Início, Orçamento, Simular, Projeção, Evolução, Conta, Sair.
- **Acessibilidade:** navegação por teclado, foco visível, `aria-live` para resultados da simulação e alertas, gráficos sempre acompanhados de tabela.
- **Formatação:** `formatMoney("1600.00")` → "R$ 1.600,00"; `formatPercent("0.25")` → "25,0%"; datas em `dd/mm/aaaa`.

## 6. Tela de login
Botão "Entrar com Google" (link para `/api/v1/auth/google`, navegação completa, não `fetch`).

Avisos:
- "Recebemos só seu e-mail; não temos acesso à sua senha nem ao seu Gmail."
- "Em computador compartilhado, sempre clique em Sair."

Mensagens por `?erro=` (SPEC-02) e `?motivo=expired` ("Sua sessão expirou por inatividade"). Links para a Política e os Termos.

## 7. Critérios de aceite
- [ ] Depois de usar todas as telas, o DevTools mostra no `localStorage` só `theme`/`safe_cookie_notice`/`safe_onboarding_done` e nada em `sessionStorage` ou IndexedDB
- [ ] Logout numa aba leva as outras abas para `/login` sem dados na tela
- [ ] Depois do logout, o botão "voltar" não mostra dados (resposta `no-store` + `replace`)
- [ ] Toda faixa de risco exibida tem ícone e rótulo; revisão com simulador de daltonismo
- [ ] Layout utilizável em 375 px (celular), 768 px e desktop; Chrome, Firefox, Safari e Edge
- [ ] Nenhuma requisição de rede a domínio externo além do redirecionamento de login do Google (aba Network)
- [ ] Lighthouse Acessibilidade ≥ 90 no Dashboard e na Simulação
