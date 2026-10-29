import { expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

let n = 0;
export const uniqueEmail = (tag: string) => `e2e-${tag}-${Date.now()}-${n++}@exemplo.com`;

/** Login pela rota de teste (só existe com NODE_ENV=test); os cookies ficam no contexto do navegador. */
export async function loginApi(page: Page, email: string) {
  const res = await page.request.post('/api/v1/test/login', { data: { email } });
  expect(res.ok()).toBeTruthy();
}

async function csrf(context: BrowserContext): Promise<string> {
  const c = (await context.cookies()).find((x) => x.name.endsWith('safe_csrf'));
  return c?.value ?? '';
}

/** Chamada à API com CSRF e Origin, como o frontend faz. */
export async function apiCall(
  page: Page,
  method: 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: unknown,
) {
  const request: APIRequestContext = page.request;
  const res = await request.fetch(`/api/v1${url}`, {
    method,
    data,
    headers: { 'X-SAFE-CSRF': await csrf(page.context()), Origin: 'http://localhost:5173' },
  });
  expect(res.ok(), `${method} ${url} → ${res.status()}`).toBeTruthy();
  return res;
}

export async function acceptTermsApi(page: Page) {
  await apiCall(page, 'POST', '/terms/accept', {
    termsVersion: '1.0',
    privacyVersion: '1.0',
    acceptTerms: true,
    acknowledgePrivacy: true,
    ageConfirmed: true,
  });
}

/** Caso do artigo pela API: renda 4000, despesas 2000, dívida 400×10 com saldo 6000, reserva 6000. */
export async function seedArticleApi(page: Page) {
  await apiCall(page, 'POST', '/incomes', { monthValue: '4000.00' });
  await apiCall(page, 'POST', '/expenses', { category: 'MORADIA', type: 'FIXA', value: '2000.00' });
  await apiCall(page, 'POST', '/debts', {
    category: 'CREDIARIO',
    installmentValue: '400.00',
    remainingInstallments: 10,
    balanceDue: '6000.00',
  });
  await apiCall(page, 'POST', '/reserves', { value: '6000.00' });
}

/** Usuário pronto: logado, termos aceitos, avisos de primeiro acesso já fechados. */
export async function readyUser(page: Page, tag: string, opts: { seed?: boolean } = {}) {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('safe_cookie_notice', '1');
    localStorage.setItem('safe_onboarding_done', '1');
  });
  await loginApi(page, uniqueEmail(tag));
  await acceptTermsApi(page);
  if (opts.seed) await seedArticleApi(page);
}

/** Digita dinheiro no MoneyInput (a máscara trabalha em centavos). */
export async function typeMoney(page: Page, label: string | RegExp, reais: string) {
  const input = page.getByLabel(label);
  await input.fill('');
  await input.pressSequentially(reais.replace(/\D/g, ''));
}
