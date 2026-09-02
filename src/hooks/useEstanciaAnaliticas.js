import { useEffect, useState } from 'react'
import { fetchEstanciaAnaliticas, fetchTrasladoAnaliticas } from '../services/analyticsService.js'

export default function useEstanciaAnaliticas(estanciaId) {
  const [analiticas, setAnaliticas] = useState(null)
  const [traslados, setTraslados] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(Boolean(estanciaId))

  useEffect(() => {
    if (!estanciaId) {
      setAnaliticas(null)
      setTraslados(null)
      setErrors({})
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setErrors({})
    Promise.allSettled([fetchEstanciaAnaliticas(estanciaId), fetchTrasladoAnaliticas(estanciaId)])
      .then(([consumo, traslado]) => {
        if (cancelled) return
        setAnaliticas(consumo.status === 'fulfilled' ? consumo.value : null)
        setTraslados(traslado.status === 'fulfilled' ? traslado.value : null)
        setErrors({
          ...(consumo.status === 'rejected' ? { analiticas: consumo.reason } : {}),
          ...(traslado.status === 'rejected' ? { traslados: traslado.reason } : {}),
        })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [estanciaId])

  const error = errors.analiticas ?? errors.traslados ?? null
  return { analiticas, traslados, loading, error, errors }
}
