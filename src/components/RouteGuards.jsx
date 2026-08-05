import { LoaderCircle } from 'lucide-react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function FullScreenLoader() {
  return (
    <main className="grid h-dvh place-items-center bg-[#0b0b0c] text-stone-400">
      <LoaderCircle size={28} className="animate-spin" />
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
  if (estanciaStatus === 'ready') return <Navigate to="/resumen" replace />
  return children
}

export function RequireEstancia() {
  const { token, estanciaStatus } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (estanciaStatus === 'idle' || estanciaStatus === 'loading') return <FullScreenLoader />
  if (estanciaStatus === 'none') return <Navigate to="/onboarding/estancia" replace />
  return <Outlet />
}
