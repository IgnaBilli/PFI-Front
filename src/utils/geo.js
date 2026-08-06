const EARTH_RADIUS = 6371000

export function distanceMeters(a, b) {
  const toRadians = (value) => value * Math.PI / 180
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)
  const deltaLat = lat2 - lat1
  const deltaLng = toRadians(b.longitude - a.longitude)
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2
  return 2 * EARTH_RADIUS * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

export function areaHectares(vertices) {
  if (vertices.length < 3) return 0
  const toRadians = (value) => value * Math.PI / 180
  let area = 0
  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index]
    const next = vertices[(index + 1) % vertices.length]
    area += toRadians(next.longitude - current.longitude) * (2 + Math.sin(toRadians(current.latitude)) + Math.sin(toRadians(next.latitude)))
  }
  return Math.abs(area * EARTH_RADIUS * EARTH_RADIUS / 2) / 10000
}

export function midpoint(a, b) {
  return [(a.latitude + b.latitude) / 2, (a.longitude + b.longitude) / 2]
}

// Caja delimitadora de un polígono con un margen chico, para dibujar un
// recuadro que lo encierre sin pegarse a sus bordes.
export function boundingBox(coordinates, paddingDeg = 0.0006) {
  const lats = coordinates.map((c) => c.latitude)
  const lngs = coordinates.map((c) => c.longitude)
  return [
    [Math.min(...lats) - paddingDeg, Math.min(...lngs) - paddingDeg],
    [Math.max(...lats) + paddingDeg, Math.max(...lngs) + paddingDeg],
  ]
}

// Las 4 esquinas de la caja delimitadora, en el formato {latitude, longitude}
// que espera `restrictTo` de PolygonMapCanvas (necesita >=3 puntos). Sirve
// para encuadrar un mini-mapa mostrando más o menos contexto alrededor del
// polígono según `paddingDeg`.
export function paddedBoundsPoints(coordinates, paddingDeg = 0.0006) {
  const [[minLat, minLng], [maxLat, maxLng]] = boundingBox(coordinates, paddingDeg)
  return [
    { latitude: minLat, longitude: minLng },
    { latitude: minLat, longitude: maxLng },
    { latitude: maxLat, longitude: maxLng },
    { latitude: maxLat, longitude: minLng },
  ]
}

export function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`
}

// Proyecta un polígono real (lat/lng) a puntos "x,y" dentro de un viewBox
// cuadrado, conservando su forma real (sin deformarla) y centrándolo con un
// margen. Para dibujar la silueta del potrero en SVG sin depender de tiles
// de mapa. La latitud se invierte porque el eje Y de SVG crece hacia abajo.
export function polygonToViewBoxPoints(coordinates, viewSize = 100, paddingRatio = 0.14) {
  if (!coordinates || coordinates.length === 0) return ''
  const lats = coordinates.map((c) => c.latitude)
  const lngs = coordinates.map((c) => c.longitude)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const latRange = maxLat - minLat || 1
  const lngRange = maxLng - minLng || 1
  const pad = viewSize * paddingRatio
  const available = viewSize - pad * 2
  const scale = available / Math.max(latRange, lngRange)
  const shapeW = lngRange * scale
  const shapeH = latRange * scale
  const offsetX = (viewSize - shapeW) / 2
  const offsetY = (viewSize - shapeH) / 2

  return coordinates
    .map(({ latitude, longitude }) => {
      const x = offsetX + (longitude - minLng) * scale
      const y = offsetY + (maxLat - latitude) * scale
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function orientation(p, q, r) {
  const value = (q.longitude - p.longitude) * (r.latitude - p.latitude) -
    (q.latitude - p.latitude) * (r.longitude - p.longitude)
  if (Math.abs(value) < 1e-12) return 0
  return value > 0 ? 1 : 2
}

function onSegment(p, q, r) {
  return (
    Math.min(p.longitude, r.longitude) <= q.longitude && q.longitude <= Math.max(p.longitude, r.longitude) &&
    Math.min(p.latitude, r.latitude) <= q.latitude && q.latitude <= Math.max(p.latitude, r.latitude)
  )
}

function segmentsIntersect(p1, p2, p3, p4) {
  const o1 = orientation(p1, p2, p3)
  const o2 = orientation(p1, p2, p4)
  const o3 = orientation(p3, p4, p1)
  const o4 = orientation(p3, p4, p2)

  if (o1 !== o2 && o3 !== o4) return true
  if (o1 === 0 && onSegment(p1, p3, p2)) return true
  if (o2 === 0 && onSegment(p1, p4, p2)) return true
  if (o3 === 0 && onSegment(p3, p1, p4)) return true
  if (o4 === 0 && onSegment(p3, p2, p4)) return true
  return false
}

// Un polígono con >=4 vértices puede autointersecarse (bordes no
// consecutivos que se cruzan, formando un "moño"). Compara cada par de
// aristas no adyacentes; con 3 vértices o menos nunca hay autointersección.
export function isSimplePolygon(vertices) {
  const n = vertices.length
  if (n < 4) return true
  for (let i = 0; i < n; i += 1) {
    const a1 = vertices[i]
    const a2 = vertices[(i + 1) % n]
    for (let j = i + 1; j < n; j += 1) {
      const adjacent = j === i + 1 || (i === 0 && j === n - 1)
      if (adjacent) continue
      const b1 = vertices[j]
      const b2 = vertices[(j + 1) % n]
      if (segmentsIntersect(a1, a2, b1, b2)) return false
    }
  }
  return true
}
