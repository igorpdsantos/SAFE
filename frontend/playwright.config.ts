import { defineConfig, devices } from '@playwright/test';

// E2E (SPEC-13 §4) contra o Vite + API em modo de teste (login de teste habilitado).
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure', locale: 'pt-BR' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev:demo --prefix ..',
    url: 'http://localhost:5173/api/v1/health',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
