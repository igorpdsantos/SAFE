import { useState } from 'react';
import { getPref, setPref } from '../lib/storage';

const STEPS = [
  'Conte sua situação: renda, contas, dívidas e reserva.',
  'Veja seu risco e o que mais pesa nele.',
  'Antes de comprar parcelado, simule.',
];

/** "Como o SAFE funciona" no primeiro acesso (SPEC-15 §4.6). Pode ser reaberto pelo menu. */
export function Onboarding({ forceOpen, onClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const [hidden, setHidden] = useState(() => getPref('safe_onboarding_done') === '1');
  if (hidden && !forceOpen) return null;
  return (
    <section className="card stack" aria-labelledby="onboarding-title">
      <h2 id="onboarding-title">Como o SAFE funciona</h2>
      <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
        {STEPS.map((s) => (
          <li key={s} style={{ marginBottom: '0.35rem' }}>
            {s}
          </li>
        ))}
      </ol>
      <div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setPref('safe_onboarding_done', '1');
            setHidden(true);
            onClose?.();
          }}
        >
          Entendi
        </button>
      </div>
    </section>
  );
}
