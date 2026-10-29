import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError, userMessage } from '../api/client';
import { useBudgetList, useDeleteBudgetItem, useSaveBudgetItem } from '../api/hooks';
import type { BudgetItems, BudgetKind, Debt, Expense, Income, Reserve } from '../api/types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FieldHelp } from '../components/FieldHelp';
import { MoneyInput } from '../components/MoneyInput';
import { LoadError, Loading } from '../components/States';
import { Term } from '../components/Term';
import {
  DEBT_CATEGORY_LABELS,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_TYPE_LABELS,
} from '../content/labels';
import { formatDate, formatMoney } from '../lib/format';

const TABS: { kind: BudgetKind; label: string }[] = [
  { kind: 'incomes', label: 'Renda' },
  { kind: 'expenses', label: 'Despesas' },
  { kind: 'debts', label: 'Dívidas' },
  { kind: 'reserves', label: 'Reserva' },
];

const EMPTY: Record<BudgetKind, ReactNode> = {
  incomes: (
    <>
      Você ainda não cadastrou renda. É o ponto de partida: todos os cálculos comparam seus gastos
      com o que você recebe por mês.
    </>
  ),
  expenses: (
    <>
      Nenhuma despesa cadastrada. Usamos suas despesas para saber quanto sobra no mês e por quanto
      tempo sua reserva duraria.
    </>
  ),
  debts: (
    <>
      Nenhuma dívida cadastrada. Se você paga parcelas, cadastre aqui: elas mostram quanto da sua
      renda já está comprometida. Se não tem dívidas, ótimo, pode pular.
    </>
  ),
  reserves: (
    <>
      Nenhuma reserva cadastrada. Dinheiro guardado ajuda a passar por imprevistos. Se não tem, tudo
      bem: o SAFE considera reserva zero.
    </>
  ),
};

type Form = Record<string, string>;

const EMPTY_FORM: Record<BudgetKind, Form> = {
  incomes: { monthValue: '', description: '' },
  expenses: { category: '', type: '', value: '', description: '' },
  debts: {
    category: '',
    installmentValue: '',
    remainingInstallments: '',
    totalInstallments: '',
    balanceDue: '',
    description: '',
  },
  reserves: { value: '', description: '' },
};

function toForm(kind: BudgetKind, item: BudgetItems[BudgetKind]): Form {
  const d = (item.description ?? '') as string;
  switch (kind) {
    case 'incomes':
      return { monthValue: (item as Income).monthValue, description: d };
    case 'expenses': {
      const e = item as Expense;
      return { category: e.category, type: e.type, value: e.value, description: d };
    }
    case 'debts': {
      const x = item as Debt;
      return {
        category: x.category,
        installmentValue: x.installmentValue,
        remainingInstallments: String(x.remainingInstallments),
        totalInstallments: x.totalInstallments === null ? '' : String(x.totalInstallments),
        balanceDue: x.balanceDue ?? '',
        description: d,
      };
    }
    default:
      return { value: (item as Reserve).value, description: d };
  }
}

/** Corpo da API a partir do formulário (dinheiro já vem "1234.56" do MoneyInput). */
function toBody(kind: BudgetKind, f: Form): Record<string, unknown> {
  const description = f.description?.trim() ? f.description.trim() : null;
  const int = (v: string | undefined) => (v === undefined || v === '' ? null : Number(v));
  switch (kind) {
    case 'incomes':
      return { monthValue: f.monthValue, description };
    case 'expenses':
      return { category: f.category, type: f.type, value: f.value, description };
    case 'debts':
      return {
        category: f.category,
        installmentValue: f.installmentValue,
        remainingInstallments: int(f.remainingInstallments) ?? '',
        totalInstallments: int(f.totalInstallments),
        balanceDue: f.balanceDue === '' ? null : f.balanceDue,
        description,
      };
    default:
      return { value: f.value, description };
  }
}

