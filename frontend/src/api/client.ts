import { handleSessionEnd } from '../lib/session';

export interface ApiErrorBody {
  code: string;
  message: string;
  requestId: string;
  fields?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = 'ApiError';
  }
  get code() {
    return this.body.code;
  }
  get fields() {
    return this.body.fields ?? {};
  }
}

function csrfToken(): string {
  const cookies = document.cookie.split(';').map((c) => c.trim());
  for (const name of ['__Host-safe_csrf', 'safe_csrf']) {
    const found = cookies.find((c) => c.startsWith(`${name}=`));
    if (found) return decodeURIComponent(found.slice(name.length + 1));
  }
  return '';
}

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Mensagem para o usuário conforme o status (SPEC-11 §3). */
export function userMessage(err: unknown): string {
  if (!(err instanceof ApiError))
    return 'Não conseguimos falar com o servidor. Confira sua internet e tente de novo.';
  if (err.status === 429)
    return 'Muitas tentativas em pouco tempo. Espere um pouco e tente de novo.';
  if (err.status >= 500)
    return `Algo deu errado do nosso lado (código ${err.body.requestId}). Tente de novo em alguns minutos.`;
  return err.message;
}

/** fetch para /api/v1 com cookie de sessão, CSRF e erros padronizados. */
export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const method = init.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (UNSAFE.has(method)) headers['X-SAFE-CSRF'] = csrfToken();

  const res = await fetch(`/api/v1${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (res.ok) return data as T;

  const body = (data as { error?: ApiErrorBody } | null)?.error ?? {
    code: 'INTERNAL_ERROR',
    message: 'Algo deu errado.',
    requestId: '—',
  };
  const error = new ApiError(res.status, body);
  if (res.status === 401 && !path.startsWith('/auth/me')) handleSessionEnd('expired');
  if (
    res.status === 403 &&
    body.code === 'TERMS_REQUIRED' &&
    window.location.pathname !== '/termos'
  ) {
    window.location.replace('/termos');
  }
  throw error;
}
