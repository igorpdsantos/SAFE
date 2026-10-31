// Glossário central do SAFE (SPEC-15 §3). Fonte única das explicações:
// nenhuma tela escreve definição solta; todas usam estas entradas.

export interface GlossaryEntry {
  id: string;
  term: string;
  acronym?: string;
  /** 1 frase, ≤ 140 caracteres — vai no tooltip */
  short: string;
  /** 2 a 4 frases — painel "Saiba mais" e página /glossario */
  long: string;
  /** exemplo com números redondos */
  example?: string;
  /** por que o SAFE olha para isso */
  whyItMatters?: string;
  related?: readonly string[];
}

const entries = [
  {
    id: 'ire',
    term: 'Índice de risco de endividamento',
    acronym: 'IRE',
    short:
      'Uma nota de 0 a 1 que resume o quanto seu orçamento está apertado. Quanto mais perto de 1, maior o risco.',
    long: 'Juntamos quatro sinais do seu orçamento: quanto da renda vai para parcelas, quanto sobra no mês, quanto tempo sua reserva aguenta e o tamanho total das dívidas. Cada sinal vira um risco de 0 a 1 e recebe um peso. A soma desses riscos com peso é o seu índice.',
    example:
      'Você ganha R$ 4.000, gasta R$ 2.000 com contas, paga R$ 400 em parcelas, deve R$ 6.000 no total e tem R$ 6.000 guardados. Seu índice é 0,19: risco baixo.',
    whyItMatters:
      'Uma nota só ajuda a comparar sua situação de hoje com a de depois de uma compra. O índice é um apoio para entender seu orçamento, não uma previsão de que você vai atrasar contas.',
    related: [
      'faixa-risco',
      'comprometimento-renda',
      'capacidade-pagamento',
      'liquidez',
      'nivel-endividamento',
    ],
  },
  {
    id: 'faixa-risco',
    term: 'Faixa de risco',
    short: 'Grupo em que sua nota se encaixa: baixo, moderado, atenção, alto ou crítico.',
    long: 'Dividimos a nota de 0 a 1 em cinco grupos. Até 0,20 é baixo; até 0,40, moderado; até 0,60, atenção; até 0,80, alto; acima disso, crítico. Cada faixa tem cor, ícone e nome, e vem com uma sugestão do que fazer.',
    example:
      'Uma nota 0,38 fica na faixa moderada. Se uma compra levar a nota para 0,45, você passa para a faixa de atenção.',
    whyItMatters:
      'A faixa traduz o número em algo fácil de entender. Mesmo na faixa baixa, a decisão continua sendo sua: a faixa não é uma garantia.',
    related: ['ire'],
  },
  {
    id: 'comprometimento-renda',
    term: 'Comprometimento da renda',
    acronym: 'CR',
    short: 'Quanto da sua renda do mês já vai para pagar parcelas de dívidas.',
    long: 'Somamos todas as parcelas que você paga por mês e dividimos pela sua renda líquida. Se você ganha R$ 4.000 e paga R$ 1.000 em parcelas, seu comprometimento é de 25%.',
    example:
      'Renda de R$ 3.000 e parcelas de R$ 1.500: metade da renda (50%) já está comprometida. A partir daí, esse fator conta como risco máximo.',
    whyItMatters:
      'Quando uma parte grande da renda já está comprometida, qualquer imprevisto pode fazer você atrasar contas. É o fator com mais peso no índice (40%).',
    related: ['ire', 'parcela', 'renda-liquida'],
  },
  {
    id: 'capacidade-pagamento',
    term: 'Folga mensal (capacidade de pagamento)',
    acronym: 'CP',
    short: 'Quanto sobra no mês depois de pagar suas despesas e parcelas.',
    long: 'Pegamos sua renda líquida e tiramos todas as despesas do mês e todas as parcelas. O que fica é a sua folga. Ela pode ser negativa, quando os gastos passam da renda.',
    example:
      'Renda de R$ 4.000, despesas de R$ 2.000 e parcelas de R$ 400: sobram R$ 1.600 por mês.',
    whyItMatters:
      'Sem folga, qualquer imprevisto vira dívida nova. Para o índice, sobrar 30% da renda ou mais é uma folga confortável; sobrar zero ou menos é o risco máximo. Pesa 30% no índice.',
    related: ['ire', 'despesa-fixa', 'despesa-variavel', 'parcela', 'minimo-existencial'],
  },
  {
    id: 'liquidez',
    term: 'Reserva de emergência (liquidez)',
    acronym: 'LF',
    short: 'Por quantos meses seu dinheiro guardado pagaria suas despesas se a renda parasse.',
    long: 'Dividimos o total que você tem guardado pelas suas despesas do mês. O resultado diz por quantos meses você conseguiria manter as contas em dia sem receber nada.',
    example: 'Com R$ 6.000 guardados e R$ 2.000 de despesas por mês, sua reserva dura 3 meses.',
    whyItMatters:
      'Uma reserva evita que você precise pegar empréstimo numa emergência. Para o índice, 6 meses de despesas ou mais é uma reserva completa. Pesa 20% no índice.',
    related: ['ire', 'reserva'],
  },
  {
    id: 'nivel-endividamento',
    term: 'Tamanho das dívidas (nível de endividamento)',
    acronym: 'NE',
    short: 'Quantos meses de renda você precisaria para pagar tudo o que deve.',
    long: 'Somamos quanto falta pagar em todas as suas dívidas e dividimos pela sua renda líquida do mês. O resultado mostra quantos meses de renda inteira seriam necessários para quitar tudo.',
    example:
      'Se você deve R$ 6.000 no total e ganha R$ 4.000 por mês, suas dívidas somam 1,5 mês da sua renda.',
    whyItMatters:
      'Mostra o tamanho do compromisso que você ainda carrega, mesmo quando as parcelas são pequenas. Para o índice, dívidas de 12 meses de renda ou mais são o risco máximo. Pesa 10% no índice.',
    related: ['ire', 'saldo-devedor', 'endividamento'],
  },
  {
    id: 'renda-liquida',
    term: 'Renda líquida',
    short:
      'O que você recebe por mês, já sem INSS e imposto de renda. Não tire o consignado: ele entra como dívida.',
    long: 'É o que você recebe no mês depois dos descontos obrigatórios, como INSS e imposto de renda. Se você tem consignado, some a parcela de volta e cadastre o consignado em Dívidas, para ele não contar duas vezes. Se você tem mais de uma fonte, como salário e um trabalho extra, cadastre cada uma.',
    example:
      'Salário de R$ 3.000, R$ 300 de INSS e imposto e R$ 200 de consignado: caem R$ 2.500 na conta. Sua renda líquida é R$ 2.700, e o consignado de R$ 200 vai em Dívidas.',
    whyItMatters:
      'Todos os cálculos do SAFE partem da renda líquida. Sem ela, não dá para calcular seu índice de risco.',
    related: ['comprometimento-renda'],
  },
  {
    id: 'despesa-fixa',
    term: 'Despesa fixa',
    short: 'Conta que se repete todo mês com valor parecido, como aluguel e internet.',
    long: 'São os gastos que você já sabe que vêm todo mês, quase sempre com o mesmo valor. Parcelas de dívidas não entram aqui: elas são cadastradas na parte de dívidas.',
    example: 'Aluguel de R$ 1.200, internet de R$ 100 e plano de celular de R$ 50.',
    whyItMatters:
      'Junto com as despesas variáveis, mostra quanto da sua renda já tem destino antes de qualquer compra nova.',
    related: ['despesa-variavel', 'capacidade-pagamento'],
  },
  {
    id: 'despesa-variavel',
    term: 'Despesa variável',
    short: 'Gasto que muda de mês para mês, como mercado e transporte.',
    long: 'São gastos que acontecem todo mês, mas com valor que sobe ou desce. Para cadastrar, use uma média dos últimos meses.',
    example:
      'Se você gastou R$ 500, R$ 700 e R$ 600 de mercado nos últimos três meses, cadastre R$ 600.',
    whyItMatters: 'Esquecer esses gastos faz parecer que sobra mais dinheiro do que de fato sobra.',
    related: ['despesa-fixa', 'capacidade-pagamento'],
  },
  {
    id: 'parcela',
    term: 'Parcela',
    short: 'Cada pagamento mensal de uma compra ou empréstimo dividido.',
    long: 'Quando você divide uma compra ou um empréstimo, paga um valor por mês durante um tempo combinado. Cada um desses pagamentos é uma parcela. No SAFE, você informa o valor da parcela e quantas ainda faltam.',
    example: 'Uma geladeira em 12 vezes de R$ 200: cada parcela é de R$ 200.',
    whyItMatters:
      'As parcelas saem da sua renda todo mês. Elas entram no comprometimento da renda e na folga mensal.',
    related: ['saldo-devedor', 'comprometimento-renda', 'custo-financeiro'],
  },
  {
    id: 'saldo-devedor',
    term: 'Saldo devedor',
    short: 'Quanto ainda falta pagar no total de uma dívida.',
    long: 'É a soma de tudo o que ainda falta pagar numa dívida, e diminui a cada parcela paga. Se você não souber o valor exato, o SAFE estima multiplicando a parcela pelo número de parcelas que faltam.',
    example: 'Faltam 10 parcelas de R$ 200: o saldo devedor é de R$ 2.000.',
    whyItMatters:
      'Duas dívidas com a mesma parcela podem ter tamanhos muito diferentes. O saldo mostra quanto dinheiro ainda está comprometido.',
    related: ['parcela', 'nivel-endividamento'],
  },
  {
    id: 'reserva',
    term: 'Reserva financeira',
    short: 'Dinheiro guardado que você pode usar numa emergência.',
    long: 'É o dinheiro que você tem guardado e consegue usar rápido se precisar, como o que está na poupança ou numa conta. Bens como carro ou casa não contam.',
    example: 'R$ 3.000 na poupança e R$ 1.000 numa conta digital: sua reserva é de R$ 4.000.',
    whyItMatters:
      'A reserva ajuda você a passar por um imprevisto sem fazer dívida nova. Ela entra no cálculo da reserva de emergência (liquidez).',
    related: ['liquidez'],
  },
  {
    id: 'juros',
    term: 'Juros',
    short: 'O valor extra cobrado por pagar depois ou pegar dinheiro emprestado.',
    long: 'Juros são o preço de usar um dinheiro que não é seu por um tempo. Quem empresta cobra juros de quem pega emprestado. Quem atrasa uma conta também costuma pagar juros e multa.',
    example:
      'Você pega R$ 1.000 emprestado e devolve R$ 1.100 um mês depois: pagou R$ 100 de juros.',
    whyItMatters:
      'O SAFE não calcula juros, mas eles já estão no valor das parcelas que você cadastra. Parcelas maiores pesam mais no seu índice de risco.',
    related: ['custo-financeiro', 'cet', 'selic'],
  },
  {
    id: 'custo-financeiro',
    term: 'Custo a mais do parcelamento',
    short:
      'Quanto você paga além do preço à vista ao parcelar (total das parcelas menos o valor da compra).',
    long: 'Somamos todas as parcelas e tiramos o preço da compra à vista. A diferença é o que você paga a mais por dividir. Se as parcelas somam exatamente o valor da compra, não há custo a mais.',
    example:
      'Uma TV de R$ 2.000 em 10 parcelas de R$ 240: você paga R$ 2.400, ou seja, R$ 400 a mais.',
    whyItMatters:
      'Mostra quanto custa parcelar antes de você decidir. O SAFE mostra esse valor em toda simulação.',
    related: ['parcela', 'juros', 'cet'],
  },
  {
    id: 'cet',
    term: 'Custo efetivo total',
    acronym: 'CET',
    short:
      'Tudo o que você paga num empréstimo (juros, tarifas, seguros), em %. O SAFE ainda não calcula.',
    long: 'O custo efetivo total junta juros, tarifas, seguros e outros encargos de um empréstimo ou financiamento. Ele aparece em porcentagem, ao mês ou ao ano. Quem oferece o crédito deve informar esse valor antes da contratação.',
    example:
      'Dois empréstimos com os mesmos juros podem custar valores diferentes se um deles cobrar tarifas e seguros. O custo efetivo total mostra essa diferença.',
    whyItMatters:
      'O SAFE ainda não calcula esse valor: ele usa as parcelas que você informa. Antes de contratar, peça o custo efetivo total a quem oferece o crédito.',
    related: ['juros', 'custo-financeiro'],
  },
  {
    id: 'minimo-existencial',
    term: 'Mínimo existencial',
    short:
      'Parte da renda que deve sobrar para viver (comida, moradia, luz). O SAFE usa R$ 600 como referência.',
    long: 'É o valor mínimo que deve sobrar da sua renda, depois de pagar as parcelas, para cobrir o básico da vida. A Lei do Superendividamento (Lei 14.181/2021) prevê esse cuidado para evitar que as dívidas tomem o necessário para viver. O SAFE usa R$ 600 como referência, mas esse valor não é uma conta exata para o seu caso.',
    example:
      'Renda de R$ 2.000 e parcelas de R$ 1.500: sobram R$ 500, menos que R$ 600. O SAFE mostra um alerta.',
    whyItMatters:
      'Se as parcelas deixam pouco para viver, pode faltar dinheiro para o básico. Por isso o SAFE avisa nesse caso, qualquer que seja o seu índice de risco.',
    related: ['superendividamento', 'capacidade-pagamento'],
  },
  {
    id: 'superendividamento',
    term: 'Superendividamento',
    short: 'Quando a pessoa não consegue pagar as dívidas sem deixar de pagar o básico para viver.',
    long: 'Acontece quando as dívidas ficam tão grandes que pagar tudo obrigaria a pessoa a cortar comida, moradia ou contas básicas. No Brasil, a Lei do Superendividamento (Lei 14.181/2021) prevê formas de renegociar as dívidas nesses casos.',
    example:
      'Uma pessoa ganha R$ 2.500 e paga R$ 2.200 em parcelas. Sobram R$ 300 para comer, morar e pagar a luz no mês todo.',
    whyItMatters:
      'O SAFE ajuda você a perceber o risco antes de chegar a essa situação, simulando uma compra antes de contratar.',
    related: ['minimo-existencial', 'endividamento', 'inadimplencia'],
  },
  {
    id: 'inadimplencia',
    term: 'Inadimplência',
    short: 'Quando uma conta ou parcela fica atrasada, sem pagamento.',
    long: 'Uma pessoa fica inadimplente quando deixa de pagar uma conta ou parcela na data combinada. O atraso costuma gerar juros e multa, e o nome pode ir para cadastros de devedores.',
    example:
      'A parcela de R$ 200 venceu no dia 10 e só foi paga no dia 25: nesses dias, ela ficou em atraso.',
    whyItMatters:
      'O SAFE não prevê se você vai atrasar contas. Ele mostra sinais de aperto no orçamento para você agir antes.',
    related: ['endividamento', 'superendividamento'],
  },
  {
    id: 'endividamento',
    term: 'Endividamento',
    short: 'Ter dívidas a pagar. Não é o mesmo que estar com contas atrasadas.',
    long: 'Estar endividado é ter compromissos a pagar no futuro, como parcelas de um financiamento ou de compras no cartão. Isso é comum e não é um problema por si só. O problema começa quando as dívidas pesam demais no orçamento.',
    example: 'Quem paga em dia uma moto em 24 parcelas está endividado, mas não está inadimplente.',
    whyItMatters:
      'O SAFE ajuda você a ver quando as dívidas começam a pesar demais, antes de virarem atraso.',
    related: ['inadimplencia', 'superendividamento', 'nivel-endividamento'],
  },
  {
    id: 'rotativo',
    term: 'Crédito rotativo do cartão',
    short: 'Quando você paga só parte da fatura e o resto vira dívida com juros muito altos.',
    long: 'Se você paga menos que o valor total da fatura do cartão, o que ficou faltando vira um empréstimo automático. Os juros do rotativo estão entre os mais altos do mercado. Pelas regras do Banco Central, esse saldo só pode ficar no rotativo até a fatura seguinte: depois, o banco precisa oferecer um parcelamento.',
    example:
      'Fatura de R$ 1.000 e pagamento de R$ 300: os R$ 700 que faltaram passam a ter juros do rotativo.',
    whyItMatters:
      'Se você está no rotativo, cadastre essa dívida como cartão de crédito no seu orçamento. Assim seu índice de risco mostra o peso real dela.',
    related: ['juros', 'cheque-especial'],
  },
  {
    id: 'cheque-especial',
    term: 'Cheque especial',
    short: 'Limite que o banco libera quando sua conta fica negativa, com juros altos.',
    long: 'É um limite de crédito ligado à conta corrente. Quando o saldo fica negativo, o banco cobre a diferença e cobra juros por cada dia de uso. Como os juros são altos, ele foi pensado só para emergências curtas.',
    example:
      'Você tinha R$ 100 e pagou uma conta de R$ 300: a conta fica R$ 200 negativa e esse valor passa a ter juros.',
    whyItMatters:
      'Usar o cheque especial todo mês é um sinal de que a renda não está cobrindo os gastos.',
    related: ['juros', 'rotativo'],
  },
  {
    id: 'consignado',
    term: 'Empréstimo consignado',
    short: 'Empréstimo com parcela descontada direto do salário ou benefício.',
    long: 'No consignado, a parcela é descontada do salário, da aposentadoria ou do benefício antes de o dinheiro chegar à sua conta. Por isso, os juros costumam ser menores que os de outros empréstimos. A lei limita quanto da renda pode ser descontado.',
    example:
      'Uma pessoa aposentada com benefício de R$ 2.000 e consignado de R$ 300 recebe R$ 1.700 na conta.',
    whyItMatters:
      'Como o desconto é automático, é fácil esquecer dessa parcela. No SAFE, cadastre o consignado em Dívidas e informe sua renda sem esse desconto, para a parcela contar uma vez só.',
    related: ['parcela', 'juros', 'renda-liquida'],
  },
  {
    id: 'crediario',
    term: 'Crediário',
    short: 'Compra parcelada direto com a loja.',
    long: 'No crediário, a própria loja financia a compra e você paga em parcelas, com carnê ou boleto. Pode haver juros, mesmo quando a propaganda destaca só o valor da parcela.',
    example:
      'Um sofá de R$ 1.500 em 10 vezes de R$ 180: você paga R$ 1.800, ou seja, R$ 300 a mais.',
    whyItMatters:
      'Antes de fechar um crediário, você pode simular a compra no SAFE e ver o efeito no seu risco.',
    related: ['parcela', 'custo-financeiro', 'simulacao'],
  },
  {
    id: 'selic',
    term: 'Taxa Selic',
    short:
      'A taxa básica de juros do Brasil, definida pelo Banco Central. Influencia os juros de empréstimos.',
    long: 'O Banco Central revê a taxa Selic mais ou menos a cada 45 dias. Quando ela sobe, empréstimos e financiamentos tendem a ficar mais caros. Quando ela cai, tendem a ficar mais baratos.',
    whyItMatters:
      'O SAFE não usa a taxa Selic no cálculo do seu risco. Ela ajuda a entender por que os juros das parcelas mudam com o tempo.',
    related: ['juros'],
  },
  {
    id: 'simulacao',
    term: 'Simulação',
    short:
      'Um teste de "e se eu comprar?": mostra o efeito no seu risco sem mudar nada nos seus dados.',
    long: 'Você informa o valor da compra, em quantas parcelas e o valor de cada parcela. O SAFE junta essa parcela nova ao seu orçamento só na conta e compara seu risco de hoje com o de depois da compra. Depois, explica o que mudou. Seu orçamento continua igual.',
    example:
      'Uma compra de R$ 6.000 em 12 parcelas de R$ 600 levaria um índice de 0,19 (risco baixo) para 0,38 (risco moderado).',
    whyItMatters:
      'Ver o efeito antes de assinar ajuda você a decidir com calma. A decisão continua sendo sua.',
    related: ['ire', 'fator-principal', 'projecao', 'custo-financeiro'],
  },
  {
    id: 'projecao',
    term: 'Projeção',
    short:
      'Uma estimativa de quanto vai sobrar nos próximos meses, com base no que você cadastrou.',
    long: 'Mostramos, mês a mês, quanto deve sobrar depois das despesas e das parcelas. Também mostramos quanto você teria guardado no total, somando essa sobra à sua reserva. Consideramos que renda e despesas ficam iguais e que cada parcela deixa de contar quando termina.',
    example:
      'Hoje sobram R$ 1.600 e uma parcela de R$ 400 termina daqui a 3 meses. A partir do quarto mês, a sobra passa a ser de R$ 2.000.',
    whyItMatters:
      'Ajuda você a ver meses apertados antes que eles cheguem. É uma estimativa: se sua renda ou seus gastos mudarem, o resultado muda.',
    related: ['simulacao', 'capacidade-pagamento', 'reserva'],
  },
  {
    id: 'fator-principal',
    term: 'Fator principal',
    short: 'O que mais pesa no seu risco ou na mudança causada por uma compra.',
    long: 'Seu índice de risco é a soma de quatro partes. Mostramos quanto cada parte contribui e destacamos as que, juntas, explicam pelo menos 75% do resultado. Na simulação, destacamos o que mais mudou com a compra.',
    example:
      'Numa simulação, o comprometimento da renda explicou 64,9% do aumento do risco e a folga mensal, 27,0%. Juntos, eles são os fatores principais.',
    whyItMatters: 'Saber o que mais pesa mostra por onde começar se você quiser reduzir seu risco.',
    related: ['ire', 'simulacao'],
  },
  {
    id: 'no-limite-escala',
    term: 'No limite da escala',
    short:
      'O indicador já está no pior (ou no melhor) valor que o índice consegue medir; piorar mais não muda a nota.',
    long: 'Cada parte do índice vai de 0 a 1. Quando um indicador passa de certo ponto, ele já conta como risco máximo (ou mínimo) e não muda mais. Por isso, piorar ainda mais aquele indicador não muda a nota, mas a situação real piora.',
    example:
      'Se metade da sua renda já vai para parcelas, esse fator está no risco máximo. Uma parcela nova aumenta o comprometimento da renda, mas a nota desse fator continua em 1.',
    whyItMatters:
      'Mostramos esse aviso para você não achar que uma compra não teve efeito só porque a nota não mudou.',
    related: ['ire', 'fator-principal'],
  },
  {
    id: 'lgpd',
    term: 'Lei Geral de Proteção de Dados',
    acronym: 'LGPD',
    short:
      'Lei Geral de Proteção de Dados: a lei que garante seus direitos sobre seus dados pessoais.',
    long: 'A Lei 13.709/2018 diz como empresas e serviços podem usar seus dados pessoais. Ela garante, por exemplo, o direito de saber quais dados temos, de receber uma cópia deles e de pedir a exclusão. No SAFE, você exporta e exclui seus dados em "Minha conta".',
    whyItMatters:
      'Seus dados financeiros são pessoais e importantes. A lei e as regras do SAFE limitam o que guardamos e para que usamos.',
    related: ['consentimento', 'anonimizado', 'cookie'],
  },
  {
    id: 'cookie',
    term: 'Cookie',
    short:
      'Pequeno arquivo que o site guarda no seu navegador. O SAFE usa só os necessários para o login funcionar.',
    long: 'Sites usam cookies para lembrar de você enquanto você navega. O SAFE usa só quatro, todos para o login e a segurança funcionarem. Não usamos cookies de propaganda nem de rastreamento.',
    whyItMatters:
      'Sem esses cookies, o site não consegue saber que é você quem entrou. Por isso eles são necessários para usar o SAFE.',
    related: ['oauth-google', 'lgpd'],
  },
  {
    id: 'oauth-google',
    term: 'Entrar com Google',
    short: 'Você entra usando sua conta Google. O SAFE recebe só seu e-mail, nunca sua senha.',
    long: 'Ao tocar em "Entrar com Google", você vai para a página do Google, confirma quem é e volta para o SAFE. O Google nos informa só o seu e-mail. Sua senha fica com o Google, e o SAFE nunca a vê.',
    whyItMatters:
      'Assim você não precisa criar outra senha, e o SAFE não guarda senhas que poderiam vazar.',
    related: ['cookie', 'lgpd'],
  },
  {
    id: 'consentimento',
    term: 'Consentimento',
    short: 'Sua autorização, que você pode dar ou retirar quando quiser.',
    long: 'Para coisas opcionais, como participar da pesquisa do nosso trabalho de conclusão de curso, pedimos sua autorização separada. Ela nunca vem marcada. Você pode retirar a autorização a qualquer momento em "Minha conta".',
    whyItMatters: 'Você pode usar o SAFE sem dar essa autorização. Você decide se quer participar.',
    related: ['lgpd', 'anonimizado'],
  },
  {
    id: 'anonimizado',
    term: 'Dados anonimizados',
    short: 'Dados dos quais tiramos tudo o que poderia identificar você.',
    long: 'Anonimizar é tirar dos dados tudo o que liga aquelas informações a você, como o e-mail. Depois disso, não dá para saber de quem eram os dados. Só usaríamos dados assim na pesquisa, e só se você autorizar.',
    example:
      'Em vez de "a pessoa com este e-mail ganha R$ 3.000", a pesquisa vê só "uma pessoa ganha R$ 3.000".',
    whyItMatters: 'Assim a pesquisa pode aprender com os números sem expor quem você é.',
    related: ['lgpd', 'consentimento'],
  },
] as const satisfies readonly GlossaryEntry[];

export type GlossaryId = (typeof entries)[number]['id'];

export const glossary: readonly GlossaryEntry[] = entries;

const byId = new Map<string, GlossaryEntry>(glossary.map((entry) => [entry.id, entry]));

export function getGlossaryEntry(id: GlossaryId): GlossaryEntry {
  const entry = byId.get(id);
  if (!entry) throw new Error(`Glossary entry not found: ${id}`);
  return entry;
}
