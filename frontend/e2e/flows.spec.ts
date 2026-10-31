import { expect, test } from '@playwright/test';
import { apiCall, loginApi, readyUser, typeMoney, uniqueEmail } from './helpers';

test('1 – primeiro acesso: login → termos → aviso de cookies → painel vazio com checklist', async ({
  page,
}) => {
  await page.goto('/login');
  await expect(page.getByRole('link', { name: 'Entrar com Google' })).toBeVisible();
  await expect(page.getByRole('button', { name: /pessoa de teste/ })).toBeVisible();
  await loginApi(page, uniqueEmail('primeiro'));
  await page.goto('/');
  await expect(page).toHaveURL(/\/termos$/);
  const cont = page.getByRole('button', { name: 'Continuar' });
  await expect(cont).toBeDisabled();
  await page.getByRole('checkbox', { name: /Li e aceito os Termos/ }).check();
  await page.getByRole('checkbox', { name: /Li a Política/ }).check();
  await expect(cont).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Declaro ter 18 anos ou mais' }).check();
  await expect(page.getByRole('checkbox', { name: /opcional/ })).not.toBeChecked();
  await cont.click();
  await expect(page.getByRole('heading', { name: 'Seu orçamento hoje' })).toBeVisible();
  const cookies = page.getByRole('region', { name: 'Aviso de cookies' });
  await expect(cookies).toBeVisible();
  await cookies.getByRole('button', { name: 'Entendi' }).click();
  await expect(cookies).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Vamos começar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Como o SAFE funciona' })).toBeVisible();
});

