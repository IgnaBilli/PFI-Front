import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import OnboardingEstanciaPage from './OnboardingEstanciaPage.jsx';
import { previewEstanciaBoundary } from '../services/estanciaService.js';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ refreshEstancia: vi.fn(), logout: vi.fn() }),
}));

vi.mock('../services/estanciaService.js', () => ({
  createEstancia: vi.fn(),
  previewEstanciaBoundary: vi.fn().mockResolvedValue({ disponible: true, zonas: [] }),
}));

// PolygonMapCanvas mounts a real Leaflet map, which needs a laid-out DOM
// container jsdom can't provide. The stub exposes the same callback props
// (onMapClick / onVertexDrag) as plain buttons so the page's own vertex
// logic — adding a point, then dragging it, exactly like potreros — can be
// exercised without touching Leaflet.
vi.mock('../components/PolygonMapCanvas.jsx', () => ({
  default: ({ isDrawing, invalid, onMapClick, onVertexDrag }) => (
    <div
      data-testid="polygon-map-canvas"
      data-is-drawing={String(isDrawing)}
      data-invalid={String(invalid)}>
      <button onClick={() => onMapClick(-31.4, -64.2)}>mock-add-vertex</button>
      <button onClick={() => onMapClick(0, 0)}>mock-add-a</button>
      <button onClick={() => onMapClick(1, 1)}>mock-add-b</button>
      <button onClick={() => onMapClick(0, 1)}>mock-add-c</button>
      <button onClick={() => onMapClick(1, 0)}>mock-add-d</button>
      {onVertexDrag && <button onClick={() => onVertexDrag(0, -30, -60)}>mock-drag-vertex-0</button>}
    </div>
  ),
}));

describe('OnboardingEstanciaPage', () => {
  it('shows occupied boundary feedback before saving', async () => {
    previewEstanciaBoundary.mockResolvedValueOnce({ disponible: false, zonas: [] });
    const user = userEvent.setup();
    render(<OnboardingEstanciaPage />);
    await user.type(screen.getByLabelText('1. Nombre de la estancia'), 'Prueba');
    for (const point of ['a', 'b', 'c']) await user.click(screen.getByText(`mock-add-${point}`));
    expect(await screen.findByText(/Tu límite cruza o toca/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear estancia' })).toBeDisabled();
  });

  it('enables save only after a successful boundary preview', async () => {
    const user = userEvent.setup();
    render(<OnboardingEstanciaPage />);
    await user.type(screen.getByLabelText('1. Nombre de la estancia'), 'Prueba');
    for (const point of ['a', 'b', 'c']) await user.click(screen.getByText(`mock-add-${point}`));
    expect(screen.getByRole('button', { name: 'Crear estancia' })).toBeDisabled();
    expect(await screen.findByText(/Sin superposición detectada/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear estancia' })).toBeEnabled();
  });
  it('renders the place search bar so users can locate their estancia', () => {
    render(<OnboardingEstanciaPage />);
    expect(screen.getByPlaceholderText('Buscar localidad o dirección...')).toBeInTheDocument();
  });

  it('still renders the coordinate-drawing panel alongside the search bar', () => {
    render(<OnboardingEstanciaPage />);
    expect(screen.getByText('Creá tu estancia')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Estancia La Esperanza')).toBeInTheDocument();
  });

  it('passes a vertex-drag handler to the map, same as potreros', () => {
    render(<OnboardingEstanciaPage />);
    expect(screen.getByText('mock-drag-vertex-0')).toBeInTheDocument();
  });

  it('lets users drag a placed vertex to correct its position', async () => {
    const user = userEvent.setup();
    render(<OnboardingEstanciaPage />);

    await user.click(screen.getByText('mock-add-vertex'));
    expect(screen.getByDisplayValue('-31.4')).toBeInTheDocument();

    await user.click(screen.getByText('mock-drag-vertex-0'));
    expect(screen.getByDisplayValue('-30')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('-31.4')).not.toBeInTheDocument();
  });

  it('is always in drawing mode, with no start/finish trazado toggle, same as potreros', () => {
    render(<OnboardingEstanciaPage />);
    expect(screen.getByTestId('polygon-map-canvas')).toHaveAttribute('data-is-drawing', 'true');
    expect(screen.queryByText('Iniciar trazado')).not.toBeInTheDocument();
    expect(screen.queryByText('Terminar trazado')).not.toBeInTheDocument();
  });

  it('does not render the manual exact-coordinate form', () => {
    render(<OnboardingEstanciaPage />);
    expect(screen.queryByText('Agregar coordenada exacta')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Latitud')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Longitud')).not.toBeInTheDocument();
  });

  it('uses the shared polygon validation and blocks a self-intersecting boundary', async () => {
    const user = userEvent.setup();
    render(<OnboardingEstanciaPage />);

    await user.type(screen.getByLabelText('1. Nombre de la estancia'), 'La Esperanza');
    await user.click(screen.getByText('mock-add-a'));
    await user.click(screen.getByText('mock-add-b'));
    await user.click(screen.getByText('mock-add-c'));
    await user.click(screen.getByText('mock-add-d'));

    expect(screen.getByTestId('polygon-map-canvas')).toHaveAttribute('data-invalid', 'true');
    expect(screen.getByText(/El polígono se cruza a sí mismo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear estancia' })).toBeDisabled();
  });
});
