import { forwardRef, type InputHTMLAttributes } from 'react';
import { apiToCents, centsToApi, centsToDisplay } from '../lib/format';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  /** Valor no formato da API ("1234.56") ou "" */
  value: string;
  onChange: (value: string) => void;
};

/** Campo de dinheiro com máscara pt-BR que entrega a string "1234.56" (SPEC-11 §5). */
export const MoneyInput = forwardRef<HTMLInputElement, Props>(function MoneyInput(
  { value, onChange, ...rest },
  ref,
) {
  return (
    <div className="money-input">
      <span className="prefix" aria-hidden="true">
        R$
      </span>
      <input
        {...rest}
        ref={ref}
        className="input"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={centsToDisplay(apiToCents(value))}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
          onChange(digits === '' ? '' : centsToApi(digits));
        }}
      />
    </div>
  );
});
