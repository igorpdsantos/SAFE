import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Mesma origem em desenvolvimento: /api vai para a API por proxy, sem CORS (SPEC-01 §4.5).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },
  build: { sourcemap: false },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
});
