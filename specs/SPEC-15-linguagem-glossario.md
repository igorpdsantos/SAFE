# SPEC-15 — Linguagem simples, glossário e ajuda contextual

| | |
|---|---|
| **Status** | Aprovada para implementação · **transversal** (vale para toda tela e todo texto do SAFE) |
| **Depende de** | SPEC-11 (base do frontend) |
| **Bloqueia** | Considerar pronta qualquer tela das SPEC-03, 04 e 06 a 10, e a 14 |
| **Rastreabilidade** | RNF05 (diagnósticos de fácil interpretação) · SEGURANCA_LGPD §2.3 (transparência e finalidade) e §7 · artigo Discussão ("usuários com pouco letramento financeiro") e Trabalhos futuros (acessibilidade a públicos com menor letramento) · pedido da equipe em 29/10/2026 |

## 1. Objetivo
Finanças têm muitos termos e siglas que a maioria das pessoas nunca aprendeu na escola. **O usuário do SAFE tem que entender sempre:**
1. **o que** está vendo;
2. **o que** está sendo pedido a ele;
3. **para que** aquilo serve;
4. **o que pode fazer** com o resultado.

Nenhuma tela pode depender de conhecimento financeiro prévio.

## 2. Regras de escrita (valem para todo texto de interface, alerta, e-mail e documento legal resumido)

| # | Regra | Errado | Certo |
|---|---|---|---|
| L1 | **Sigla nunca sozinha.** Na primeira vez em cada tela, escrever por extenso + sigla, e a sigla sempre com `<Term>` (§4) | "Seu IRE é 0,38" | "Seu **índice de risco** (IRE) é 0,38 de 1" |
| L2 | **Termo técnico vem com tradução** entre parênteses **ou** usa o nome simples com o técnico entre parênteses | "Liquidez: 3,0" | "Reserva de emergência (liquidez): dá para 3 meses de despesas" |
| L3 | **Número sempre com unidade e significado** | "NE = 1,5" | "Suas dívidas somam 1,5 mês da sua renda" |
| L4 | **Todo pedido de dado diz para que serve** ("Por que pedimos isso?") | Campo "Saldo devedor" | "Quanto falta pagar no total (saldo devedor)" + "Usamos para saber o tamanho total das suas dívidas" |
| L5 | **Todo resultado diz o que significa e o que fazer** | "Faixa 3" | "Risco de atenção: seu orçamento está perto do limite. Evite novas dívidas agora." |
| L6 | **Frases curtas** (até ~20 palavras), voz ativa, falando com "você" | "Procede-se ao cálculo do índice consolidado" | "Calculamos seu índice de risco" |
| L7 | **Sem jargão, juridiquês nem inglês** | "Score", "overdraft", "budget", "outcome" | "pontuação", "cheque especial", "orçamento", "resultado" |
| L8 | **Botões dizem a ação** | "OK", "Enviar" | "Simular compra", "Salvar dívida", "Excluir minha conta" |
| L9 | **Mensagens de erro dizem o que fazer** | "Valor inválido" | "Digite um valor maior que zero, por exemplo 150,00" |
| L10 | **Exemplos concretos** nos campos e explicações | "Informe o valor" | Placeholder "Ex.: 1.200,00" |
| L11 | **Tom acolhedor e sem julgamento.** Não culpar nem assustar | "Você está superendividado" | "Sua situação pede atenção. Veja o que mais pesa no seu risco." |
| L12 | **Nada de "garantia" ou "recomendação de compra"** (SEGURANCA_LGPD §7.3) | "Pode comprar!" | "Segundo os critérios do SAFE, seu orçamento comporta esta compra. A decisão é sua." |

Meta de leitura: linguagem acessível para quem tem ensino fundamental completo. Na dúvida, testar a frase lendo em voz alta para alguém de fora da área.

## 3. Glossário central (`frontend/src/content/glossary.ts`)
Fonte **única** das explicações. Nenhuma tela escreve definição solta; todas usam o glossário.

```ts
export interface GlossaryEntry {
  id: string;            // 'comprometimento-renda'
  term: string;          // 'Comprometimento da renda'
  acronym?: string;      // 'CR'
  short: string;         // 1 frase, ≤ 140 caracteres — vai no tooltip
  long: string;          // 2 a 4 frases — vai no painel "Saiba mais" e na página /glossario
  example?: string;      // exemplo com números redondos
  whyItMatters?: string; // por que o SAFE olha para isso
  related?: string[];    // ids relacionados
}
```

### Entradas mínimas (redação inicial; a equipe pode ajustar mantendo as regras do §2)

