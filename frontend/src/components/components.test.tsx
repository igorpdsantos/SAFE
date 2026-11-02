import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { keys } from '../api/hooks';
import { Budget } from '../pages/Budget';
import { Dashboard } from '../pages/Dashboard';
import { Simulate } from '../pages/Simulate';
import { HelpProvider } from './HelpPanel';
import { IndicatorCard } from './IndicatorCard';
import { MoneyInput } from './MoneyInput';
import { RiskBadge } from './RiskBadge';
import { Term } from './Term';

describe('T-15.3 – <Term>', () => {
  it('abre com clique e com teclado, tem aria-expanded e fecha com Esc devolvendo o foco', async () => {
    const user = userEvent.setup();
    render(
      <HelpProvider>
        <p>
          Sua <Term id="liquidez">reserva de emergência</Term>
        </p>
      </HelpProvider>,
    );
    const btn = screen.getByRole('button', { name: /reserva de emergência/ });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    await user.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Por quantos meses seu dinheiro guardado',
    );
    await user.keyboard('{Escape}');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(btn).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  it('"Saiba mais" abre o painel com o texto longo e o exemplo', async () => {
    const user = userEvent.setup();
    render(
      <HelpProvider>
        <Term id="comprometimento-renda" />
      </HelpProvider>,
    );
    await user.click(screen.getByRole('button', { name: /Comprometimento da renda/ }));
    await user.click(screen.getByRole('button', { name: 'Saiba mais' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Somamos todas as parcelas');
    expect(dialog).toHaveTextContent('Exemplo:');
  });

  it('fecha com clique fora', () => {
    render(
      <HelpProvider>
        <div data-testid="fora">fora</div>
        <Term id="juros" />
      </HelpProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Juros/ }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('fora'));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});

describe('T-11.4 – componentes de risco e dinheiro', () => {
  it('RiskBadge tem ícone e rótulo, nunca só cor (RNF05)', () => {
    const { container } = render(<RiskBadge band={3} />);
    expect(screen.getByText('Risco de atenção')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('.risk-3')).not.toBeNull();
  });

  it('MoneyInput mostra a máscara pt-BR e entrega "1234.56"', async () => {
    const user = userEvent.setup();
    let last = '';
    function Harness() {
      const [v, setV] = useState('');
      return (
        <MoneyInput
          aria-label="valor"
          value={v}
          onChange={(x) => {
            last = x;
            setV(x);
          }}
        />
      );
    }
    render(<Harness />);
    const input = screen.getByLabelText('valor');
    await user.type(input, '123456');
    expect(input).toHaveValue('1.234,56');
    expect(last).toBe('1234.56');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveAttribute('inputmode', 'decimal');
  });
});

describe('HU09 – card do comprometimento da renda', () => {
  const cr = (value: string, level: 'OK' | 'ATENCAO' | 'ALTO', exceedsIncome = false) => ({
    value,
    display: `${value.replace('.', ',')}%`,
    risk: '0.5000',
    saturated: false,
    level,
    exceedsIncome,
  });
  const renderCard = (view: ReturnType<typeof cr>) =>
    render(
      <HelpProvider>
        <IndicatorCard indicatorKey="cr" view={view} />
      </HelpProvider>,
    );

  it.each([
    ['OK', 'risk-1', 'Confortável'],
    ['ATENCAO', 'risk-2', 'Atenção'],
    ['ALTO', 'risk-4', 'Alto'],
  ] as const)('critério 6 – nível %s tem cor, ícone e rótulo', (level, cls, label) => {
    const { container } = renderCard(cr('25.00', level));
    const pill = container.querySelector(`.risk.${cls}`);
    expect(pill).not.toBeNull();
    expect(pill).toHaveTextContent(label);
    expect(pill?.querySelector('svg')).not.toBeNull();
  });

  it('critério 7 – CR acima de 100% mostra o valor e um ícone de alerta', () => {
    const { container } = renderCard(cr('115.00', 'ALTO', true));
    expect(screen.getByText('115,00%')).toBeInTheDocument();
    const pill = container.querySelector('.risk.risk-5');
    expect(pill).toHaveTextContent('Acima da sua renda');
    expect(pill?.querySelector('svg')).not.toBeNull();
  });
});

describe('T-04.10 – despesa variável com faixa na tela Meu orçamento', () => {
  it('troca "Valor por mês" por "Menor valor do mês" e "Maior valor do mês" ao escolher Variável e mostra a faixa na lista', async () => {
    const user = userEvent.setup();
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    qc.setQueryData(keys.budget('incomes'), []);
    qc.setQueryData(keys.budget('expenses'), [
      {
        id: 1,
        description: 'Luz, Água e Internet',
        category: 'CONTAS_CASA',
        type: 'VARIAVEL',
        value: '600.00',
        valueMin: '400.00',
        valueMax: '600.00',
      },
    ]);
    qc.setQueryData(keys.budget('debts'), []);
    qc.setQueryData(keys.budget('reserves'), []);

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/orcamento?aba=expenses']}>
          <HelpProvider>
            <Budget />
          </HelpProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/R\$ 400,00 a R\$ 600,00 por mês/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Adicionar despesa' }));
    expect(screen.getByLabelText('Valor por mês')).toBeInTheDocument();
    expect(screen.queryByLabelText('Menor valor do mês')).toBeNull();

    await user.selectOptions(screen.getByRole('combobox', { name: /Tipo de despesa/ }), 'VARIAVEL');
    expect(screen.queryByLabelText('Valor por mês')).toBeNull();
    expect(screen.getByLabelText('Menor valor do mês')).toBeInTheDocument();
    expect(screen.getByLabelText('Maior valor do mês')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: /^Editar/ }));
    expect(screen.getByLabelText('Menor valor do mês')).toHaveValue('400,00');
    expect(screen.getByLabelText('Maior valor do mês')).toHaveValue('600,00');
  });

  it('mostra o card "Seus números" no Painel com despesas fixas, faixa de variáveis e os 3 cenários', async () => {
    const user = userEvent.setup();
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const ind = { value: '0.1000', display: '10,00%', risk: '0.2000', saturated: false };
    qc.setQueryData(keys.analysis, {
      calculatedAt: '2026-11-01T00:00:00Z',
      totals: {
        income: '5300.00',
        expenses: '3300.00',
        installments: '800.00',
        debtBalance: '4000.00',
        reserve: '6000.00',
      },
      monthlyNumbers: {
        fixedExpenses: '2500.00',
        variableExpensesMin: '400.00',
        variableExpensesMax: '800.00',
        freeAfterExpenses: {
          worst: '1200.00',
          average: '1400.00',
          best: '1600.00',
        },
      },
      indicators: {
        cr: { ...ind, level: 'OK', exceedsIncome: false },
        cp: { ...ind, display: 'R$ 1.200,00' },
        lf: { ...ind, display: '2,0 meses' },
        ne: { ...ind, display: '1,0 mês de renda' },
      },
      ire: {
        raw: '0.1925',
        value: '0.19',
        band: 1,
        label: 'Baixo risco',
        color: 'risk-1',
        icon: 'check-circle',
        recommendation: 'Equilibrado.',
      },
      factors: null,
      residualIncome: '4500.00',
      alerts: [],
    });

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/']}>
          <HelpProvider>
            <Dashboard />
          </HelpProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('R$ 5.300,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 2.500,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 400,00 a R$ 800,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 800,00')).toBeInTheDocument();
    expect(screen.getByText('Renda depois de despesas e parcelas')).toBeInTheDocument();

    // Padrão: Pior cenário (R$ 1.200,00)
    const total = document.querySelector('.numbers-total dd');
    expect(total).toHaveTextContent('R$ 1.200,00');

    await user.click(screen.getByRole('button', { name: 'Cenário médio' }));
    expect(total).toHaveTextContent('R$ 1.400,00');

    await user.click(screen.getByRole('button', { name: 'Melhor cenário' }));
    expect(total).toHaveTextContent('R$ 1.600,00');
  });
});

describe('T-08.10 – avaliação da simulação de 1 a 5 estrelas na aba Simular', () => {
  it('exibe o card de 1 a 5 estrelas antes do card "Já fez esta compra?" e envia a nota', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const path = String(url);
      if (path.endsWith('/simulations') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            id: 41,
            rating: null,
            financialCost: '0.00',
            current: {
              ire: {
                raw: '0.1925',
                value: '0.19',
                band: 1,
                label: 'Baixo risco',
                color: 'risk-1',
                icon: 'check-circle',
              },
            },
            projected: {
              ire: {
                raw: '0.3775',
                value: '0.38',
                band: 2,
                label: 'Risco moderado',
                color: 'risk-2',
                icon: 'info',
              },
            },
            deltaIre: '0.1850',
            outcome: 'AGRAVAMENTO',
            alertSeverity: 2,
            factors: [
              {
                key: 'cr',
                name: 'Comprometimento da renda',
                before: '10,00%',
                after: '25,00%',
                riskBefore: '0.2000',
                riskAfter: '0.5000',
                points: '0.1200',
                share: '0.6486',
                isMain: true,
                unchanged: false,
                saturatedBoth: false,
              },
            ],
            residualIncomeAfter: '3000.00',
            explanation: 'Esta compra elevaria o comprometimento da sua renda.',
            projection: {
              without: {
                horizon: 12,
                points: [
                  {
                    month: 1,
                    label: 'nov/2026',
                    free: '1600.00',
                    balance: '6000.00',
                    debtsActive: 1,
                  },
                ],
                firstNonPositiveFreeMonth: null,
                firstNegativeBalanceMonth: null,
              },
              with: {
                horizon: 12,
                points: [
                  {
                    month: 1,
                    label: 'nov/2026',
                    free: '1000.00',
                    balance: '12000.00',
                    debtsActive: 2,
                  },
                ],
                firstNonPositiveFreeMonth: null,
                firstNegativeBalanceMonth: null,
              },
            },
            assumptions: ['A compra não usa sua reserva'],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (path.endsWith('/simulations/41/rating') && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body));
        return new Response(JSON.stringify({ id: 41, rating: body.rating }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Unexpected fetch: ${path}`);
    });

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/simular']}>
          <HelpProvider>
            <Simulate />
          </HelpProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText('Valor da compra à vista'), '120000');
    await user.type(screen.getByLabelText('Número de parcelas'), '12');
    await user.type(screen.getByLabelText(/Valor de cada/, { selector: 'input' }), '10000');
    await user.click(screen.getByRole('button', { name: 'Simular compra' }));

    const rateHeading = await screen.findByRole('heading', {
      name: 'Esta simulação foi útil para a sua decisão?',
    });
    const registerHeading = screen.getByRole('heading', { name: 'Já fez esta compra?' });

    // Verifica que o card de avaliação vem antes do card "Já fez esta compra?"
    expect(
      rateHeading.compareDocumentPosition(registerHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const star5 = screen.getByRole('button', { name: /5 estrelas — Muito esclarecedora/ });
    await user.click(star5);

    expect(await screen.findByText(/Obrigado pela avaliação/)).toHaveTextContent(
      '5 estrelas (Muito esclarecedora)',
    );
    expect(star5).toHaveAttribute('aria-pressed', 'true');

    fetchSpy.mockRestore();
  });
});
