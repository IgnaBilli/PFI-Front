import { useCallback, useEffect, useState } from 'react'
import { fetchPaddocks } from '../services/paddockService.js'
import { mapPaddockFromApi } from '../services/mappers.js'

export default function usePaddocks(estanciaId) {
  const [paddocks, setPaddocks] = useState([])
  const [loading, setLoading] = useState(Boolean(estanciaId))
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!estanciaId) {
      setPaddocks([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await fetchPaddocks(estanciaId)
      // GET .../potrero devuelve también los potreros dados de baja
      // (borrado lógico, activo=false); se excluyen de la UI.
      setPaddocks((data ?? []).filter((p) => p.activo).map((p) => mapPaddockFromApi(p, 0)))
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los potreros.')
    } finally {
      setLoading(false)
    }
  }, [estanciaId])

  useEffect(() => {
    reload()
  }, [reload])

  return { paddocks, loading, error, reload, setError }
}
