import { Calculator, EyeOff, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, userMessage } from '../api/client';
import { AuthArt, LogoMark } from '../components/Art';
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

/** "G" do Google no botão de entrar (marca do provedor de login). */
function GoogleG() {
  return (
    <span className="g" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path
          fill="#EA4335"
          d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"
        />
        <path
          fill="#FBBC05"
          d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"
        />
      </svg>
    </span>
  );
}

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
    <div className="auth">
      <section className="auth-art" aria-label="Sobre o SAFE">
        <div className="brand">
          <LogoMark size={34} />
          <span>
            <span className="brand-name">SAFE</span>
            <span className="brand-tag">Apoio à decisão financeira</span>
          </span>
        </div>
        <div>
          <h1>
            Antes de parcelar, <em>veja o efeito</em> no seu orçamento.
          </h1>
          <p className="lead">
            Veja o que uma compra parcelada ou um empréstimo faz com o seu orçamento antes de
            assinar.
          </p>
        </div>
        <AuthArt className="auth-illustration" />
        <ul className="promises">
          <li>
            <Calculator size={20} aria-hidden="true" /> Simule antes de assinar, sem mexer nos seus
            dados.
          </li>
          <li>
            <MessageCircle size={20} aria-hidden="true" /> Resultado explicado em palavras simples.
          </li>
          <li>
            <EyeOff size={20} aria-hidden="true" /> Sem anúncios e sem rastreamento.
          </li>
        </ul>
      </section>

      <main className="auth-panel">
        <div className="auth-card stack">
          <div>
            <p className="eyebrow">Olá</p>
            <h2 style={{ margin: 0 }}>Entrar no SAFE</h2>
          </div>
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
          {reason && !error && (
            <p className="notice notice-brand" role="status">
              {reason}
            </p>
          )}
          {navigator.cookieEnabled === false && (
            <p className="notice" role="alert">
              Ative os cookies para este site. Usamos só cookies essenciais de login.
            </p>
          )}
          <a className="btn btn-primary btn-lg btn-block google-btn" href="/api/v1/auth/google">
            <GoogleG />
            Entrar com Google
          </a>
          {import.meta.env.DEV && (
            <>
              <div className="divider">só em desenvolvimento</div>
              <button type="button" className="btn btn-block" onClick={devLogin}>
                Entrar como pessoa de teste (só em desenvolvimento)
              </button>
              {devError && <p className="field-error">{devError}</p>}
            </>
          )}
          <p className="small">
            <Term id="oauth-google">Entramos com sua conta Google</Term>. Recebemos só seu e-mail;
            não temos acesso à sua senha nem ao seu Gmail.
          </p>
          <p className="small muted">Em computador compartilhado, sempre clique em Sair.</p>
          <p className="small muted">
            <Link to="/privacidade">Política de Privacidade</Link> ·{' '}
            <Link to="/termos-de-uso">Termos de Uso</Link> · <Link to="/glossario">Glossário</Link>
          </p>
        </div>
      </main>
      <CookieNotice />
    </div>
  );
}
