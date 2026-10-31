import { CircleCheck, OctagonAlert, Siren, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { IndicatorKey, IndicatorView } from '../api/types';
import type { GlossaryId } from '../content/glossary';
import { ResultExplainer } from './ResultExplainer';
import { RiskBar } from './RiskBar';
import { Term } from './Term';

const TERM: Record<IndicatorKey, GlossaryId> = {
  cr: 'comprometimento-renda',
  cp: 'capacidade-pagamento',
  lf: 'liquidez',
  ne: 'nivel-endividamento',
};

const TITLE: Record<IndicatorKey, string> = {
  cr: 'Comprometimento da renda',
  cp: 'Folga mensal',
  lf: 'Reserva de emergência',
  ne: 'Tamanho das dívidas',
};

const risk = (v: IndicatorView) => Number(v.risk);

/** Selo do comprometimento da renda (HU09 critérios 6 e 7): cor + ícone + rótulo, nunca só a cor (RNF05). */
function crLevelPill(v: IndicatorView): { cls: string; Icon: LucideIcon; label: string } | null {
  if (v.exceedsIncome) return { cls: 'risk-5', Icon: Siren, label: 'Acima da sua renda' };
  switch (v.level) {
    case 'OK':
      return { cls: 'risk-1', Icon: CircleCheck, label: 'Confortável' };
    case 'ATENCAO':
      return { cls: 'risk-2', Icon: TriangleAlert, label: 'Atenção' };
    case 'ALTO':
      return { cls: 'risk-4', Icon: OctagonAlert, label: 'Alto' };
    default:
      return null;
  }
}

/** Frase que traduz o número e a interpretação de cada indicador (SPEC-15 L3, L5). */
function explain(key: IndicatorKey, v: IndicatorView): { meaning: string; interpretation: string } {
  switch (key) {
    case 'cr':
      if (v.exceedsIncome)
        return {
          meaning: 'Suas parcelas passam da sua renda do mês.',
          interpretation: 'Muito acima do limite.',
        };
      return {
        meaning: `${v.display} da sua renda já vai para parcelas de dívidas.`,
        interpretation:
          v.level === 'OK'
            ? 'Dentro do confortável (abaixo de 30%).'
            : v.level === 'ATENCAO'
              ? 'Pede atenção (entre 30% e 50%).'
              : 'Alto: mais da metade da renda.',
      };
    case 'cp': {
      const negative = (v.value ?? '0').startsWith('-');
      return {
        meaning: negative
          ? `Faltam ${v.display.replace('-', '')} por mês para pagar despesas e parcelas.`
          : `Sobram ${v.display} por mês depois das contas e parcelas.`,
        interpretation:
          risk(v) === 0
            ? 'Folga confortável.'
            : risk(v) < 1
              ? 'Folga apertada.'
              : 'Sem folga no mês.',
      };
    }
    case 'lf':
      if (v.value === null)
        return {
          meaning: 'Você ainda não cadastrou despesas.',
          interpretation: 'Sem despesas para comparar.',
        };
      return {
        meaning: `Seu dinheiro guardado pagaria ${v.display} das suas despesas.`,
        interpretation:
          risk(v) === 0
            ? 'Reserva completa (6 meses ou mais).'
            : risk(v) < 1
              ? 'Reserva parcial.'
              : 'Sem reserva.',
      };
    case 'ne':
      return {
        meaning: `Suas dívidas somam ${v.display}.`,
        interpretation:
          risk(v) === 0
            ? 'Sem dívidas a pagar.'
            : risk(v) < 0.5
              ? 'Dívidas de tamanho moderado.'
              : 'Dívidas grandes para a sua renda.',
      };
  }
}

/** Card de indicador: nome com explicação, valor, barra de risco e selo de saturação (SPEC-11 §5). */
export function IndicatorCard({
  indicatorKey,
  view,
}: {
  indicatorKey: IndicatorKey;
  view: IndicatorView;
}) {
  const { meaning, interpretation } = explain(indicatorKey, view);
  const pill = indicatorKey === 'cr' ? crLevelPill(view) : null;
  return (
    <article className="card tile">
      <ResultExplainer
        title={<Term id={TERM[indicatorKey]}>{TITLE[indicatorKey]}</Term>}
        value={view.display}
        meaning={meaning}
        interpretation={interpretation}
      />
      {(pill || view.saturated) && (
        <div className="row row-tight">
          {pill && (
            <span className={`risk ${pill.cls}`}>
              <pill.Icon size={18} aria-hidden="true" />
              {pill.label}
            </span>
          )}
          {view.saturated && (
            <span className="badge">
              <Term id="no-limite-escala">no limite da escala</Term>
            </span>
          )}
        </div>
      )}
      <div className="tile-foot">
        <RiskBar risk={view.risk} />
      </div>
    </article>
  );
}
