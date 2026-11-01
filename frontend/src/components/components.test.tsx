import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { keys } from '../api/hooks';
import { Budget } from '../pages/Budget';
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
});
