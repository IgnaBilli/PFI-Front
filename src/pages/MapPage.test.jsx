import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../services/api.js'
import { deleteEstancia } from '../services/estanciaService.js'
import MapPage from './MapPage.jsx'

const refreshEstancia = vi.fn()
const hookState = vi.hoisted(() => ({
  paddocks: [],
  paddocksLoading: false,
  paddocksError: '',
  cattle: [],
  cattleLoading: false,
  cattleError: '',
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    estanciaId: 12,
    estancia: {
      id_estancia: 12,
      nombre: 'La Esperanza',
      geom: {
        type: 'Polygon',
        coordinates: [[[-64.2, -31.4], [-64.1, -31.4], [-64.1, -31.3], [-64.2, -31.4]]],
      },
    },
    refreshEstancia,
  }),
}))

vi.mock('../hooks/usePaddocks.js', () => ({
  default: () => ({
    paddocks: hookState.paddocks,
    loading: hookState.paddocksLoading,
    error: hookState.paddocksError,
    reload: vi.fn(),
  }),
}))

vi.mock('../hooks/useCattle.js', () => ({
  default: () => ({
    cattle: hookState.cattle,
    loading: hookState.cattleLoading,
    error: hookState.cattleError,
    reload: vi.fn(),
  }),
}))

vi.mock('../hooks/usePlaceSearch.js', () => ({
  default: () => ({ selectedPlace: null }),
}))

vi.mock('../services/estanciaService.js', () => ({
  deleteEstancia: vi.fn(),
  updateEstancia: vi.fn(),
}))

vi.mock('../components/PolygonMapCanvas.jsx', () => ({
  default: ({ onPolygonClick }) => (
    <div data-testid="polygon-map-canvas">
      {onPolygonClick && <button onClick={() => onPolygonClick(7)}>Seleccionar polígono</button>}
    </div>
  ),
}))

vi.mock('../components/PlaceSearchBar.jsx', () => ({
  default: () => <div data-testid="place-search-bar" />,
}))

vi.mock('../components/AddCattleModal.jsx', () => ({
  default: () => null,
}))

describe('MapPage estancia deletion', () => {
  it('offers draw and boundary edit directly and keeps estancia tools open', async () => {
    const user = userEvent.setup();
    render(<MapPage />);
    expect(screen.getByRole('button', { name: 'Dibujar potrero' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar límite' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver estancia' }));
    expect(screen.getByRole('button', { name: /Abrir panel de potreros/ })).toHaveAttribute('aria-expanded', 'true');
  });
  beforeEach(() => {
    vi.clearAllMocks()
    hookState.paddocks = []
    hookState.paddocksLoading = false
    hookState.paddocksError = ''
    hookState.cattle = []
    hookState.cattleLoading = false
    hookState.cattleError = ''
  })

  async function openDeleteDialog(user) {
    render(<MapPage />)
    await user.click(screen.getByRole('button', { name: 'Ver estancia' }))
    await user.click(screen.getAllByRole('button', { name: 'Eliminar estancia' })[0])
  }

  it('asks for confirmation before deleting an empty estancia', async () => {
    const user = userEvent.setup()
    deleteEstancia.mockResolvedValue({ deleted: true })
    await openDeleteDialog(user)

    expect(screen.getByText('¿Querés eliminar La Esperanza? Esta acción no se puede deshacer.')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Eliminar estancia' })[0])

    await waitFor(() => {
      expect(deleteEstancia).toHaveBeenCalledWith(12, { confirm: false })
      expect(refreshEstancia).toHaveBeenCalledOnce()
    })
  })

  it('shows affected counts and requires a second confirmation after a 409', async () => {
    const user = userEvent.setup()
    deleteEstancia
      .mockRejectedValueOnce(new ApiError('Requiere confirmación', 409, {
        requiresConfirmation: true,
        potrerosAfectados: 2,
        ganadoAfectado: 7,
      }))
      .mockResolvedValueOnce({ deleted: true })
    await openDeleteDialog(user)

    await user.click(screen.getAllByRole('button', { name: 'Eliminar estancia' })[0])

    expect(await screen.findByText('La estancia tiene datos asociados')).toBeInTheDocument()
    expect(screen.getByText(/2 potreros y 7 animales/)).toBeInTheDocument()
    expect(refreshEstancia).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Eliminar todo' }))

    await waitFor(() => {
      expect(deleteEstancia).toHaveBeenNthCalledWith(2, 12, { confirm: true })
      expect(refreshEstancia).toHaveBeenCalledOnce()
    })
  })

  it('opens the selected paddock action panel from a map polygon', async () => {
    const user = userEvent.setup()
    hookState.paddocks = [{
      id: 7,
      name: 'Potrero Norte',
      hectares: 12,
      coordinates: [
        { latitude: -31.4, longitude: -64.2 },
        { latitude: -31.4, longitude: -64.1 },
        { latitude: -31.3, longitude: -64.1 },
      ],
    }]

    render(<MapPage />)
    await user.click(screen.getByRole('button', { name: 'Seleccionar polígono' }))

    expect(screen.getByRole('heading', { name: 'Potrero Norte' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cerrar acciones de Potrero Norte/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar límites de Potrero Norte' })).toBeInTheDocument()
  })

  it('exposes hook errors and disables actions that depend on incomplete data', async () => {
    const user = userEvent.setup()
    hookState.paddocksError = 'No se pudieron cargar los potreros.'
    hookState.cattleError = 'No se pudo cargar el ganado.'

    render(<MapPage />)

    expect(screen.getByText(/Potreros: No se pudieron cargar los potreros/)).toBeInTheDocument()
    expect(screen.getByText(/Ganado: No se pudo cargar el ganado/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ver estancia' }))
    expect(screen.getByRole('button', { name: 'Dibujar potrero' })).toBeDisabled()
  })
})
