const DEFAULT_API_URL = 'https://backendterrabovina-production.up.railway.app/api/v2'

export const API_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL

const TOKEN_KEY = 'terrabovina-token'
const USER_KEY = 'terrabovina-user'

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSession(token, user) {
  if (typeof token !== 'string' || token.trim() === '') {
    throw new TypeError('No se puede iniciar una sesión sin un token válido.')
  }
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(USER_KEY, JSON.stringify(user ?? null))
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

function buildUrl(path, params) {
  const url = new URL(API_BASE_URL.replace(/\/$/, '') + path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    })
  }
  return url.toString()
}

async function request(path, { method = 'GET', body, params, skipAuth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token && !skipAuth) {
    headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor.', 0, null)
  }

  if (response.status === 401 && !skipAuth) {
    clearSession()
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login')
    }
    throw new ApiError('Tu sesión expiró. Iniciá sesión nuevamente.', 401, null)
  }

  if (response.status === 204) return null

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `Error ${response.status}`
    throw new ApiError(message, response.status, data)
  }

  return data
}

export const api = {
  get: (path, params) => request(path, { method: 'GET', params }),
  post: (path, body, opts = {}) => request(path, { method: 'POST', body, ...opts }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path, params) => request(path, { method: 'DELETE', params }),
}
