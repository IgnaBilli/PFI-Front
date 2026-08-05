import { api } from './api.js'

export function fetchCattle(estanciaId) {
  return api.get(`/estancia/${estanciaId}/ganado`)
}

export function createCattleForEstancia(estanciaId, payload) {
  return api.post(`/estancia/${estanciaId}/ganado`, payload)
}

export function createCattleForPaddock(paddockId, payload) {
  return api.post(`/potrero/${paddockId}/ganado`, payload)
}

export function updateCattle(id, patch) {
  return api.patch(`/ganado/${id}`, patch)
}

export function deleteCattle(id) {
  return api.delete(`/ganado/${id}`)
}

export function bulkDeleteCattle(ids) {
  return api.post('/ganado/baja', { id_ganado: ids })
}

export function bulkUpdateCategory(items) {
  return api.patch('/ganado', { ganado: items })
}

export function assignCattle({ id_potrero, id_ganado }) {
  return api.post('/asignacion-ganado', { id_potrero, id_ganado })
}

export function relocateCattle(origenPaddockId, { id_potrero_destino, id_ganado, fecha_movimiento }) {
  return api.post(`/potrero/${origenPaddockId}/traslado-ganado`, {
    id_potrero_destino,
    id_ganado,
    fecha_movimiento,
  })
}
