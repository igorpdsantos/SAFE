// Rótulos pt-BR das categorias (o código usa os enums da SPEC-04 §2.1).
export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  MORADIA: 'Moradia',
  ALIMENTACAO: 'Alimentação',
  TRANSPORTE: 'Transporte',
  SAUDE: 'Saúde',
  EDUCACAO: 'Educação',
  CONTAS_CASA: 'Contas da casa',
  LAZER: 'Lazer',
  OUTROS: 'Outros',
};

export const DEBT_CATEGORY_LABELS: Record<string, string> = {
  CARTAO_CREDITO: 'Cartão de crédito',
  EMPRESTIMO_PESSOAL: 'Empréstimo pessoal',
  CONSIGNADO: 'Consignado',
  FINANC_VEICULO: 'Financiamento de veículo',
  FINANC_IMOVEL: 'Financiamento imobiliário',
  CREDIARIO: 'Crediário ou compra parcelada',
  CHEQUE_ESPECIAL: 'Cheque especial',
  OUTROS: 'Outros',
};

export const EXPENSE_TYPE_LABELS: Record<string, string> = { FIXA: 'Fixa', VARIAVEL: 'Variável' };
