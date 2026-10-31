import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { HelpProvider } from './components/HelpPanel';
import { applyTheme } from './components/Layout';
import { queryClient } from './lib/queryClient';
import { listenForSessionEnd } from './lib/session';
import { getPref } from './lib/storage';
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './styles.css';

applyTheme(getPref('theme'));
listenForSessionEnd();

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <HelpProvider>
          <App />
        </HelpProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