function Field({
  label,
  help,
  error,
  children,
}: {
  label: ReactNode;
  help: { what: string; why: string };
  error?: string;
  children: (ids: { id: string; describedBy: string }) => ReactNode;
}) {
  const id = useId();
  const helpId = `${id}-help`;
  const errId = `${id}-err`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <FieldHelp id={helpId} what={help.what} why={help.why} />
      {children({ id, describedBy: error ? `${helpId} ${errId}` : helpId })}
      {error && (
        <span id={errId} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}

function ItemForm({
  kind,
  initial,
  onDone,
  editingId,
}: {
  kind: BudgetKind;
  initial: Form;
  editingId?: number;
  onDone: () => void;
}) {
  const [f, setF] = useState<Form>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const save = useSaveBudgetItem(kind);
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneral(null);
    try {
      await save.mutateAsync({ id: editingId, body: toBody(kind, f) });
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setErrors(err.fields);
        if (err.fields._ || Object.keys(err.fields).length === 0) setGeneral(err.message);
      } else setGeneral(userMessage(err));
    }
  };

  const money = (
    key: string,
    label: ReactNode,
    help: { what: string; why: string },
    placeholder: string,
  ) => (
    <Field label={label} help={help} error={errors[key]}>
      {({ id, describedBy }) => (
        <MoneyInput
          id={id}
          aria-describedby={describedBy}
          aria-invalid={!!errors[key]}
          placeholder={placeholder}
          value={f[key] ?? ''}
          onChange={set(key)}
        />
      )}
    </Field>
  );

  const number = (
    key: string,
    label: ReactNode,
    help: { what: string; why: string },
    placeholder: string,
  ) => (
    <Field label={label} help={help} error={errors[key]}>
      {({ id, describedBy }) => (
        <input
          id={id}
          className="input"
          inputMode="numeric"
          autoComplete="off"
          aria-describedby={describedBy}
          aria-invalid={!!errors[key]}
          placeholder={placeholder}
          value={f[key] ?? ''}
          onChange={(e) => set(key)(e.target.value.replace(/\D/g, '').slice(0, 3))}
        />
      )}
    </Field>
  );

  const select = (
    key: string,
    label: ReactNode,
    help: { what: string; why: string },
    options: Record<string, string>,
  ) => (
    <Field label={label} help={help} error={errors[key]}>
      {({ id, describedBy }) => (
        <select
          id={id}
          className="input"
          aria-describedby={describedBy}
          aria-invalid={!!errors[key]}
          value={f[key] ?? ''}
          onChange={(e) => set(key)(e.target.value)}
        >
          <option value="">Escolha…</option>
          {Object.entries(options).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      )}
    </Field>
  );

  return (
    <form className="card stack" onSubmit={submit} noValidate>
      {kind === 'incomes' &&
        money(
          'monthValue',
          <>
            Quanto você recebe por mês (<Term id="renda-liquida">renda líquida</Term>)
          </>,
          {
            what: 'Quanto você recebe por mês, já sem INSS e imposto de renda. Se você tem consignado, some a parcela de volta e cadastre o consignado em Dívidas.',
            why: 'Usamos para comparar seus gastos e parcelas com o que você ganha.',
          },
          'Ex.: 2.700,00',
        )}
      {kind === 'expenses' && (
        <>
          {select(
            'type',
            <>
              Tipo de despesa (<Term id="despesa-fixa">fixa</Term> ou{' '}
              <Term id="despesa-variavel">variável</Term>)
            </>,
            {
              what: 'Fixa se repete com valor parecido; variável muda de mês para mês.',
              why: 'Ajuda você a revisar o que dá para reduzir.',
            },
            EXPENSE_TYPE_LABELS,
          )}
          {select(
            'category',
            'Categoria',
            {
              what: 'Em que área vai esse gasto.',
              why: 'Organiza sua lista sem precisar escrever detalhes pessoais.',
            },
            EXPENSE_CATEGORY_LABELS,
          )}
          {money(
            'value',
            'Valor por mês',
            {
              what: 'Quanto você gasta com isso num mês. Para gastos que variam, use uma média.',
              why: 'Usamos para calcular quanto sobra no mês e quanto tempo sua reserva duraria.',
            },
            'Ex.: 150,00',
          )}
        </>
      )}
      {kind === 'debts' && (
        <>
          {select(
            'category',
            'Tipo de dívida',
            {
              what: 'Que tipo de compra ou empréstimo é.',
              why: 'Organiza sua lista e ajuda a lembrar de cada dívida.',
            },
            DEBT_CATEGORY_LABELS,
          )}
          {f.category === 'CONSIGNADO' && (
            <p className="notice small" role="note">
              Confira se você somou a parcela deste consignado de volta à sua renda, para ela não
              contar duas vezes.
            </p>
          )}
          {money(
            'installmentValue',
            <>
              Valor de cada <Term id="parcela">parcela</Term>
            </>,
            {
              what: 'Quanto você paga por mês nesta dívida.',
              why: 'Mostra quanto da sua renda já está comprometida todo mês.',
            },
            'Ex.: 200,00',
          )}
          {number(
            'remainingInstallments',
            'Parcelas que ainda faltam pagar',
            {
              what: 'Quantas parcelas faltam a partir de hoje.',
              why: 'Usamos para saber até quando essa parcela pesa no seu orçamento.',
            },
            'Ex.: 10',
          )}
          {number(
            'totalInstallments',
            'Total de parcelas do contrato (opcional)',
            {
              what: 'Em quantas vezes a dívida foi feita no começo.',
              why: 'Só para você acompanhar quanto já pagou.',
            },
            'Ex.: 12',
          )}
          {money(
            'balanceDue',
            <>
              Quanto falta pagar no total (<Term id="saldo-devedor">saldo devedor</Term>, opcional)
            </>,
            {
              what: 'O total que ainda falta pagar, se você souber. Se deixar em branco, multiplicamos a parcela pelas parcelas que faltam.',
              why: 'Usamos para saber o tamanho total das suas dívidas.',
            },
            'Ex.: 2.000,00',
          )}
          {f.balanceDue !== '' && (
            <p className="small muted">
              Atualize o saldo devedor de vez em quando; ele não diminui sozinho.
            </p>
          )}
        </>
      )}
      {kind === 'reserves' &&
        money(
          'value',
          <>
            Quanto você tem guardado (<Term id="reserva">reserva</Term>)
          </>,
          {
            what: 'Dinheiro que você pode usar rápido numa emergência, como poupança ou conta.',
            why: 'Usamos para calcular por quantos meses você pagaria suas despesas se a renda parasse.',
          },
          'Ex.: 1.000,00',
        )}

      <Field
        label="Descrição (opcional)"
        help={{
          what: 'Um apelido para você reconhecer o item.',
          why: 'Fica protegida com criptografia e só você vê.',
        }}
        error={errors.description}
      >
        {({ id, describedBy }) => (
          <>
            <p className="notice small" style={{ margin: 0 }}>
              Não escreva nomes de pessoas, dados de saúde, número de conta ou de cartão.
            </p>
            <input
              id={id}
              className="input"
              maxLength={60}
              autoComplete="off"
              aria-describedby={describedBy}
              aria-invalid={!!errors.description}
              placeholder="Ex.: Geladeira"
              value={f.description ?? ''}
              onChange={(e) => set('description')(e.target.value)}
            />
          </>
        )}
      </Field>

      {general && (
        <p className="field-error" role="alert">
          {general}
        </p>
      )}
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={save.isPending}>
          {editingId ? 'Salvar alterações' : SAVE_LABEL[kind]}
        </button>
        <button type="button" className="btn" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

const SAVE_LABEL: Record<BudgetKind, string> = {
  incomes: 'Salvar renda',
  expenses: 'Salvar despesa',
  debts: 'Salvar dívida',
  reserves: 'Salvar reserva',
};
const ADD_LABEL: Record<BudgetKind, string> = {
  incomes: 'Adicionar renda',
  expenses: 'Adicionar despesa',
  debts: 'Adicionar dívida',
  reserves: 'Adicionar reserva',
};

function describe(
  kind: BudgetKind,
  item: BudgetItems[BudgetKind],
): { title: string; detail: string; faded?: boolean } {
  const name = item.description;
  switch (kind) {
    case 'incomes':
      return {
        title: name ?? 'Renda',
        detail: `${formatMoney((item as Income).monthValue)} por mês`,
      };
    case 'expenses': {
      const e = item as Expense;
      return {
        title: name ?? EXPENSE_CATEGORY_LABELS[e.category] ?? e.category,
        detail: `${formatMoney(e.value)} por mês · ${EXPENSE_CATEGORY_LABELS[e.category]} · ${EXPENSE_TYPE_LABELS[e.type]}`,
      };
    }
    case 'debts': {
      const d = item as Debt;
      return {
        title: `${name ?? DEBT_CATEGORY_LABELS[d.category] ?? d.category}${d.active ? '' : ' · Quitada'}`,
        detail: d.active
          ? `${formatMoney(d.installmentValue)} por mês · faltam ${d.remainingNow} parcela(s) · falta pagar ${formatMoney(d.balanceUsed)} · contado desde ${formatDate(d.referenceDate)}`
          : 'Todas as parcelas foram pagas. Não entra mais no cálculo.',
        faded: !d.active,
      };
    }
    default:
      return { title: name ?? 'Reserva', detail: formatMoney((item as Reserve).value) };
  }
}

function KindPanel({ kind }: { kind: BudgetKind }) {
  const list = useBudgetList(kind);
  const remove = useDeleteBudgetItem(kind);
  const [editing, setEditing] = useState<{ id?: number; form: Form } | null>(null);
  const [toDelete, setToDelete] = useState<number | null>(null);

  if (list.isLoading) return <Loading />;
  if (list.isError) return <LoadError error={list.error} />;
  const items = list.data ?? [];

  return (
    <div className="stack">
      {editing ? (
        <ItemForm
          kind={kind}
          initial={editing.form}
          editingId={editing.id}
          onDone={() => setEditing(null)}
        />
      ) : (
        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setEditing({ form: EMPTY_FORM[kind] })}
          >
            <Plus size={18} aria-hidden="true" /> {ADD_LABEL[kind]}
          </button>
        </div>
      )}
      {items.length === 0 ? (
        <p className="notice">{EMPTY[kind]}</p>
      ) : (
        <ul className="list card">
          {items.map((item) => {
            const info = describe(kind, item);
            return (
              <li key={item.id} style={{ opacity: info.faded ? 0.6 : 1 }}>
                <div>
                  <strong>{info.title}</strong>
                  <p className="small muted" style={{ margin: 0 }}>
                    {info.detail}
                  </p>
                </div>
                <div className="row" style={{ gap: '0.25rem' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setEditing({ id: item.id, form: toForm(kind, item) })}
                    aria-label={`Editar ${info.title}`}
                  >
                    <Pencil size={16} aria-hidden="true" /> Editar
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setToDelete(item.id)}
                    aria-label={`Excluir ${info.title}`}
                  >
                    <Trash2 size={16} aria-hidden="true" /> Excluir
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {toDelete !== null && (
        <ConfirmDialog
          title="Excluir este item?"
          confirmLabel="Excluir item"
          danger
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            remove.mutate(toDelete);
            setToDelete(null);
          }}
        >
          <p>Esta ação não pode ser desfeita.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

/** Meu orçamento: renda, despesas, dívidas e reserva (SPEC-04 §6). */
export function Budget() {
  const [params, setParams] = useSearchParams();
  const current = (TABS.find((t) => t.kind === params.get('aba'))?.kind ?? 'incomes') as BudgetKind;
  return (
    <div className="stack">
      <h1>Meu orçamento</h1>
      <p className="muted">
        Conte sua situação. Com esses dados calculamos seu índice de risco. Você pode editar ou
        excluir tudo quando quiser.
      </p>
      <div className="tabs" role="tablist" aria-label="Partes do orçamento">
        {TABS.map((t) => (
          <button
            key={t.kind}
            type="button"
            role="tab"
            className="tab"
            id={`tab-${t.kind}`}
            aria-selected={t.kind === current}
            aria-controls={`panel-${t.kind}`}
            onClick={() => setParams({ aba: t.kind })}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${current}`} aria-labelledby={`tab-${current}`}>
        <KindPanel key={current} kind={current} />
      </div>
    </div>
  );
}
