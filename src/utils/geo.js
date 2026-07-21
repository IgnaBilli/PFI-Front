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

export function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`
}
