import { Link } from 'react-router-dom';
import { LogoMark } from '../components/Art';

export function AccountDeleted() {
  return (
    <div className="center-page">
      <div className="card stack" style={{ padding: '2rem' }}>
        <div style={{ color: 'var(--brand-strong)' }}>
          <LogoMark size={40} />
        </div>
        <h1 style={{ margin: 0 }}>Conta excluída</h1>
        <p>
          Sua conta e seus dados foram excluídos. Cópias de segurança são apagadas automaticamente
          em até 30 dias.
        </p>
        <p className="small muted">
          Se quiser, remova também o acesso do SAFE na sua conta Google, em
          myaccount.google.com/permissions.
        </p>
        <div>
          <Link className="btn btn-primary" to="/login">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