| id | Termo (sigla) | `short` (tooltip) |
|---|---|---|
| `ire` | Índice de risco de endividamento (IRE) | Uma nota de 0 a 1 que resume o quanto seu orçamento está apertado. Quanto mais perto de 1, maior o risco. |
| `faixa-risco` | Faixa de risco | Grupo em que sua nota se encaixa: baixo, moderado, atenção, alto ou crítico. |
| `comprometimento-renda` | Comprometimento da renda (CR) | Quanto da sua renda do mês já vai para pagar parcelas de dívidas. |
| `capacidade-pagamento` | Folga mensal (capacidade de pagamento, CP) | Quanto sobra no mês depois de pagar suas despesas e parcelas. |
| `liquidez` | Reserva de emergência (liquidez, LF) | Por quantos meses seu dinheiro guardado pagaria suas despesas se a renda parasse. |
| `nivel-endividamento` | Tamanho das dívidas (nível de endividamento, NE) | Quantos meses de renda você precisaria para pagar tudo o que deve. |
| `renda-liquida` | Renda líquida | O que você recebe por mês, já sem INSS e imposto de renda. Não tire o consignado: ele entra como dívida. |
| `despesa-fixa` | Despesa fixa | Conta que se repete todo mês com valor parecido, como aluguel e internet. |
| `despesa-variavel` | Despesa variável | Gasto que muda de mês para mês, como mercado e transporte. |
| `parcela` | Parcela | Cada pagamento mensal de uma compra ou empréstimo dividido. |
| `saldo-devedor` | Saldo devedor | Quanto ainda falta pagar no total de uma dívida. |
| `reserva` | Reserva financeira | Dinheiro guardado que você pode usar numa emergência. |
| `juros` | Juros | O valor extra cobrado por pagar depois ou pegar dinheiro emprestado. |
| `custo-financeiro` | Custo a mais do parcelamento | Quanto você paga além do preço à vista ao parcelar (total das parcelas menos o valor da compra). |
| `cet` | Custo efetivo total (CET) | Tudo o que você paga num empréstimo (juros, tarifas, seguros), em %. O SAFE ainda não calcula. |
| `minimo-existencial` | Mínimo existencial | Parte da renda que deve sobrar para viver (comida, moradia, luz). O SAFE usa R$ 600 como referência. |
| `superendividamento` | Superendividamento | Quando a pessoa não consegue pagar as dívidas sem deixar de pagar o básico para viver. |
| `inadimplencia` | Inadimplência | Quando uma conta ou parcela fica atrasada, sem pagamento. |
| `endividamento` | Endividamento | Ter dívidas a pagar. Não é o mesmo que estar com contas atrasadas. |
| `rotativo` | Crédito rotativo do cartão | Quando você paga só parte da fatura e o resto vira dívida com juros muito altos. |
| `cheque-especial` | Cheque especial | Limite que o banco libera quando sua conta fica negativa, com juros altos. |
| `consignado` | Empréstimo consignado | Empréstimo com parcela descontada direto do salário ou benefício. |
| `crediario` | Crediário | Compra parcelada direto com a loja. |
| `selic` | Taxa Selic | A taxa básica de juros do Brasil, definida pelo Banco Central. Influencia os juros de empréstimos. |
| `simulacao` | Simulação | Um teste de "e se eu comprar?": mostra o efeito no seu risco sem mudar nada nos seus dados. |
| `projecao` | Projeção | Uma estimativa de quanto vai sobrar nos próximos meses, com base no que você cadastrou. |
| `fator-principal` | Fator principal | O que mais pesa no seu risco ou na mudança causada por uma compra. |
| `no-limite-escala` | No limite da escala | O indicador já está no pior (ou no melhor) valor que o índice consegue medir; piorar mais não muda a nota. |
| `lgpd` | LGPD | Lei Geral de Proteção de Dados: a lei que garante seus direitos sobre seus dados pessoais. |
| `cookie` | Cookie | Pequeno arquivo que o site guarda no seu navegador. O SAFE usa só os necessários para o login funcionar. |
| `oauth-google` | Entrar com Google | Você entra usando sua conta Google. O SAFE recebe só seu e-mail, nunca sua senha. |
| `consentimento` | Consentimento | Sua autorização, que você pode dar ou retirar quando quiser. |
| `anonimizado` | Dados anonimizados | Dados dos quais tiramos tudo o que poderia identificar você. |

Os textos `long`, `example` e `whyItMatters` de cada entrada são escritos na tarefa T-15.2. Exemplo para `comprometimento-renda`:
- `long`: "Somamos todas as parcelas que você paga por mês e dividimos pela sua renda líquida. Se você ganha R$ 4.000 e paga R$ 1.000 em parcelas, seu comprometimento é de 25%."
- `whyItMatters`: "Quando uma parte grande da renda já está comprometida, qualquer imprevisto pode fazer você atrasar contas. É o fator com mais peso no índice (40%)."

## 4. Componentes de ajuda (SPEC-11 os hospeda)

