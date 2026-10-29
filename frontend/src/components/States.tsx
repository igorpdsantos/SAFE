import { Link } from 'react-router-dom';
import { ApiError, userMessage } from '../api/client';

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <p className="muted" role="status">
      {label}
    </p>
  );
}

/** Erro de carregamento; sem renda vira o convite para cadastrar (UC07 E01). */
export function LoadError({ error }: { error: unknown }) {
  if (error instanceof ApiError && error.code === 'INSUFFICIENT_DATA') {
    return (
      <div className="card stack">
        <h2>Falta a sua renda</h2>
        <p>Para calcular, precisamos saber quanto você recebe por mês. Leva menos de um minuto.</p>
        <div>
          <Link className="btn btn-primary" to="/orcamento?aba=incomes">
            Cadastrar renda
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="card" role="alert">
      <p style={{ margin: 0 }}>{userMessage(error)}</p>
    </div>
  );
}
