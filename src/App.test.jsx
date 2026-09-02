import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

vi.mock('./context/AuthContext.jsx', () => ({
  useAuth: () => ({
    token: 'authenticated-token',
    estanciaStatus: 'ready',
    estancia: { nombre: 'La Esperanza' },
    logout: vi.fn(),
  }),
}));

vi.mock('./pages/AuthPage.jsx', () => ({ default: () => <div>Auth page</div> }));
vi.mock('./pages/MapPage.jsx', () => ({ default: () => <div>Map page</div> }));
vi.mock('./pages/SummaryPage.jsx', () => ({ default: () => <div>Summary page</div> }));
vi.mock('./pages/CattlePage.jsx', () => ({ default: () => <div>Cattle page</div> }));
vi.mock('./pages/PaddocksPage.jsx', () => ({ default: () => <div>Paddocks page</div> }));
vi.mock('./pages/PaddockDetailPage.jsx', () => ({ default: () => <div>Paddock detail page</div> }));
vi.mock('./pages/TrasladoPage.jsx', () => ({ default: () => <div>Transfer page</div> }));
vi.mock('./pages/OnboardingEstanciaPage.jsx', () => ({ default: () => <div>Onboarding page</div> }));

describe('App routing', () => {
  it('renders authenticated unknown routes as a 404 inside the application shell', async () => {
    render(
      <MemoryRouter initialEntries={['/ruta-inexistente']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Este lugar no está en el mapa' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Navegación principal' })).toBeInTheDocument();
    expect(screen.queryByText('Auth page')).not.toBeInTheDocument();
  });
});
