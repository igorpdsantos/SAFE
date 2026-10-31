import { ChartNoAxesColumn } from 'lucide-react';

export interface EmptyAction {
  label: string;
  onClick: () => void;
}

/** Gráfico sem dados no período: diz o porquê e oferece a saída em um toque. */
export function EmptyChart({ message, action }: { message: string; action?: EmptyAction }) {
  return (
    <div className="empty-chart">
      <ChartNoAxesColumn size={28} aria-hidden="true" />
      <p>{message}</p>
      {action && (
        <button type="button" className="btn" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
