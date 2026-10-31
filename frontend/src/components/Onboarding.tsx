import type { ReactNode } from 'react';
import { useState } from 'react';
import { getPref, setPref } from '../lib/storage';
import { StepBudgetArt, StepDialArt, StepSimulateArt } from './Art';

const STEPS: { text: string; art: ReactNode }[] = [
  {
    text: 'Conte sua situação: renda, contas, dívidas e reserva.',
    art: <StepBudgetArt />,
  },
  { text: 'Veja seu risco e o que mais pesa nele.', art: <StepDialArt /> },
  { text: 'Antes de comprar parcelado, simule.', art: <StepSimulateArt /> },
];

/** "Como o SAFE funciona" no primeiro acesso, em 3 passos ilustrados (SPEC-15 §4.6). */
export function Onboarding({ forceOpen, onClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const [hidden, setHidden] = useState(() => getPref('safe_onboarding_done') === '1');
  if (hidden && !forceOpen) return null;
  return (
    <section className="card stack" aria-labelledby="onboarding-title">
      <h2 id="onboarding-title">Como o SAFE funciona</h2>
      <ol className="how">
        {STEPS.map((s, i) => (
          <li key={s.text}>
            <div className="art">{s.art}</div>
            <div className="stack-xs">
              <p className="eyebrow">Passo {i + 1}</p>
              <p>{s.text}</p>
            </div>
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
