import { monthName, pct } from './viz';

interface Entry {
  dataKey?: string | number;
  value?: number | string;
  color?: string;
}

/** Tooltip: o valor em destaque, o nome em segundo plano, a série marcada por um traço (não caixa). */
export function VizTooltip({
  active,
  payload,
  label,
  names,
  colors,
}: {
  active?: boolean;
  payload?: Entry[];
  label?: string;
  names: Record<string, string>;
  colors: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null && names[String(p.dataKey)]);
  if (!rows.length) return null;
  return (
    <div className="viz-tooltip">
      {label && <div className="when">{monthName(String(label))}</div>}
      <ul>
        {rows.map((p) => (
          <li key={String(p.dataKey)}>
            <span className="line-key" style={{ color: colors[String(p.dataKey)] }} />
            <strong>{pct(Number(p.value))}</strong>
            <span className="name">{names[String(p.dataKey)]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
