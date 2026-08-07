import { useEffect, useState } from 'react'
import { fetchEstanciaAnaliticas, fetchTrasladoAnaliticas } from '../services/analyticsService.js'

export default function useEstanciaAnaliticas(estanciaId) {
  const [analiticas, setAnaliticas] = useState(null)
  const [traslados, setTraslados] = useState(null)
  const [loading, setLoading] = useState(Boolean(estanciaId))

  useEffect(() => {
    if (!estanciaId) {
      setAnaliticas(null)
      setTraslados(null)
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    Promise.all([fetchEstanciaAnaliticas(estanciaId), fetchTrasladoAnaliticas(estanciaId)])
      .then(([consumo, traslado]) => {
        if (cancelled) return
        setAnaliticas(consumo)
        setTraslados(traslado)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [estanciaId])

  return { analiticas, traslados, loading }
}
