import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout.jsx';
import { RequireAuth, RequireEstancia, RequireNoEstancia } from './components/RouteGuards.jsx';

const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const MapPage = lazy(() => import('./pages/MapPage.jsx'));
const SummaryPage = lazy(() => import('./pages/SummaryPage.jsx'));
const CattlePage = lazy(() => import('./pages/CattlePage.jsx'));
const PaddocksPage = lazy(() => import('./pages/PaddocksPage.jsx'));
const PaddockDetailPage = lazy(() => import('./pages/PaddockDetailPage.jsx'));
const IntrapaddockPage = lazy(() => import('./pages/IntrapaddockPage.jsx'));
const TrasladoPage = lazy(() => import('./pages/TrasladoPage.jsx'));
const OnboardingEstanciaPage = lazy(() => import('./pages/OnboardingEstanciaPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

function RouteFallback() {
  return (
    <div className="app-page" role="status" aria-live="polite">
      <div className="app-skeleton h-8 w-52 rounded-lg" aria-hidden="true" />
      <div className="app-skeleton mt-6 h-56 rounded-[var(--radius-lg)]" aria-hidden="true" />
      <span className="sr-only">Cargando pantalla...</span>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/registro" element={<AuthPage mode="register" />} />
      <Route
        path="/onboarding/estancia"
        element={
          <RequireAuth>
            <RequireNoEstancia>
              <OnboardingEstanciaPage />
            </RequireNoEstancia>
          </RequireAuth>
        }
      />
      <Route element={<RequireEstancia />}>
        <Route element={<DashboardLayout />}>
          <Route path="/resumen" element={<SummaryPage />} />
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/potreros" element={<PaddocksPage />} />
          <Route path="/potreros/:paddockId" element={<PaddockDetailPage />} />
          <Route path="/potreros/:paddockId/intrapotrero" element={<IntrapaddockPage />} />
          <Route path="/ganado" element={<CattlePage />} />
          <Route path="/traslado" element={<TrasladoPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