### 4.1 `<Term id="liquidez">reserva de emergência</Term>`
- Texto com **sublinhado pontilhado** + ícone pequeno `?` (lucide `circle-help`), cor do texto principal.
- Abre um **popover** com `term (sigla)`, `short` e o link "Saiba mais" (abre o `<HelpPanel>`).
- **Funciona com clique, toque e teclado (Enter/Espaço)**, não só com hover, porque celular não tem hover. No desktop, também abre com hover após 300 ms.
- Acessibilidade: `button` com `aria-expanded`, `aria-describedby`; fecha com Esc e com clique fora; o foco volta ao termo.
- Em cada tela, o tooltip aparece na **primeira ocorrência** do termo; nas seguintes, só o texto (para não poluir).

### 4.2 `<FieldHelp>` — em todo campo de formulário
Embaixo do rótulo, sempre visível (não escondido em tooltip):
- **O que é:** frase curta (do glossário ou específica do campo).
- **Por que pedimos:** a finalidade (L4).
- **Exemplo:** no placeholder.

Exemplo no campo "Parcelas restantes":
> **Parcelas que ainda faltam pagar** · Usamos para saber até quando essa parcela pesa no seu orçamento. · *Ex.: 10*

### 4.3 `<HelpPanel>` — "Saiba mais"
Painel lateral (desktop) ou folha inferior (celular) com `long`, `example`, `whyItMatters` e os termos relacionados. Usado também pelos botões "O que isso significa?" dos cards do dashboard.

### 4.4 `<ResultExplainer>` — em todo resultado numérico importante
Cada número do dashboard, da simulação e da projeção vem com:
1. o valor;
2. a tradução em uma frase ("Sobram R$ 1.600 por mês depois das contas e parcelas");
3. a interpretação ("Folga confortável", "Folga apertada"...);
4. o `<Term>` do conceito.

### 4.5 Página `/glossario`
Lista em ordem alfabética com busca, todos os termos com `long` e `example`. Link no menu ("Glossário") e no rodapé.

### 4.6 Primeiro uso (onboarding leve)
No primeiro acesso ao Dashboard, um cartão "Como o SAFE funciona" em 3 passos ilustrados:
1. "Conte sua situação: renda, contas, dívidas e reserva."
2. "Veja seu risco e o que mais pesa nele."
3. "Antes de comprar parcelado, simule."

Botão "Entendi" grava `localStorage.safe_onboarding_done = "1"` (preferência de interface, sem dado pessoal; incluída na lista permitida da SEGURANCA_LGPD §5.2). O cartão pode ser reaberto pelo menu "Como funciona".

## 5. Aplicação por tela (checklist de revisão)
| Tela | Obrigatório |
|---|---|
| Login | `<Term id="oauth-google">`; frase "Recebemos só seu e-mail…" |
| Termos | Resumo em linguagem simples **acima** de cada documento ("Em resumo: …" em 3 a 5 tópicos); `<Term>` em LGPD, cookie, consentimento e anonimizado; o checkbox da pesquisa explica para que serve |
| Orçamento | `<FieldHelp>` em **todos** os campos; `<Term>` em renda líquida, despesa fixa/variável, parcela e saldo devedor; estado vazio explica para que o dado serve no cálculo |
| Dashboard | IRE e cada indicador com `<Term>` + `<ResultExplainer>`; faixa com o que significa e o que fazer (L5) |
| Simulação | Explicar cada campo (valor da compra, parcelas, valor da parcela) e o custo a mais; o resultado em frase (SPEC-08 §2.6) com `<Term>` nos fatores |
| Projeção | Explicar "sobra do mês" e "saldo acumulado" e as premissas |
| Evolução | Explicar o que é a linha e as faixas do fundo |
| Conta | Explicar exportação, exclusão e consentimento com consequências claras |
| Alertas | Sempre com o "o que fazer" |

## 6. Critérios de aceite
- [ ] `glossary.ts` com todas as entradas do §3, cada uma com `short`, `long` e pelo menos `example` ou `whyItMatters`
- [ ] Teste unitário: todo `<Term id>` usado no código existe no glossário (varredura dos arquivos `.tsx`)
- [ ] Teste unitário: nenhum `short` passa de 140 caracteres
- [ ] Lint/teste de texto: as palavras `score`, `overdraft`, `budget`, `outcome`, `IRE`, `CR`, `CP`, `LF`, `NE`, `CET`, `Selic`, `LGPD` não aparecem soltas em textos de interface (só dentro de `<Term>` ou junto do nome por extenso)
- [ ] `<Term>` abre com toque no celular, com teclado e com clique; fecha com Esc; tem `aria-expanded`
- [ ] Todo campo de formulário tem `<FieldHelp>` com "o que é" e "por que pedimos"
- [ ] Página `/glossario` com busca
- [ ] Revisão de texto com o checklist do §5 feita por alguém que não escreveu a tela
- [ ] No estudo com usuários (artigo Seção 7.6), incluir a pergunta aberta "Algum termo ficou confuso?" e registrar as respostas para ajustar o glossário
