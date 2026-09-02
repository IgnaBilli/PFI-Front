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
    throw err
  }
}

// GET .../estimacion-forrajera/historico responde siempre 200 con
// { disponibilidad: [...], mensaje? } — nunca 404 cuando no hay datos.
export async function fetchLatestForage(paddockId) {
  const data = await safeGet(`/potrero/${paddockId}/estimacion-forrajera/historico`)
  return pickLatest(data?.disponibilidad)
}

// Serie completa (no solo la última), ordenada cronológicamente, para
// graficar la evolución del pasto disponible.
export async function fetchForageHistory(paddockId) {
  const data = await safeGet(`/potrero/${paddockId}/estimacion-forrajera/historico`)
  const list = Array.isArray(data?.disponibilidad) ? data.disponibilidad : []
  return [...list].sort((a, b) => timeOf(a) - timeOf(b))
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

// GET .../dato-clima devuelve el último dato climático persistido (sólo
// vigente, no hay histórico). 404 si el potrero nunca corrió una estimación
// forrajera todavía (la ingesta de clima ocurre junto con esa corrida).
export async function fetchLatestClima(paddockId) {
  return safeGet(`/potrero/${paddockId}/dato-clima`)
}

// Entradas y salidas de ganado de este potrero (traslados), combinadas y
// ordenadas por fecha descendente, para mostrar actividad reciente.
export async function fetchPaddockTraslados(paddockId) {
  const [entradas, salidas] = await Promise.all([
    safeGet(`/potrero/${paddockId}/traslado-ganado`, { direccion: 'entradas' }),
    safeGet(`/potrero/${paddockId}/traslado-ganado`, { direccion: 'salidas' }),
  ])
  const combined = [
    ...(Array.isArray(entradas) ? entradas.map((t) => ({ ...t, direccion: 'entrada' })) : []),
    ...(Array.isArray(salidas) ? salidas.map((t) => ({ ...t, direccion: 'salida' })) : []),
  ]
  return combined.sort((a, b) => timeOf(b) - timeOf(a))
}

// POST .../estimacion-forrajera llama al modelo predictivo externo
// (imagen satelital + clima + predicción, todo en una respuesta) y persiste
// ObservacionSatelital + DatoClimatico + DisponibilidadForrajera en una sola
// transacción. La respuesta trae los tres: los campos de disponibilidad
// forrajera directamente, más `observacion` (NDVI) y `clima` anidados.
// 502 si el modelo no responde (no se persiste nada en ese caso).
export async function createForageEstimate(paddockId) {
  return api.post(`/potrero/${paddockId}/estimacion-forrajera`)
}

// GET .../estancia/{estanciaId}/analiticas agrega, sin persistir nada nuevo,
// lo que ya existe en Ganado y Estimaciones: distribución de carga animal por
// categoría, distribución de forraje entre potreros y crecimiento de forraje
// de los últimos 7 días — para las gráficas del dashboard de resumen.
export async function fetchEstanciaAnaliticas(estanciaId) {
  return safeGet(`/estancia/${estanciaId}/analiticas`)
}

// GET .../estancia/{estanciaId}/analiticas/traslado-ganado agrega los
// traslados de la estancia (total, entradas/salidas por potrero, matriz
// origen-destino y rutas más frecuentes) en un rango de fechas opcional.
export async function fetchTrasladoAnaliticas(estanciaId, { desde, hasta } = {}) {
  return safeGet(`/estancia/${estanciaId}/analiticas/traslado-ganado`, { desde, hasta })
}

// POST .../estimacion-nutricional calcula el consumo DMI (materia seca/día)
// de los animales con asignación vigente en el potrero, vía el modelo
// predictivo externo. Devuelve el agregado persistido (EstimacionDemanda)
// más `predicciones` por animal y `advertencias`, que no se persisten.
// 400 si el potrero no tiene animales asignados; 502 si el modelo no responde.
export async function createNutritionEstimate(paddockId) {
  return api.post(`/potrero/${paddockId}/estimacion-nutricional`)
}
