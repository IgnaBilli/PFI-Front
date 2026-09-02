import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchEstanciaAnaliticas, fetchTrasladoAnaliticas } from '../services/analyticsService.js'
import useEstanciaAnaliticas from './useEstanciaAnaliticas.js'

vi.mock('../services/analyticsService.js', () => ({
  fetchEstanciaAnaliticas: vi.fn(),
  fetchTrasladoAnaliticas: vi.fn(),
}))

describe('useEstanciaAnaliticas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps successful analytics when another request fails and exposes the source error', async () => {
    const failure = new Error('traslados failed')
    const analytics = { distribucionCargaAnimal: [] }
    fetchEstanciaAnaliticas.mockResolvedValue(analytics)
    fetchTrasladoAnaliticas.mockRejectedValue(failure)

    const { result } = renderHook(() => useEstanciaAnaliticas(4))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.analiticas).toBe(analytics)
    expect(result.current.traslados).toBeNull()
    expect(result.current.error).toBe(failure)
    expect(result.current.errors).toEqual({ traslados: failure })
  })
})
