import { api } from './api.js'

export function previewEstanciaBoundary(geom) {
  return api.post('/estancia/validar-limite', { geom })
}

export function getEstancia() {
  return api.get('/estancia')
}

export function createEstancia({ nombre, geom }) {
  return api.post('/estancia', { nombre, geom })
}

export function updateEstancia(estanciaId, { geom }) {
  return api.patch(`/estancia/${estanciaId}`, { geom })
}

export function deleteEstancia(estanciaId, { confirm = false } = {}) {
  return api.delete(`/estancia/${estanciaId}`, confirm ? { confirm: 'true' } : undefined)
}
