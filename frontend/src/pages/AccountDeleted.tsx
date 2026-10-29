import { Link } from 'react-router-dom';

export function AccountDeleted() {
  return (
    <div className="center-page">
      <div className="card stack">
        <h1>Conta excluída</h1>
        <p>
          Sua conta e seus dados foram excluídos. Cópias de segurança são apagadas automaticamente
          em até 30 dias.
        </p>
        <p className="small muted">
          Se quiser, remova também o acesso do SAFE na sua conta Google, em
          myaccount.google.com/permissions.
        </p>
        <Link to="/login">Voltar ao início</Link>
      </div>
    </div>
  );
}
