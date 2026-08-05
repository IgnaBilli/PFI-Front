import { useCallback, useEffect, useState } from 'react'
import { fetchCattle } from '../services/cattleService.js'
import { mapCattleFromApi } from '../services/mappers.js'

export default function useCattle(estanciaId) {
  const [cattle, setCattle] = useState([])
  const [loading, setLoading] = useState(Boolean(estanciaId))
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!estanciaId) {
      setCattle([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await fetchCattle(estanciaId)
      setCattle((data ?? []).map(mapCattleFromApi))
    } catch (err) {
      setError(err.message || 'No se pudo cargar el ganado.')
    } finally {
      setLoading(false)
    }
  }, [estanciaId])

  useEffect(() => {
    reload()
  }, [reload])

  return { cattle, loading, error, reload, setError }
}
