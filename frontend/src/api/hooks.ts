import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  Analysis,
  BudgetItems,
  BudgetKind,
  ContextSeries,
  History,
  Me,
  MyData,
  Projection,
  Simulation,
  TermsCurrent,
} from './types';

export const keys = {
  me: ['me'] as const,
  analysis: ['analysis'] as const,
  projection: ['projection'] as const,
  history: (months: number) => ['history', months] as const,
  budget: (kind: BudgetKind) => ['budget', kind] as const,
  myData: ['myData'] as const,
  terms: ['terms'] as const,
  consent: ['consent'] as const,
};

export const useMe = () =>
  useQuery({ queryKey: keys.me, queryFn: () => api<Me>('/auth/me'), retry: false });
export const useAnalysis = () =>
  useQuery({ queryKey: keys.analysis, queryFn: () => api<Analysis>('/analysis') });
export const useProjection = () =>
  useQuery({ queryKey: keys.projection, queryFn: () => api<Projection>('/projection') });
export const useTerms = () =>
  useQuery({ queryKey: keys.terms, queryFn: () => api<TermsCurrent>('/terms/current') });
/** Séries públicas (SPEC-14); mudam só quando a equipe atualiza os CSVs. */
export const useContextSeries = () =>
  useQuery({
    queryKey: ['context'],
    queryFn: async () => (await api<{ series: ContextSeries[] }>('/context/series')).series,
    staleTime: Infinity,
  });
export const useMyData = () =>
  useQuery({ queryKey: keys.myData, queryFn: () => api<MyData>('/me') });
export const useConsent = () =>
  useQuery({
    queryKey: keys.consent,
    queryFn: () => api<{ granted: boolean; grantedAt: string | null }>('/me/research-consent'),
  });

function isoDaysAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

export const useHistory = (months: number) =>
  useQuery({
    queryKey: keys.history(months),
    queryFn: () => api<History>(`/history?from=${isoDaysAgo(months)}`),
  });

export function useBudgetList<K extends BudgetKind>(kind: K) {
  return useQuery({
    queryKey: keys.budget(kind),
    queryFn: async () => (await api<{ items: BudgetItems[K][] }>(`/${kind}`)).items,
  });
}

/** Depois de salvar no orçamento, tudo que deriva dele é recarregado (SPEC-04 §6). */
function useInvalidateBudget() {
  const qc = useQueryClient();
  return (kind: BudgetKind) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.budget(kind) }),
      qc.invalidateQueries({ queryKey: keys.analysis }),
      qc.invalidateQueries({ queryKey: keys.projection }),
      qc.invalidateQueries({ queryKey: ['history'] }),
      qc.invalidateQueries({ queryKey: keys.myData }),
    ]);
}

export function useSaveBudgetItem(kind: BudgetKind) {
  const invalidate = useInvalidateBudget();
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: Record<string, unknown> }) =>
      id
        ? api(`/${kind}/${id}`, { method: 'PUT', body })
        : api(`/${kind}`, { method: 'POST', body }),
    onSuccess: () => invalidate(kind),
  });
}

export function useDeleteBudgetItem(kind: BudgetKind) {
  const invalidate = useInvalidateBudget();
  return useMutation({
    mutationFn: (id: number) => api(`/${kind}/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidate(kind),
  });
}

export function useSimulate() {
  return useMutation({
    mutationFn: (body: { value: string; installments: number; installmentValue: string }) =>
      api<Simulation>('/simulations', { method: 'POST', body }),
  });
}

/** D-12: a simulação vira uma dívida real; o orçamento e tudo que deriva dele é recarregado. */
export function useRegisterSimulation() {
  const invalidate = useInvalidateBudget();
  return useMutation({
    mutationFn: (id: number) => api(`/simulations/${id}/register`, { method: 'POST' }),
    onSuccess: () => invalidate('debts'),
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/alerts/${id}`, { method: 'PATCH', body: { status: 'LIDO' } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.analysis }),
  });
}
