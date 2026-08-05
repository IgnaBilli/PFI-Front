import { api } from './api.js'

export function login(email, password) {
  return api.post('/auth/login', { email, password }, { skipAuth: true })
}

export function register(nombre, email, password) {
  return api.post('/auth/registro', { nombre, email, password }, { skipAuth: true })
}
