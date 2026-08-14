import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api.js'
import { deleteEstancia } from './estanciaService.js'

vi.mock('./api.js', () => ({
  api: {
    delete: vi.fn(),
  },
}))

describe('deleteEstancia', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes without confirmation on the first attempt', () => {
    deleteEstancia(12)

    expect(api.delete).toHaveBeenCalledWith('/estancia/12', undefined)
  })

  it('sends confirm=true after the user accepts the associated data deletion', () => {
    deleteEstancia(12, { confirm: true })

    expect(api.delete).toHaveBeenCalledWith('/estancia/12', { confirm: 'true' })
  })
})
