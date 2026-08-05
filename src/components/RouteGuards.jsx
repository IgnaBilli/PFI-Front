import { AlertTriangle, LoaderCircle, RotateCcw } from 'lucide-react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function FullScreenLoader() {
  return (
    <main className="grid h-dvh place-items-center bg-[#0b0b0c] text-stone-400">
      <LoaderCircle size={28} className="animate-spin" />
    </main>
  )
}

function FullScreenError() {
  const { refreshEstancia, logout } = useAuth()
  return (
    <main className="grid h-dvh place-items-center bg-[#0b0b0c] px-4 text-center text-stone-300">
      <div className="max-w-sm">
        <span className="mx-auto grid size-10 place-items-center rounded-lg bg-red-500/10 text-red-400">
          <AlertTriangle size={18} />
        </span>
        <p className="mt-3 text-[13px] font-bold text-white">No se pudo conectar con el servidor</p>
        <p className="mt-1.5 text-[11px] leading-5 text-stone-500">
          Revisá tu conexión e intentá de nuevo. Si el problema persiste, puede ser un problema
          temporal del servicio.
        </p>
        <div className="mt-5 flex justify-center gap-2.5">
          <button
            onClick={() => refreshEstancia().catch(() => {})}
            className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-[11px] font-bold text-black hover:bg-stone-200">
            <RotateCcw size={13} /> Reintentar
          </button>
          <button
            onClick={logout}
            className="rounded-lg px-4 py-2.5 text-[11px] font-semibold text-stone-500 hover:bg-white/[.05] hover:text-white">
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
