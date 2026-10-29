import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'backend/src/generated/**',
      'frontend/playwright-report/**',
      'frontend/test-results/**',
      'docs/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  // Scripts de linha de comando imprimem no terminal.
  {
    files: ['scripts/**', 'evaluation/**', 'backend/scripts/**'],
    rules: { 'no-console': 'off' },
  },
  // Motor puro (SPEC-05 §7): sem infraestrutura e sem relógio.
  {
    files: ['backend/src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@prisma/*',
                'express',
                'ioredis',
                'pino',
                'node:*',
                '**/lib/*',
                '**/repositories/*',
                '**/modules/*',
                '**/http/*',
                '**/config/*',
                '**/generated/*',
              ],
              message: 'O motor é puro: não importa infraestrutura (SPEC-05 §7).',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'O motor não lê o relógio: a data vem no snapshot.',
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'O motor não lê o relógio: a data vem no snapshot.',
        },
      ],
    },
  },
  {
    files: ['frontend/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // SEGURANCA_LGPD §5.2: armazenamento do navegador só via lib/storage.ts.
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Use lib/storage.ts (lista fechada de chaves).' },
        { name: 'sessionStorage', message: 'Proibido (SEGURANCA_LGPD §5.2).' },
        { name: 'indexedDB', message: 'Proibido (SEGURANCA_LGPD §5.2).' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'localStorage', message: 'Use lib/storage.ts.' },
        { object: 'window', property: 'sessionStorage', message: 'Proibido.' },
        { object: 'window', property: 'indexedDB', message: 'Proibido.' },
      ],
    },
  },
  {
    // Os testes E2E inspecionam o armazenamento para provar que ele está limpo.
    files: ['frontend/src/lib/storage.ts', 'frontend/src/lib/storage.test.ts', 'frontend/e2e/**'],
    rules: { 'no-restricted-globals': 'off', 'no-restricted-properties': 'off' },
  },
);
