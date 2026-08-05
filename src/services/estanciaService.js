import { api } from './api.js'

export function getEstancia() {
  return api.get('/estancia')
}

export function createEstancia({ nombre, geom }) {
  return api.post('/estancia', { nombre, geom })
}
