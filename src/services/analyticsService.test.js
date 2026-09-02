import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './api.js'
import { fetchLatestForage, fetchLatestNutrition } from './analyticsService.js'

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
})
