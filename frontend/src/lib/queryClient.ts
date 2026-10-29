import { QueryClient } from '@tanstack/react-query';

// TanStack Query só em memória: nada de persistQueryClient (SEGURANCA_LGPD §5).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 5 * 60 * 1000,
      staleTime: 30 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});
