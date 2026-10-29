// Glossário central do SAFE (SPEC-15 §3). Fonte única das explicações:
// nenhuma tela escreve definição solta; todas usam estas entradas.

export interface GlossaryEntry {
  id: string;
  term: string;
  acronym?: string;
  /** 1 frase, ≤ 140 caracteres — vai no tooltip */
  short: string;
  /** 2 a 4 frases — painel "Saiba mais" e página /glossario (T-15.2) */
  long: string;
  /** exemplo com números redondos (T-15.2) */
  example?: string;
  /** por que o SAFE olha para isso (T-15.2) */
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
    long: '',
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
    long: '',
    related: ['ire'],
  },
  {
    id: 'comprometimento-renda',
    term: 'Comprometimento da renda',
    acronym: 'CR',
    short: 'Quanto da sua renda do mês já vai para pagar parcelas de dívidas.',
    long: '',
    related: ['ire', 'parcela', 'renda-liquida'],
  },
  {
    id: 'capacidade-pagamento',
    term: 'Folga mensal (capacidade de pagamento)',
    acronym: 'CP',
    short: 'Quanto sobra no mês depois de pagar suas despesas e parcelas.',
    long: '',
    related: ['ire', 'despesa-fixa', 'despesa-variavel', 'parcela', 'minimo-existencial'],
  },
  {
    id: 'liquidez',
    term: 'Reserva de emergência (liquidez)',
    acronym: 'LF',
    short:
      'Por quantos meses seu dinheiro guardado pagaria suas despesas se a renda parasse.',
    long: '',
    related: ['ire', 'reserva'],
  },
  {
    id: 'nivel-endividamento',
    term: 'Tamanho das dívidas (nível de endividamento)',
    acronym: 'NE',
    short: 'Quantos meses de renda você precisaria para pagar tudo o que deve.',
    long: '',
    related: ['ire', 'saldo-devedor', 'endividamento'],
  },
  {
    id: 'renda-liquida',
    term: 'Renda líquida',
    short: 'O que cai na sua conta, já sem descontos como INSS e imposto de renda.',
    long: '',
    related: ['comprometimento-renda'],
  },
  {
    id: 'despesa-fixa',
    term: 'Despesa fixa',
    short: 'Conta que se repete todo mês com valor parecido, como aluguel e internet.',
    long: '',
    related: ['despesa-variavel', 'capacidade-pagamento'],
  },
  {
    id: 'despesa-variavel',
    term: 'Despesa variável',
    short: 'Gasto que muda de mês para mês, como mercado e transporte.',
    long: '',
    related: ['despesa-fixa', 'capacidade-pagamento'],
  },
  {
    id: 'parcela',
    term: 'Parcela',
    short: 'Cada pagamento mensal de uma compra ou empréstimo dividido.',
    long: '',
    related: ['saldo-devedor', 'comprometimento-renda', 'custo-financeiro'],
  },
  {
    id: 'saldo-devedor',
    term: 'Saldo devedor',
    short: 'Quanto ainda falta pagar no total de uma dívida.',
    long: '',
    related: ['parcela', 'nivel-endividamento'],
  },
  {
    id: 'reserva',
    term: 'Reserva financeira',
    short: 'Dinheiro guardado que você pode usar numa emergência.',
    long: '',
    related: ['liquidez'],
  },
  {
    id: 'juros',
    term: 'Juros',
    short: 'O valor extra cobrado por pagar depois ou pegar dinheiro emprestado.',
    long: '',
    related: ['custo-financeiro', 'cet', 'selic'],
  },
  {
    id: 'custo-financeiro',
    term: 'Custo a mais do parcelamento',
    short:
      'Quanto você paga além do preço à vista ao parcelar (total das parcelas menos o valor da compra).',
    long: '',
    related: ['parcela', 'juros', 'cet'],
  },
  {
    id: 'cet',
    term: 'Custo efetivo total',
    acronym: 'CET',
    short:
      'Tudo o que você paga num empréstimo (juros, tarifas, seguros), em %. O SAFE ainda não calcula.',
    long: '',
    related: ['juros', 'custo-financeiro'],
  },
  {
    id: 'minimo-existencial',
    term: 'Mínimo existencial',
    short:
      'Parte da renda que deve sobrar para viver (comida, moradia, luz). O SAFE usa R$ 600 como referência.',
    long: '',
    related: ['superendividamento', 'capacidade-pagamento'],
  },
  {
    id: 'superendividamento',
    term: 'Superendividamento',
    short:
      'Quando a pessoa não consegue pagar as dívidas sem deixar de pagar o básico para viver.',
    long: '',
    related: ['minimo-existencial', 'endividamento', 'inadimplencia'],
  },
  {
    id: 'inadimplencia',
    term: 'Inadimplência',
    short: 'Quando uma conta ou parcela fica atrasada, sem pagamento.',
    long: '',
    related: ['endividamento', 'superendividamento'],
  },
  {
    id: 'endividamento',
    term: 'Endividamento',
    short: 'Ter dívidas a pagar. Não é o mesmo que estar com contas atrasadas.',
    long: '',
    related: ['inadimplencia', 'superendividamento', 'nivel-endividamento'],
  },
  {
    id: 'rotativo',
    term: 'Crédito rotativo do cartão',
    short:
      'Quando você paga só parte da fatura e o resto vira dívida com juros muito altos.',
    long: '',
    related: ['juros', 'cheque-especial'],
  },
  {
    id: 'cheque-especial',
    term: 'Cheque especial',
    short: 'Limite que o banco libera quando sua conta fica negativa, com juros altos.',
    long: '',
    related: ['juros', 'rotativo'],
  },
  {
    id: 'consignado',
    term: 'Empréstimo consignado',
    short: 'Empréstimo com parcela descontada direto do salário ou benefício.',
    long: '',
    related: ['parcela', 'juros'],
  },
  {
    id: 'crediario',
    term: 'Crediário',
    short: 'Compra parcelada direto com a loja.',
    long: '',
    related: ['parcela', 'custo-financeiro'],
  },
  {
    id: 'selic',
    term: 'Taxa Selic',
    short:
      'A taxa básica de juros do Brasil, definida pelo Banco Central. Influencia os juros de empréstimos.',
    long: '',
    related: ['juros'],
  },
  {
    id: 'simulacao',
    term: 'Simulação',
    short:
      'Um teste de "e se eu comprar?": mostra o efeito no seu risco sem mudar nada nos seus dados.',
    long: '',
    related: ['ire', 'fator-principal', 'projecao'],
  },
  {
    id: 'projecao',
    term: 'Projeção',
    short:
      'Uma estimativa de quanto vai sobrar nos próximos meses, com base no que você cadastrou.',
    long: '',
    related: ['simulacao', 'capacidade-pagamento'],
  },
  {
    id: 'fator-principal',
    term: 'Fator principal',
    short: 'O que mais pesa no seu risco ou na mudança causada por uma compra.',
    long: '',
    related: ['ire', 'simulacao'],
  },
  {
    id: 'no-limite-escala',
    term: 'No limite da escala',
    short:
      'O indicador já está no pior (ou no melhor) valor que o índice consegue medir; piorar mais não muda a nota.',
    long: '',
    related: ['ire'],
  },
  {
    id: 'lgpd',
    term: 'Lei Geral de Proteção de Dados',
    acronym: 'LGPD',
    short:
      'Lei Geral de Proteção de Dados: a lei que garante seus direitos sobre seus dados pessoais.',
    long: '',
    related: ['consentimento', 'anonimizado'],
  },
  {
    id: 'cookie',
    term: 'Cookie',
    short:
      'Pequeno arquivo que o site guarda no seu navegador. O SAFE usa só os necessários para o login funcionar.',
    long: '',
    related: ['oauth-google', 'lgpd'],
  },
  {
    id: 'oauth-google',
    term: 'Entrar com Google',
    short: 'Você entra usando sua conta Google. O SAFE recebe só seu e-mail, nunca sua senha.',
    long: '',
    related: ['cookie'],
  },
  {
    id: 'consentimento',
    term: 'Consentimento',
    short: 'Sua autorização, que você pode dar ou retirar quando quiser.',
    long: '',
    related: ['lgpd', 'anonimizado'],
  },
  {
    id: 'anonimizado',
    term: 'Dados anonimizados',
    short: 'Dados dos quais tiramos tudo o que poderia identificar você.',
    long: '',
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
