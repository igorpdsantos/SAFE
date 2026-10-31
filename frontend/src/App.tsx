import { ArrowLeft } from 'lucide-react';
import { lazy, Suspense, type ReactNode } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ApiError } from './api/client';
import { useMe } from './api/hooks';
import { Layout } from './components/Layout';
import { LoadError, Loading } from './components/States';
import { Login } from './pages/Login';

const Terms = lazy(() => import('./pages/Terms').then((m) => ({ default: m.Terms })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Budget = lazy(() => import('./pages/Budget').then((m) => ({ default: m.Budget })));
const Simulate = lazy(() => import('./pages/Simulate').then((m) => ({ default: m.Simulate })));
const ProjectionPage = lazy(() =>
  import('./pages/ProjectionPage').then((m) => ({ default: m.ProjectionPage })),
);
const Evolution = lazy(() => import('./pages/Evolution').then((m) => ({ default: m.Evolution })));
const Account = lazy(() => import('./pages/Account').then((m) => ({ default: m.Account })));
const AccountDeleted = lazy(() =>
  import('./pages/AccountDeleted').then((m) => ({ default: m.AccountDeleted })),
);
const Understand = lazy(() =>
  import('./pages/Understand').then((m) => ({ default: m.Understand })),
);
const Glossary = lazy(() => import('./pages/Glossary').then((m) => ({ default: m.Glossary })));
const LegalPage = lazy(() => import('./pages/Legal').then((m) => ({ default: m.LegalPage })));

/** Guarda de rota: sem sessão → /login; termos fora de dia → /termos (SPEC-11 §2). */
function Guard({ children, needsTerms }: { children: ReactNode; needsTerms: boolean }) {
  const me = useMe();
  const location = useLocation();
  if (me.isLoading) return <Loading />;
  if (me.error instanceof ApiError && me.error.status === 401)
    return <Navigate to="/login" replace />;
  if (me.isError || !me.data) return <LoadError error={me.error} />;
  if (needsTerms && !me.data.termsUpToDate && location.pathname !== '/termos') {
    return <Navigate to="/termos" replace />;
  }
  return <>{children}</>;
}

/**
 * Páginas abertas a todos (glossário, termos, política): dentro do app, com o menu, quando há
 * sessão; sozinhas, com "Voltar" para o login, quando não há.
 */
function PublicPage() {
  const me = useMe();
  if (me.isLoading) return <Loading />;
  if (me.data) return <Layout />;
  return (
    <div className="doc-page stack">
      <Link className="back-link" to="/login">
        <ArrowLeft size={18} aria-hidden="true" /> Voltar
      </Link>
      <Outlet />
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<PublicPage />}>
          <Route path="/glossario" element={<Glossary />} />
          <Route path="/privacidade" element={<LegalPage doc="privacidade" />} />
          <Route path="/termos-de-uso" element={<LegalPage doc="termos" />} />
        </Route>
        <Route path="/conta-excluida" element={<AccountDeleted />} />
        <Route
          path="/termos"
          element={
            <Guard needsTerms={false}>
              <Terms />
            </Guard>
          }
        />
        <Route
          element={
            <Guard needsTerms={false}>
              <Layout />
            </Guard>
          }
        >
          <Route path="/conta" element={<Account />} />
          <Route path="/entenda" element={<Understand />} />
        </Route>
        <Route
          element={
            <Guard needsTerms>
              <Layout />
            </Guard>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/orcamento" element={<Budget />} />
          <Route path="/simular" element={<Simulate />} />
          <Route path="/projecao" element={<ProjectionPage />} />
          <Route path="/evolucao" element={<Evolution />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
