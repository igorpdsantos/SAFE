import { Download, FlaskConical, LogOut, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, userMessage } from '../api/client';
import { keys, useConsent, useMyData } from '../api/hooks';
import { PageHeader } from '../components/PageHeader';
import { LoadError, Loading } from '../components/States';
import { Term } from '../components/Term';
import { formatDate } from '../lib/format';
import { handleSessionEnd } from '../lib/session';

const COUNT_LABELS: Record<string, string> = {
  incomes: 'rendas',
  expenses: 'despesas',
  debts: 'dívidas',
  reserves: 'reservas',
  simulations: 'simulações',
  historyPoints: 'pontos de histórico',
  alerts: 'alertas',
};

/** Minha conta: meus dados, pesquisa, exportar, sair de todos e excluir (SPEC-10 §5). */
export function Account() {
  const data = useMyData();
  const consent = useConsent();
  const qc = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  if (data.isLoading) return <Loading />;
  if (data.isError || !data.data) return <LoadError error={data.error} />;
  const me = data.data;

  const toggleConsent = async (granted: boolean) => {
    try {
      await api('/me/research-consent', { method: 'PUT', body: { granted } });
      await qc.invalidateQueries({ queryKey: keys.consent });
      setMessage(
        granted
          ? 'Obrigado! Você está participando da pesquisa.'
          : 'Pronto: você não participa mais da pesquisa.',
      );
    } catch (err) {
      setMessage(userMessage(err));
    }
  };

  const logoutAll = async () => {
    try {
      await api('/auth/logout-all', { method: 'POST' });
    } finally {
      handleSessionEnd('logout');
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api('/me', { method: 'DELETE', body: { confirm } });
      handleSessionEnd('deleted');
    } catch (err) {
      setMessage(userMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="stack reveal">
      <PageHeader
        eyebrow="Você"
        title="Minha conta"
        lead="Seus dados, sua privacidade e o controle de tudo o que o SAFE guarda."
      />
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}

      <section className="card stack" aria-labelledby="dados">
        <h2 id="dados" className="card-title">
          <UserRound size={22} aria-hidden="true" /> Meus dados
        </h2>
        <dl className="numbers facts">
          <div>
            <dt className="small muted">E-mail</dt>
            <dd>{me.email}</dd>
          </div>
          <div>
            <dt className="small muted">Conta criada em</dt>
            <dd>{formatDate(me.createdAt)}</dd>
          </div>
          <div>
            <dt className="small muted">Termos aceitos</dt>
            <dd>
              {me.termsAcceptedAt
                ? `versão ${me.termsVersion} dos Termos e ${me.privacyVersion} da Política, em ${formatDate(me.termsAcceptedAt)}`
                : 'ainda não'}
            </dd>
          </div>
        </dl>
        <p className="small muted">
          Guardamos:{' '}
          {Object.entries(me.counts)
            .map(([k, n]) => `${n} ${COUNT_LABELS[k] ?? k}`)
            .join(', ')}
          .
        </p>
      </section>

      <section className="card stack" aria-labelledby="pesquisa">
        <div className="stack-sm">
          <h2 id="pesquisa" className="card-title">
            <FlaskConical size={22} aria-hidden="true" /> Pesquisa do trabalho de conclusão de curso
          </h2>
          <p className="muted">
            Se você quiser, seus <Term id="anonimizado">dados anonimizados</Term> ajudam no estudo
            do SAFE. É opcional e você pode mudar quando quiser. Isso não muda nada no uso do
            sistema.
          </p>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={consent.data?.granted ?? me.researchConsent}
            onChange={(e) => toggleConsent(e.target.checked)}
          />
          Participar da pesquisa
        </label>
      </section>

      <div className="grid-2">
        <section className="card stack" aria-labelledby="exportar">
          <div className="stack-sm">
            <h2 id="exportar" className="card-title">
              <Download size={22} aria-hidden="true" /> Baixar meus dados
            </h2>
            <p className="muted">
              Um arquivo com tudo o que o SAFE guarda sobre você. Ele é gerado na hora e não fica
              salvo no servidor.
            </p>
          </div>
          <div>
            <a className="btn btn-block-mobile" href="/api/v1/me/export" download>
              <Download size={18} aria-hidden="true" /> Baixar meus dados (arquivo JSON)
            </a>
          </div>
        </section>

        <section className="card stack" aria-labelledby="sair">
          <div className="stack-sm">
            <h2 id="sair" className="card-title">
              <ShieldCheck size={22} aria-hidden="true" /> Sair de todos os dispositivos
            </h2>
            <p className="muted">
              Encerra o acesso em todos os navegadores em que você entrou, inclusive este.
            </p>
          </div>
          <div>
            <button type="button" className="btn btn-block-mobile" onClick={logoutAll}>
              <LogOut size={18} aria-hidden="true" /> Sair de todos os dispositivos
            </button>
          </div>
        </section>
      </div>

      <section className="card stack danger-zone" aria-labelledby="excluir">
        <div className="stack-sm">
          <h2 id="excluir" className="card-title">
            <Trash2 size={22} aria-hidden="true" style={{ color: 'var(--danger)' }} /> Excluir minha
            conta
          </h2>
          {!deleting && <p className="muted">Apaga para sempre sua conta e todos os seus dados.</p>}
        </div>
        {!deleting ? (
          <div>
            <button
              type="button"
              className="btn btn-block-mobile"
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={18} aria-hidden="true" /> Quero excluir minha conta
            </button>
          </div>
        ) : (
          <>
            <p>Vamos apagar para sempre:</p>
            <ul className="bullets">
              <li>sua conta e seu e-mail;</li>
              <li>sua renda, despesas, dívidas e reserva;</li>
              <li>seu índice, seu histórico, suas simulações e seus alertas;</li>
              <li>sua participação na pesquisa.</li>
            </ul>
            <p>
              <strong>Esta ação não pode ser desfeita.</strong> Se quiser guardar uma cópia, baixe
              seus dados antes.
            </p>
            <div className="field">
              <label htmlFor="confirm-delete">Para confirmar, digite EXCLUIR</label>
              <input
                id="confirm-delete"
                className="input"
                autoComplete="off"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="EXCLUIR"
              />
            </div>
            <div className="row">
              <button
                type="button"
                className="btn btn-danger"
                disabled={confirm !== 'EXCLUIR' || busy}
                onClick={remove}
              >
                Excluir minha conta para sempre
              </button>
              <button type="button" className="btn" onClick={() => setDeleting(false)}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
