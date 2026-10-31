import { CircleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError, userMessage } from '../api/client';
import { EmptyArt } from './Art';

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <p className="muted loading" role="status">
      {label}
    </p>
  );
}

/** Erro de carregamento; sem renda vira o convite para cadastrar (UC07 E01). */
export function LoadError({ error }: { error: unknown }) {
  if (error instanceof ApiError && error.code === 'INSUFFICIENT_DATA') {
    return (
      <div className="empty">
        <div className="art">
          <EmptyArt kind="incomes" />
        </div>
        <div className="stack">
          <h2>Falta a sua renda</h2>
          <p>
            Para calcular, precisamos saber quanto você recebe por mês. Leva menos de um minuto.
          </p>
          <div>
            <Link className="btn btn-primary" to="/orcamento?aba=incomes">
              Cadastrar renda
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="alert risk-4" role="alert">
      <CircleAlert size={22} aria-hidden="true" />
      <p style={{ color: 'var(--text)' }}>{userMessage(error)}</p>
    </div>
  );
}
