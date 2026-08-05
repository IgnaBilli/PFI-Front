import { api } from './api.js'

export function fetchPaddocks(estanciaId) {
  return api.get(`/estancia/${estanciaId}/potrero`)
}

export function createPaddock(estanciaId, payload) {
  return api.post(`/estancia/${estanciaId}/potrero`, payload)
}

export function updatePaddock(paddockId, payload) {
  return api.patch(`/potrero/${paddockId}`, payload)
}

export function deletePaddock(paddockId, { confirm = false } = {}) {
  return api.delete(`/potrero/${paddockId}`, confirm ? { confirm: 'true' } : undefined)
}
