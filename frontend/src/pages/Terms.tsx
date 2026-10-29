import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, userMessage } from '../api/client';
import { keys, useTerms } from '../api/hooks';
import { CookieNotice } from '../components/CookieNotice';
import { LegalText } from '../components/Markdown';
import { LoadError, Loading } from '../components/States';
import { Term } from '../components/Term';
import { handleSessionEnd } from '../lib/session';

/** Aceite dos termos, maioridade e pesquisa opcional, nada pré-marcado (SPEC-03 §5). */
export function Terms() {
  const terms = useTerms();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [checks, setChecks] = useState({
    terms: false,
    privacy: false,
    age: false,
    research: false,
  });
  const [show, setShow] = useState<'termos' | 'privacidade' | null>(null);
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (terms.isLoading) return <Loading />;
  if (terms.isError || !terms.data) return <LoadError error={terms.error} />;
  const ready = checks.terms && checks.privacy && checks.age;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api('/terms/accept', {
        method: 'POST',
        body: {
          termsVersion: terms.data.termsVersion,
          privacyVersion: terms.data.privacyVersion,
          acceptTerms: checks.terms,
          acknowledgePrivacy: checks.privacy,
          ageConfirmed: checks.age,
          researchConsent: checks.research,
        },
      });
      await qc.invalidateQueries({ queryKey: keys.me });
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === 'TERMS_OUTDATED' ? err.message : userMessage(err),
      );
    } finally {
      setBusy(false);
    }
  };

  const box = (key: keyof typeof checks, label: ReactNode) => (
    <label className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', gap: '0.6rem' }}>
      <input
        type="checkbox"
        checked={checks[key]}
        onChange={(e) => setChecks((c) => ({ ...c, [key]: e.target.checked }))}
        style={{ width: 22, height: 22, marginTop: 2, flexShrink: 0 }}
      />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="center-page">
      <div className="card stack" style={{ width: 'min(640px, 100%)' }}>
        <h1>Antes de começar</h1>
        <p>
          Para usar o SAFE, você precisa aceitar os Termos de Uso, ler a Política de Privacidade e
          confirmar que tem 18 anos ou mais. Seus dados ficam protegidos pela{' '}
          <Term id="lgpd">LGPD</Term>.
        </p>
        <div className="notice small">
          <strong>Em resumo:</strong> o SAFE calcula o risco do seu orçamento e simula compras
          parceladas. Ele não recomenda produtos nem decide por você. Usamos só o necessário e você
          pode exportar ou excluir seus dados quando quiser.
        </div>
        {box(
          'terms',
          <>
            Li e aceito os{' '}
            <button
              type="button"
              className="btn-link btn"
              onClick={() => setShow(show === 'termos' ? null : 'termos')}
            >
              Termos de Uso
            </button>
          </>,
        )}
        {show === 'termos' && (
          <div className="card" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <LegalText url={terms.data.termsUrl} />
          </div>
        )}
        {box(
          'privacy',
          <>
            Li a{' '}
            <button
              type="button"
              className="btn-link btn"
              onClick={() => setShow(show === 'privacidade' ? null : 'privacidade')}
            >
              Política de Privacidade
            </button>
          </>,
        )}
        {show === 'privacidade' && (
          <div className="card" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <LegalText url={terms.data.privacyUrl} />
          </div>
        )}
        {box('age', 'Declaro ter 18 anos ou mais')}
        {box(
          'research',
          <>
            <strong>(opcional)</strong> Aceito participar da pesquisa do nosso trabalho de conclusão
            de curso com meus <Term id="anonimizado">dados anonimizados</Term>. É o meu{' '}
            <Term id="consentimento">consentimento</Term>, e posso retirar quando quiser em "Minha
            conta". Não marcar não muda nada no uso do SAFE.
          </>,
        )}
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        {declined ? (
          <div className="notice stack">
            <p style={{ margin: 0 }}>Sem aceitar os termos não é possível usar o SAFE.</p>
            <div className="row">
              <button type="button" className="btn" onClick={() => setDeclined(false)}>
                Voltar
              </button>
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
                  handleSessionEnd('logout');
                }}
              >
                Sair
              </button>
            </div>
          </div>
        ) : (
          <div className="row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!ready || busy}
              onClick={submit}
            >
              Continuar
            </button>
            <button type="button" className="btn" onClick={() => setDeclined(true)}>
              Não aceito
            </button>
          </div>
        )}
        {!ready && <p className="small muted">Marque as três primeiras opções para continuar.</p>}
      </div>
      <CookieNotice />
    </div>
  );
}
