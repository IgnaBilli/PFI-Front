export const CATEGORY_API_TO_UI = {
  VACA: 'Vaca',
  VAQUILLONA: 'Vaquilla',
  NOVILLO: 'Novillo',
  TORO: 'Toro',
  TERNERO: 'Ternero/Ternera',
}

export const CATEGORY_UI_TO_API = Object.fromEntries(
  Object.entries(CATEGORY_API_TO_UI).map(([api, ui]) => [ui, api])
)

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_API_TO_UI).map(([value, label]) => ({
  value,
  label,
}))

export function parseWeightKg(text) {
  if (text === null || text === undefined) return null
  const match = String(text).replace(',', '.').match(/-?\d+(\.\d+)?/)
  if (!match) return null
  const value = Number(match[0])
  return Number.isFinite(value) ? value : null
}

export function mapCattleFromApi(c) {
  return {
    id: c.id_ganado,
    caravana: c.numero_identificacion,
    sex: c.sexo,
    category: CATEGORY_API_TO_UI[c.categoria] ?? c.categoria,
    weight: c.peso_kg !== null && c.peso_kg !== undefined ? `${c.peso_kg} kg` : '-',
    cc: c.condicion_corporal ?? '-',
    status: c.estado_fisiologico ?? 'DESCONOCIDO',
    paddockId: c.id_potrero_actual ?? null,
    paddock: c.potrero_actual_nombre ?? '-',
  }
}

export function buildCattleCreatePayload({ caravana, sex, category, weight, cc, status }) {
  const categoria = CATEGORY_UI_TO_API[category] ?? category
  const isVaca = categoria === 'VACA'
  return {
    numero_identificacion: String(caravana ?? '').trim(),
    sexo: sex,
    categoria,
    peso_kg: parseWeightKg(weight),
    condicion_corporal: isVaca && cc !== '' && cc !== null && cc !== undefined && cc !== '-'
      ? Number(cc)
      : null,
    estado_fisiologico: isVaca ? status || 'DESCONOCIDO' : 'DESCONOCIDO',
  }
}

export function buildCattlePatchPayload(partial) {
  const payload = {}
  if (partial.caravana !== undefined) payload.numero_identificacion = String(partial.caravana).trim()
  if (partial.sex !== undefined) payload.sexo = partial.sex
  if (partial.category !== undefined) {
    const categoria = CATEGORY_UI_TO_API[partial.category] ?? partial.category
    payload.categoria = categoria
    const isVaca = categoria === 'VACA'
    payload.condicion_corporal = isVaca && partial.cc !== '' && partial.cc !== null && partial.cc !== undefined && partial.cc !== '-'
      ? Number(partial.cc)
      : null
    payload.estado_fisiologico = isVaca ? partial.status || 'DESCONOCIDO' : 'DESCONOCIDO'
  } else {
    if (partial.cc !== undefined) {
      payload.condicion_corporal = partial.cc !== '' && partial.cc !== null && partial.cc !== '-'
        ? Number(partial.cc)
        : null
    }
    if (partial.status !== undefined) payload.estado_fisiologico = partial.status || 'DESCONOCIDO'
  }
  if (partial.weight !== undefined) payload.peso_kg = parseWeightKg(partial.weight)
  return payload
}

export function geoJsonPolygonToCoords(geom) {
  const ringRaw = geom?.coordinates?.[0]
  if (!Array.isArray(ringRaw) || ringRaw.length === 0) return []
  let ring = ringRaw
  if (ring.length > 1) {
    const first = ring[0]
    const last = ring[ring.length - 1]
    if (first[0] === last[0] && first[1] === last[1]) {
      ring = ring.slice(0, -1)
    }
  }
  return ring.map(([longitude, latitude]) => ({ latitude, longitude }))
}

export function coordsToGeoJsonPolygon(coordinates) {
  const ring = coordinates.map(({ latitude, longitude }) => [longitude, latitude])
  if (
    ring.length &&
    (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
  ) {
    ring.push(ring[0])
  }
  return { type: 'Polygon', coordinates: [ring] }
}

export function mapPaddockFromApi(p, animalsCount = 0) {
  return {
    id: p.id_potrero,
    name: p.nombre,
    description: p.descripcion ?? '',
    hectares: Number(p.superficie_ha) || 0,
    coordinates: geoJsonPolygonToCoords(p.geom),
    active: p.activo ?? true,
    animals: animalsCount,
  }
}

export function buildPaddockPayload({ name, description, hectares, coordinates }) {
  return {
    nombre: name.trim(),
    descripcion: description || '',
    superficie_ha: Number(hectares) || 0,
    geom: coordsToGeoJsonPolygon(coordinates),
  }
}

export function withAnimalCounts(paddocks, cattle) {
  return paddocks.map((paddock) => ({
    ...paddock,
    animals: cattle.filter((animal) => animal.paddockId === paddock.id).length,
  }))
}
