import { AlertTriangle, LoaderCircle, RotateCcw } from 'lucide-react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function FullScreenLoader() {
  return (
    <main className="grid h-dvh place-items-center bg-forest-950 text-sand-300">
      <div role="status" className="flex flex-col items-center gap-3">
        <LoaderCircle size={28} className="animate-spin text-brand-400" aria-hidden="true" />
        <span className="text-xs font-semibold">Cargando tu estancia...</span>
      </div>
    </main>
  )
}

function FullScreenError() {
  const { refreshEstancia, logout } = useAuth()
  return (
    <main className="grid h-dvh place-items-center bg-forest-950 px-4 text-center text-sand-200">
      <div className="app-panel max-w-md p-7" role="alert">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-danger-400/10 text-danger-400">
          <AlertTriangle size={19} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-sand-100">No pudimos conectar con el servidor</h1>
        <p className="mt-2 text-sm leading-6 text-sand-500">
          Revisá tu conexión e intentá de nuevo. Si el problema persiste, puede ser un problema
          temporal del servicio.
        </p>
        <div className="mt-5 flex justify-center gap-2.5">
          <button
            type="button"
            onClick={() => refreshEstancia().catch(() => {})}
            className="app-button-primary">
            <RotateCcw size={15} aria-hidden="true" /> Reintentar
          </button>
          <button
            type="button"
            onClick={logout}
            className="app-button-ghost">
            Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  )
}

export function RequireAuth({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}

export function RequireNoEstancia({ children }) {
  const { token, estanciaStatus } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (estanciaStatus === 'idle' || estanciaStatus === 'loading') return <FullScreenLoader />
  if (estanciaStatus === 'error') return <FullScreenError />
  if (estanciaStatus === 'ready') return <Navigate to="/resumen" replace />
  return children
}

export function RequireEstancia() {
  const { token, estanciaStatus } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (estanciaStatus === 'idle' || estanciaStatus === 'loading') return <FullScreenLoader />
  if (estanciaStatus === 'error') return <FullScreenError />
  if (estanciaStatus === 'none') return <Navigate to="/onboarding/estancia" replace />
  return <Outlet />
}
