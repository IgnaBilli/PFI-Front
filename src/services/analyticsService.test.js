import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './api.js'
import { fetchLatestForage, fetchLatestNutrition, fetchLatestStock, fetchStockHistory } from './analyticsService.js'

vi.mock('./api.js', async (importOriginal) => {
  const original = await importOriginal()
  return { ...original, api: { ...original.api, get: vi.fn() } }
})

describe('analytics reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('treats a 404 as legitimate no-data', async () => {
    api.get.mockRejectedValue(new ApiError('No encontrado', 404, null))

    await expect(fetchLatestForage(7)).resolves.toBeNull()
  })

  it('treats an empty response wrapper as legitimate no-data', async () => {
    api.get.mockResolvedValue({ estimaciones: [], mensaje: 'Sin datos' })

    await expect(fetchLatestNutrition(7)).resolves.toBeNull()
  })

  it('propagates request failures instead of reporting no-data', async () => {
    const failure = new ApiError('Servidor no disponible', 503, null)
    api.get.mockRejectedValue(failure)

    await expect(fetchLatestForage(7)).rejects.toBe(failure)
  })

  it('lee la última estimación y ordena el histórico de Stock', async () => {
    api.get
      .mockResolvedValueOnce({ stock_final_central_kg_ms_ha: 674 })
      .mockResolvedValueOnce({ estimaciones: [
        { fecha_calculo: '2026-08-05T12:00:00Z', stock_final_central_kg_ms_ha: 674 },
        { fecha_calculo: '2026-07-05T12:00:00Z', stock_final_central_kg_ms_ha: 710 },
      ] })
    await expect(fetchLatestStock(7)).resolves.toMatchObject({ stock_final_central_kg_ms_ha: 674 })
    const history = await fetchStockHistory(7)
    expect(history[0].stock_final_central_kg_ms_ha).toBe(710)
  })
})