test('2 – cadastro do caso do artigo pela tela → painel mostra 0,19 "Baixo risco"', async ({
  page,
}) => {
  await readyUser(page, 'cadastro');
  await page.goto('/orcamento?aba=incomes');
  await page.getByRole('button', { name: 'Adicionar renda' }).click();
  await typeMoney(page, /Quanto você recebe por mês/, '4000,00');
  await page.getByRole('button', { name: 'Salvar renda' }).click();
  await expect(page.getByText('R$ 4.000,00 por mês')).toBeVisible();

  await page.getByRole('tab', { name: 'Despesas' }).click();
  await page.getByRole('button', { name: 'Adicionar despesa' }).click();
  await page.getByLabel(/Tipo de despesa/).selectOption('FIXA');
  await page.getByLabel('Categoria').selectOption('MORADIA');
  await typeMoney(page, 'Valor por mês', '2000,00');
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await expect(page.getByText(/R\$ 2\.000,00 por mês/)).toBeVisible();

  await page.getByRole('tab', { name: 'Dívidas' }).click();
  await page.getByRole('button', { name: 'Adicionar dívida' }).click();
  await page.getByLabel('Tipo de dívida').selectOption('CREDIARIO');
  await typeMoney(page, /Valor de cada/, '400,00');
  await page.getByLabel('Parcelas que ainda faltam pagar').fill('10');
  await typeMoney(page, /Quanto falta pagar no total/, '6000,00');
  await page.getByRole('button', { name: 'Salvar dívida' }).click();
  await expect(page.getByText(/faltam 10 parcela/)).toBeVisible();

  await page.getByRole('tab', { name: 'Reserva' }).click();
  await page.getByRole('button', { name: 'Adicionar reserva' }).click();
  await typeMoney(page, /Quanto você tem guardado/, '6000,00');
  await page.getByRole('button', { name: 'Salvar reserva' }).click();
  await expect(page.getByText('R$ 6.000,00', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Início' }).click();
  await expect(page.locator('.big').first()).toHaveText('0,19');
  await expect(page.getByText('Baixo risco').first()).toBeVisible();
  // HU09 critério 6: comprometimento de 10% com cor, ícone e rótulo.
  await expect(page.locator('.risk.risk-1', { hasText: 'Confortável' })).toBeVisible();
});

test('3 – simulação 6000 / 12 / 600 → 0,38 "Risco moderado", CR e CP principais; orçamento inalterado', async ({
  page,
}) => {
  await readyUser(page, 'simula', { seed: true });
  const before = await (await page.request.get('/api/v1/budget/summary')).json();
  await page.goto('/simular');
  await typeMoney(page, 'Valor da compra à vista', '6000,00');
  await page.getByLabel('Número de parcelas').fill('12');
  await typeMoney(page, /Valor de cada/, '600,00');
  await page.getByRole('button', { name: 'Simular compra' }).click();
  await expect(page.getByText('Risco moderado')).toBeVisible();
  await expect(page.locator('.big').nth(1)).toHaveText('0,38');
  await expect(
    page.getByText(
      /Esta compra elevaria o comprometimento da sua renda com dívidas de 10,0% para 25,0%/,
    ),
  ).toBeVisible();
  await expect(page.getByText(/91,9% do aumento do risco/)).toBeVisible();
  const mainRows = page.locator('tr', { has: page.locator('.badge', { hasText: 'principal' }) });
  await expect(mainRows).toHaveCount(2);
  await expect(page.getByText(/R\$ 1\.200,00/)).toBeVisible();
  expect(await (await page.request.get('/api/v1/budget/summary')).json()).toEqual(before);
});

test('4 – simulação que zera a folga → banner crítico', async ({ page }) => {
  await readyUser(page, 'critico', { seed: true });
  await page.goto('/simular');
  await typeMoney(page, 'Valor da compra à vista', '20000,00');
  await page.getByLabel('Número de parcelas').fill('10');
  await typeMoney(page, /Valor de cada/, '2000,00');
  await page.getByRole('button', { name: 'Simular compra' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Atenção' })).toContainText(
    'sua renda não cobre',
  );
});

test('5 – projeção mostra 12 meses; editar a dívida atualiza', async ({ page }) => {
  await readyUser(page, 'projecao', { seed: true });
  await page.goto('/projecao');
  await expect(page.getByRole('heading', { name: /dos próximos 12 meses/ })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(12);
  await expect(page.locator('tbody tr').first()).toContainText('R$ 1.600,00');
  await page.goto('/orcamento?aba=debts');
  await page.getByRole('button', { name: /^Editar/ }).click();
  await typeMoney(page, /Valor de cada/, '600,00');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await page.getByRole('link', { name: 'Projeção' }).click();
  await expect(page.locator('tbody tr').first()).toContainText('R$ 1.400,00');
});

test('6 – evolução mostra pelo menos 1 ponto', async ({ page }) => {
  await readyUser(page, 'evolucao', { seed: true });
  await page.goto('/evolucao');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(
    page.getByText('Ainda não há dados suficientes para mostrar uma tendência.'),
  ).toBeVisible();
});

test('7 – logout: voltar não mostra dados e a outra aba também sai', async ({ page, context }) => {
  await readyUser(page, 'logout', { seed: true });
  await page.goto('/');
  await expect(page.locator('.big').first()).toHaveText('0,19');
  const other = await context.newPage();
  await other.goto('/orcamento');
  await expect(other.getByRole('heading', { name: 'Meu orçamento' })).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login\?motivo=logout/);
  await expect(other).toHaveURL(/\/login/);
  await page.goBack();
  await expect(page.getByText('0,19')).toHaveCount(0);
  const stored = await page.evaluate(() => ({
    ls: Object.keys(localStorage),
    ss: sessionStorage.length,
  }));
  expect(
    stored.ls.every((k) => ['theme', 'safe_cookie_notice', 'safe_onboarding_done'].includes(k)),
  ).toBe(true);
  expect(stored.ss).toBe(0);
});

test('8 – exportar dados baixa um JSON com a renda cadastrada', async ({ page }) => {
  await readyUser(page, 'exporta', { seed: true });
  await page.goto('/conta');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: /Baixar meus dados/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^safe-meus-dados-\d{4}-\d{2}-\d{2}\.json$/);
  const text = await (
    await download.createReadStream()
  )
    .toArray()
    .then((c) => Buffer.concat(c).toString('utf8'));
  expect(JSON.parse(text).incomes[0].monthValue).toBe('4000.00');
});

test('9 – excluir conta → confirmação; novo login cria conta vazia', async ({ page }) => {
  const email = uniqueEmail('exclui');
  await page.goto('/login');
  await page.evaluate(() => localStorage.setItem('safe_cookie_notice', '1'));
  await loginApi(page, email);
  await apiCall(page, 'POST', '/terms/accept', {
    termsVersion: '1.0',
    privacyVersion: '1.0',
    acceptTerms: true,
    acknowledgePrivacy: true,
    ageConfirmed: true,
  });
  await apiCall(page, 'POST', '/incomes', { monthValue: '1000.00' });
  await page.goto('/conta');
  await page.getByRole('button', { name: 'Quero excluir minha conta' }).click();
  const confirm = page.getByRole('button', { name: 'Excluir minha conta para sempre' });
  await expect(confirm).toBeDisabled();
  await page.getByLabel('Para confirmar, digite EXCLUIR').fill('EXCLUIR');
  await confirm.click();
  await expect(page).toHaveURL(/\/conta-excluida/);
  await expect(page.getByText('Sua conta e seus dados foram excluídos.')).toBeVisible();
  await loginApi(page, email);
  const me = await (await page.request.get('/api/v1/auth/me')).json();
  expect(me.termsUpToDate).toBe(false);
});

test.describe('10 – celular (375 px)', () => {
  test.use({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true });

  test('painel e simulação utilizáveis, sem rolagem horizontal', async ({ page }) => {
    await readyUser(page, 'celular', { seed: true });
    await page.goto('/');
    await expect(page.locator('.big').first()).toHaveText('0,19');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow).toBe(false);
    await page.getByRole('link', { name: 'Simular', exact: true }).click();
    await typeMoney(page, 'Valor da compra à vista', '6000,00');
    await page.getByLabel('Número de parcelas').fill('12');
    await typeMoney(page, /Valor de cada/, '600,00');
    await page.getByRole('button', { name: 'Simular compra' }).click();
    await expect(page.getByText('Risco moderado')).toBeVisible();
    await page
      .getByRole('button', { name: /Comprometimento da renda/ })
      .first()
      .tap();
    await expect(page.getByRole('tooltip')).toBeVisible();
  });
});
