import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { HelpProvider } from './HelpPanel';
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
