import { useEffect, useState } from 'react'
import {
  fetchActiveRecommendation,
  fetchLatestForage,
  fetchLatestNutrition,
} from '../services/analyticsService.js'

export default function usePaddockAnalytics(paddocks) {
  const [dataById, setDataById] = useState({})
  const [loading, setLoading] = useState(false)
  const ids = paddocks.map((p) => p.id).join(',')

  useEffect(() => {
    if (!paddocks.length) {
      setDataById({})
      return undefined
    }
    let cancelled = false
    setLoading(true)
    Promise.all(
      paddocks.map(async (paddock) => {
        const [forage, nutrition, recommendation] = await Promise.all([
          fetchLatestForage(paddock.id),
          fetchLatestNutrition(paddock.id),
          fetchActiveRecommendation(paddock.id),
        ])
        return [paddock.id, { forage, nutrition, recommendation }]
      })
    )
      .then((entries) => {
        if (!cancelled) setDataById(Object.fromEntries(entries))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids])

  return { dataById, loading }
}

const STATUS_STYLES = {
  alert: { status: 'Escasa', statusColor: '#ef4444', statusBg: '#ef444415', loadColor: '#ef4444' },
  info: { status: 'Regular', statusColor: '#eab308', statusBg: '#eab30815', loadColor: '#eab308' },
  ok: { status: 'Buena', statusColor: '#22c55e', statusBg: '#22c55e15', loadColor: '#22c55e' },
  empty: { status: 'Sin datos', statusColor: '#71717a', statusBg: '#71717a15', loadColor: '#71717a' },
}

export function buildPaddockStatus(entry) {
  const forage = entry?.forage ?? null
  const recommendation = entry?.recommendation ?? null
  const priority = recommendation?.prioridad ?? recommendation?.tipo ?? null
  const grassValue = forage?.kg_materia_seca_ha
  const grass = grassValue !== undefined && grassValue !== null ? `${grassValue} kg MS/ha` : 'Sin datos'
  const load = '50%'

  const recommendationText = recommendation
    ? recommendation.descripcion || recommendation.fundamento || null
    : null

  let variant = 'empty'
  if (priority === 'REDUCIR_CARGA') variant = 'alert'
  else if (recommendation) variant = 'info'
  else if (forage) variant = 'ok'

  const base = STATUS_STYLES[variant]
  const result = { ...base, grass, load }

  if (variant === 'alert') result.alert = recommendationText || 'Se recomienda reducir la carga animal.'
  else if (variant === 'info') result.recommendation = recommendationText || 'Tiene una recomendación disponible.'
  else if (variant === 'ok') result.ok = 'Todo en orden'

  return result
}
