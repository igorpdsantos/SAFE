import { Shield } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, userMessage } from '../api/client';
import { CookieNotice } from '../components/CookieNotice';
import { Term } from '../components/Term';

const ERRORS: Record<string, string> = {
  cancelado: 'O acesso não foi concluído. Tente de novo quando quiser.',
  indisponivel: 'O serviço de login está indisponível agora. Tente de novo em alguns minutos.',
  invalido: 'Não foi possível validar o login. Tente de novo.',
  email: 'Sua conta Google precisa ter o e-mail verificado.',
};
const REASONS: Record<string, string> = {
  expired: 'Sua sessão terminou por inatividade. Entre de novo para continuar.',
  logout: 'Você saiu do SAFE.',
};

/** Tela de login (SPEC-11 §6). */
export function Login() {
  const [params] = useSearchParams();
  const error = ERRORS[params.get('erro') ?? ''];
  const reason = REASONS[params.get('motivo') ?? ''];
  const [devError, setDevError] = useState<string | null>(null);

  const devLogin = async () => {
    try {
      await api('/test/login', { method: 'POST', body: { email: 'pessoa.teste@exemplo.com' } });
      window.location.replace('/');
    } catch (err) {
      setDevError(
        `${userMessage(err)} O login de teste só existe com a API em modo de teste: rode "npm run dev:demo".`,
      );
    }
  };

  return (
    <div className="center-page">
      <div className="card stack">
        <div className="row" style={{ color: 'var(--brand)' }}>
          <Shield size={32} aria-hidden="true" />
          <h1 style={{ margin: 0 }}>SAFE</h1>
        </div>
        <p>
          Veja o que uma compra parcelada ou um empréstimo faz com o seu orçamento antes de assinar.
        </p>
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
        {reason && !error && (
          <p className="notice" role="status">
            {reason}
          </p>
        )}
        {navigator.cookieEnabled === false && (
          <p className="notice" role="alert">
            Ative os cookies para este site. Usamos só cookies essenciais de login.
          </p>
        )}
        <a className="btn btn-primary" href="/api/v1/auth/google">
          Entrar com Google
        </a>
        {import.meta.env.DEV && (
          <>
            <button type="button" className="btn" onClick={devLogin}>
              Entrar como pessoa de teste (só em desenvolvimento)
            </button>
            {devError && <p className="field-error">{devError}</p>}
          </>
        )}
        <p className="small">
          <Term id="oauth-google">Entramos com sua conta Google</Term>. Recebemos só seu e-mail; não
          temos acesso à sua senha nem ao seu Gmail.
        </p>
        <p className="small muted">Em computador compartilhado, sempre clique em Sair.</p>
        <p className="small">
          <Link to="/privacidade">Política de Privacidade</Link> ·{' '}
          <Link to="/termos-de-uso">Termos de Uso</Link> · <Link to="/glossario">Glossário</Link>
        </p>
      </div>
      <CookieNotice />
    </div>
  );
}
