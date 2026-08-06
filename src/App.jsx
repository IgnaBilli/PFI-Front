import { Navigate, Route, Routes } from 'react-router-dom';
import AuthPage from './pages/AuthPage.jsx';
import MapPage from './pages/MapPage.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';
import SummaryPage from './pages/SummaryPage.jsx';
import CattlePage from './pages/CattlePage.jsx';
import PaddocksPage from './pages/PaddocksPage.jsx';
import PaddockDetailPage from './pages/PaddockDetailPage.jsx';
import TrasladoPage from './pages/TrasladoPage.jsx';
import OnboardingEstanciaPage from './pages/OnboardingEstanciaPage.jsx';
import { RequireAuth, RequireEstancia, RequireNoEstancia } from './components/RouteGuards.jsx';

export default function App() {
  return (
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
          <Route path="/ganado" element={<CattlePage />} />
          <Route path="/traslado" element={<TrasladoPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
