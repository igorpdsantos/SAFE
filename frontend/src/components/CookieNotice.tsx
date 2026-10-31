import { Cookie } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getPref, setPref } from '../lib/storage';
import { Term } from './Term';

/** Faixa informativa de cookies (SEGURANCA_LGPD §5.1). O botão é "Entendi", não "Aceitar". */
export function CookieNotice() {
  const [visible, setVisible] = useState(() => getPref('safe_cookie_notice') !== '1');
  if (!visible) return null;
  return (
    <div className="cookie-notice card row" role="region" aria-label="Aviso de cookies">
      <Cookie size={22} aria-hidden="true" style={{ color: 'var(--gold)', flexShrink: 0 }} />
      <p style={{ margin: 0, flex: 1, minWidth: 200 }} className="small">
        Usamos apenas <Term id="cookie">cookies</Term> essenciais para login e segurança. Não usamos
        cookies de publicidade ou rastreamento. <Link to="/privacidade">Saiba mais</Link>
      </p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          setPref('safe_cookie_notice', '1');
          setVisible(false);
        }}
      >
        Entendi
      </button>
    </div>
  );
}
