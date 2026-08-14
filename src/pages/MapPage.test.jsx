import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../services/api.js'
import { deleteEstancia } from '../services/estanciaService.js'
import MapPage from './MapPage.jsx'

const refreshEstancia = vi.fn()

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
  default: () => ({ paddocks: [], loading: false, reload: vi.fn() }),
}))

vi.mock('../hooks/useCattle.js', () => ({
  default: () => ({ cattle: [], reload: vi.fn() }),
}))

vi.mock('../hooks/usePlaceSearch.js', () => ({
  default: () => ({ selectedPlace: null }),
}))

vi.mock('../services/estanciaService.js', () => ({
  deleteEstancia: vi.fn(),
  updateEstancia: vi.fn(),
}))

vi.mock('../components/PolygonMapCanvas.jsx', () => ({
  default: () => <div data-testid="polygon-map-canvas" />,
}))

vi.mock('../components/PlaceSearchBar.jsx', () => ({
  default: () => <div data-testid="place-search-bar" />,
}))

vi.mock('../components/AddCattleModal.jsx', () => ({
  default: () => null,
}))

describe('MapPage estancia deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
