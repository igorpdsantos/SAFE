import {
  BookOpen,
  Calculator,
  ChartLine,
  House,
  LogOut,
  Moon,
  Shield,
  Sun,
  TrendingUp,
  UserRound,
  Wallet,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../api/client';
import { handleSessionEnd } from '../lib/session';
import { getPref, setPref } from '../lib/storage';
import { CookieNotice } from './CookieNotice';
import { Disclaimer } from './Disclaimer';

const NAV: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'Início', icon: <House size={20} aria-hidden="true" /> },
  { to: '/orcamento', label: 'Orçamento', icon: <Wallet size={20} aria-hidden="true" /> },
  { to: '/simular', label: 'Simular', icon: <Calculator size={20} aria-hidden="true" /> },
  { to: '/projecao', label: 'Projeção', icon: <ChartLine size={20} aria-hidden="true" /> },
  { to: '/evolucao', label: 'Evolução', icon: <TrendingUp size={20} aria-hidden="true" /> },
  { to: '/conta', label: 'Conta', icon: <UserRound size={20} aria-hidden="true" /> },
];

export function applyTheme(theme: string | null) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
}

async function logout() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } finally {
    handleSessionEnd('logout');
  }
}

/** Menu lateral no desktop e inferior no celular (SPEC-11 §5). */
export function Layout() {
  const [theme, setTheme] = useState(() => getPref('theme') ?? 'light');
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setPref('theme', next);
    applyTheme(next);
    setTheme(next);
  };
  return (
    <div className="app">
      <nav className="sidebar" aria-label="Menu principal">
        <NavLink to="/" className="brand" end>
          <Shield size={22} aria-hidden="true" /> SAFE
        </NavLink>
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-link">
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
        <NavLink to="/glossario" className="nav-link nav-extra">
          <BookOpen size={20} aria-hidden="true" />
          <span>Glossário</span>
        </NavLink>
        <button type="button" className="nav-link nav-extra" onClick={toggleTheme}>
          {theme === 'dark' ? (
            <Sun size={20} aria-hidden="true" />
          ) : (
            <Moon size={20} aria-hidden="true" />
          )}
          <span>{theme === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
        </button>
        <button type="button" className="nav-link" onClick={logout}>
          <LogOut size={20} aria-hidden="true" />
          <span>Sair</span>
        </button>
      </nav>
      <main className="main" id="conteudo">
        <Outlet />
        <footer className="footer stack">
          <Disclaimer />
          <p className="small muted">
            <NavLink to="/glossario">Glossário</NavLink> ·{' '}
            <NavLink to="/privacidade">Política de Privacidade</NavLink> ·{' '}
            <NavLink to="/termos-de-uso">Termos de Uso</NavLink>
          </p>
        </footer>
      </main>
      <CookieNotice />
    </div>
  );
}
