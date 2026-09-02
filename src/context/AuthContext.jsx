import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authService from '../services/authService.js'
import * as estanciaService from '../services/estanciaService.js'
import { ApiError, clearSession, getStoredUser, getToken, setSession } from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getToken)
  const [user, setUser] = useState(getStoredUser)
  const [estancia, setEstancia] = useState(null)
  const [estanciaStatus, setEstanciaStatus] = useState('idle') // idle | loading | ready | none | error

  const refreshEstancia = useCallback(async () => {
    setEstanciaStatus('loading')
    try {
      const data = await estanciaService.getEstancia()
      setEstancia(data)
      setEstanciaStatus('ready')
      return data
    } catch (err) {
      // Solo un 404 confirmado significa "todavía no creó una estancia".
      // Cualquier otro error (red, CORS, 500) es indeterminado: no hay que
      // mandar a un usuario ya onboardeado a /onboarding/estancia solo
      // porque el pedido falló.
      if (err instanceof ApiError && err.status === 404) {
        setEstancia(null)
        setEstanciaStatus('none')
        return null
      }
      setEstanciaStatus('error')
      throw err
    }
  }, [])

  useEffect(() => {
    if (token) {
      refreshEstancia().catch(() => {})
    } else {
      setEstanciaStatus('none')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password)
    const nextToken = data?.token ?? data?.accessToken ?? data?.jwt
    const nextUser = data?.user ?? data?.usuario ?? { email }
    setSession(nextToken, nextUser)
    setToken(nextToken)
    setUser(nextUser)
    const estanciaData = await refreshEstancia()
    return { hasEstancia: Boolean(estanciaData) }
  }, [refreshEstancia])

  const register = useCallback((nombre, email, password) => {
    return authService.register(nombre, email, password)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setToken(null)
    setUser(null)
    setEstancia(null)
    setEstanciaStatus('none')
  }, [])

  const value = useMemo(
    () => ({
      token,
      user,
      estancia,
      estanciaId: estancia?.id_estancia ?? null,
      estanciaStatus,
      login,
      register,
      logout,
      refreshEstancia,
    }),
    [token, user, estancia, estanciaStatus, login, register, logout, refreshEstancia]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
