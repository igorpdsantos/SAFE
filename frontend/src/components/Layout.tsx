import {
  BookOpen,
  ChartColumn,
  Calculator,
  ChartLine,
  Ellipsis,
  House,
  LogOut,
  Moon,
  Sun,
  TrendingUp,
  UserRound,
  Wallet,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { handleSessionEnd } from '../lib/session';
import { getPref, setPref } from '../lib/storage';
import { LogoMark } from './Art';
import { CookieNotice } from './CookieNotice';
import { Disclaimer } from './Disclaimer';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const icon = (Icon: typeof House) => <Icon size={20} aria-hidden="true" />;

const MAIN: NavItem[] = [
  { to: '/', label: 'Início', icon: icon(House) },
  { to: '/orcamento', label: 'Orçamento', icon: icon(Wallet) },
  { to: '/simular', label: 'Simular', icon: icon(Calculator) },
  { to: '/projecao', label: 'Projeção', icon: icon(ChartLine) },
  { to: '/evolucao', label: 'Evolução', icon: icon(TrendingUp) },
];
const MORE: NavItem[] = [
  { to: '/conta', label: 'Conta', icon: icon(UserRound) },
  { to: '/entenda', label: 'Entenda os dados', icon: icon(ChartColumn) },
  { to: '/glossario', label: 'Glossário', icon: icon(BookOpen) },
];
/** No celular, a barra inferior mostra só 4 destinos + "Mais" (menos coisa para ler). */
const MOBILE_TABS = MAIN.slice(0, 4);
const MOBILE_MORE = [MAIN[4]!, ...MORE];

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

function Brand({ tagline }: { tagline?: boolean }) {
  return (
    <NavLink to="/" className="brand" end aria-label="SAFE, página inicial">
      <LogoMark />
      <span className="brand-text">
        <span className="brand-name">SAFE</span>
        {tagline && <span className="brand-tag">Decida com calma</span>}
      </span>
    </NavLink>
  );
}

/** Menu lateral no desktop; barra superior e inferior no celular (SPEC-11 §5, RNF10). */
export function Layout() {
  const [theme, setTheme] = useState(() => getPref('theme') ?? 'light');
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setPref('theme', next);
    applyTheme(next);
    setTheme(next);
  };
  const themeLabel = theme === 'dark' ? 'Tema claro' : 'Tema escuro';
  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const inMore = MOBILE_MORE.some((i) => location.pathname.startsWith(i.to));

  return (
    <div className="app">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <nav className="sidebar" aria-label="Menu principal">
        <Brand tagline />
        {MAIN.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-link">
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
        <div className="nav-section">Você</div>
        {MORE.map((item) => (
          <NavLink key={item.to} to={item.to} className="nav-link">
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
        <div className="sidebar-foot">
          <button type="button" className="nav-link" onClick={toggleTheme}>
            <ThemeIcon size={20} aria-hidden="true" />
            <span>{themeLabel}</span>
          </button>
          <button type="button" className="nav-link" onClick={logout}>
            <LogOut size={20} aria-hidden="true" />
            <span>Sair</span>
          </button>
        </div>
      </nav>

      <header className="topbar">
        <Brand />
        <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={themeLabel}>
          <ThemeIcon size={20} aria-hidden="true" />
        </button>
      </header>

      <main className="main" id="conteudo">
        <Outlet />
        <footer className="footer">
          <Disclaimer />
          <p>
            <NavLink to="/glossario">Glossário</NavLink> ·{' '}
            <NavLink to="/privacidade">Política de Privacidade</NavLink> ·{' '}
            <NavLink to="/termos-de-uso">Termos de Uso</NavLink>
          </p>
        </footer>
      </main>

      <nav className="bottombar" aria-label="Menu do celular">
        {MOBILE_TABS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className="tab-link">
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className="tab-link"
          aria-expanded={moreOpen}
          aria-controls="menu-mais"
          aria-current={inMore ? 'page' : undefined}
          onClick={() => setMoreOpen((v) => !v)}
        >
          <Ellipsis size={20} aria-hidden="true" />
          <span>Mais</span>
        </button>
      </nav>
      {moreOpen && (
        <>
          <div className="panel-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="more-sheet" id="menu-mais" role="menu" aria-label="Mais opções">
            {MOBILE_MORE.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="nav-link"
                role="menuitem"
                onClick={() => setMoreOpen(false)}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button type="button" className="nav-link" role="menuitem" onClick={logout}>
              <LogOut size={20} aria-hidden="true" />
              <span>Sair</span>
            </button>
          </div>
        </>
      )}
      <CookieNotice />
    </div>
  );
}
