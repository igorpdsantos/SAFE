import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ProjectionPoint } from '../api/types';
import { formatMoney } from '../lib/format';

const money = (v: number) => formatMoney(String(v));

/** Sobra do mês (barras) e saldo acumulado (linha), com linha em R$ 0 (SPEC-06 §4). */
export function ProjectionChart({ points }: { points: ProjectionPoint[] }) {
  const data = points.map((p) => ({
    label: p.label,
    sobra: Number(p.free),
    saldo: Number(p.balance),
  }));
  return (
    <div style={{ width: '100%', height: 300 }} aria-hidden="true">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
          <YAxis tickFormatter={money} width={90} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
          <Tooltip formatter={(v) => money(Number(v))} />
          <Legend />
          <ReferenceLine y={0} stroke="var(--danger)" />
          <Bar dataKey="sobra" name="Sobra do mês" fill="var(--brand)" />
          <Line
            dataKey="saldo"
            name="Saldo acumulado"
            stroke="var(--risk-3)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Sobra do mês sem e com a compra (bloco 4 da simulação). */
export function CompareChart({
  without,
  withPurchase,
}: {
  without: ProjectionPoint[];
  withPurchase: ProjectionPoint[];
}) {
  const data = withPurchase.map((p, i) => ({
    label: p.label,
    sem: Number(without[i]?.free ?? without[without.length - 1]?.free ?? 0),
    com: Number(p.free),
  }));
  return (
    <div style={{ width: '100%', height: 280 }} aria-hidden="true">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
          <YAxis tickFormatter={money} width={90} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
          <Tooltip formatter={(v) => money(Number(v))} />
          <Legend />
          <ReferenceLine y={0} stroke="var(--danger)" />
          <Line
            dataKey="sem"
            name="Sem a compra"
            stroke="var(--muted)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
          />
          <Line dataKey="com" name="Com a compra" stroke="var(--brand)" strokeWidth={2} dot />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
