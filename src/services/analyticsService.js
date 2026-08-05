import { api, ApiError } from './api.js'

function timeOf(item) {
  const value = item?.fecha_calculo ?? item?.fecha_generacion ?? item?.fecha ?? item?.created_at ?? null
  const time = value ? new Date(value).getTime() : NaN
  return Number.isFinite(time) ? time : -Infinity
}

function pickLatest(list) {
  if (!Array.isArray(list) || list.length === 0) return null
  return list.reduce((latest, item) => (timeOf(item) > timeOf(latest) ? item : latest), list[0])
}

async function safeGet(path, params) {
  try {
    return await api.get(path, params)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    console.warn(`Analítica no disponible para ${path}:`, err)
    return null
  }
}

// GET .../estimacion-forrajera/historico responde siempre 200 con
// { disponibilidad: [...], mensaje? } — nunca 404 cuando no hay datos.
export async function fetchLatestForage(paddockId) {
  const data = await safeGet(`/potrero/${paddockId}/estimacion-forrajera/historico`)
  return pickLatest(data?.disponibilidad)
}

// GET .../estimacion-nutricional/historico responde siempre 200 con
// { estimaciones: [...], mensaje? } — nunca 404 cuando no hay datos.
export async function fetchLatestNutrition(paddockId) {
  const data = await safeGet(`/potrero/${paddockId}/estimacion-nutricional/historico`)
  return pickLatest(data?.estimaciones)
}

// GET .../recomendacion responde siempre 200 con un arreglo (vacío si no
// hay recomendaciones pendientes).
export async function fetchActiveRecommendation(paddockId) {
  const data = await safeGet(`/potrero/${paddockId}/recomendacion`, { vigente: true })
  return pickLatest(data)
}
