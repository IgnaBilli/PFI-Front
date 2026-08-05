import { useEffect } from 'react'
import { latLngBounds } from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { distanceMeters, formatDistance, midpoint } from '../utils/geo.js'
import { ARGENTINA_CENTER, COLORS } from '../utils/mapConstants.js'

function MapClickHandler({ enabled, onAdd }) {
  useMapEvents({ click: ({ latlng }) => enabled && onAdd(latlng.lat, latlng.lng) })
  return null
}

// Acota el pan/zoom a la superficie de `restrictTo` (p. ej. mientras se
// edita un potrero puntual), para que el mapa no muestre más que esa
// parcela. `JSON.stringify` como dependencia evita re-ajustar en cada
// render por una nueva referencia de array con las mismas coordenadas.
function BoundsRestrictor({ restrictTo, defaultMinZoom }) {
  const map = useMap()
  const key = restrictTo && restrictTo.length >= 3 ? JSON.stringify(restrictTo) : null

  useEffect(() => {
    if (!key) {
      map.setMaxBounds(null)
      map.setMinZoom(defaultMinZoom)
      return
    }
    const padding = [50, 50]
    const bounds = latLngBounds(restrictTo.map(({ latitude, longitude }) => [latitude, longitude]))
    // El zoom con el que fitBounds encuadra la superficie es también el
    // límite de alejamiento: sin esto, setMaxBounds sólo frena el paneo,
    // pero se puede seguir haciendo zoom out y ver más allá del potrero.
    const fitZoom = map.getBoundsZoom(bounds, false, padding)
    map.fitBounds(bounds, { padding })
    map.setMaxBounds(bounds.pad(0.25))
    map.setMinZoom(fitZoom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map, defaultMinZoom])

  return null
}

export default function PolygonMapCanvas({
  mapRef,
  isDrawing,
  onMapClick,
  vertices,
  existingPolygons = [],
  outlinePolygon = null,
  selectedPlace = null,
  restrictTo = null,
  center = ARGENTINA_CENTER,
  zoom = 5,
  minZoom = 3,
  className = '',
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={minZoom}
      maxZoom={21}
      ref={mapRef}
      className={`h-full w-full ${isDrawing ? 'drawing-map' : ''} ${className}`}
      zoomControl>
      <TileLayer
        maxNativeZoom={19}
        maxZoom={21}
        attribution="Tiles &copy; Esri"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
      <MapClickHandler enabled={isDrawing} onAdd={onMapClick} />
      <BoundsRestrictor restrictTo={restrictTo} defaultMinZoom={minZoom} />

      {outlinePolygon && outlinePolygon.coordinates?.length >= 3 && (
        <Polygon
          positions={outlinePolygon.coordinates.map(({ latitude, longitude }) => [latitude, longitude])}
          pathOptions={{
            color: '#ffffff',
            fillOpacity: 0,
            weight: 2.5,
            dashArray: '8 8',
          }}>
          {outlinePolygon.label && (
            <Tooltip sticky className="paddock-label">
              {outlinePolygon.label}
            </Tooltip>
          )}
        </Polygon>
      )}

      {existingPolygons.map((polygon, index) => (
        <Polygon
          key={polygon.id}
          positions={polygon.coordinates.map(({ latitude, longitude }) => [latitude, longitude])}
          pathOptions={{
            color: polygon.color ?? COLORS[index % COLORS.length],
            fillColor: polygon.color ?? COLORS[index % COLORS.length],
            fillOpacity: 0.15,
            weight: 2.5,
          }}>
          {polygon.label && (
            <Tooltip sticky className="paddock-label">
              {polygon.label}
            </Tooltip>
          )}
        </Polygon>
      ))}

      {vertices.length >= 2 && (
        <Polyline
          positions={vertices.map(({ latitude, longitude }) => [latitude, longitude])}
          pathOptions={{ color: '#ffffff', weight: 4, opacity: 0.9 }}
        />
      )}
      {vertices.length >= 3 && (
        <Polygon
          positions={vertices.map(({ latitude, longitude }) => [latitude, longitude])}
          pathOptions={{ color: '#ffffff', fillColor: '#888888', fillOpacity: 0.25, weight: 2 }}
        />
      )}
      {vertices.slice(1).map((vertex, index) => (
        <CircleMarker
          key={`distance-${index}`}
          center={midpoint(vertices[index], vertex)}
          radius={1}
          pathOptions={{ opacity: 0, fillOpacity: 0 }}>
          <Tooltip permanent direction="top" className="distance-label">
            {formatDistance(distanceMeters(vertices[index], vertex))}
          </Tooltip>
        </CircleMarker>
      ))}
      {vertices.map(({ latitude, longitude }, index) => (
        <CircleMarker
          key={`${latitude}-${longitude}-${index}`}
          center={[latitude, longitude]}
          radius={7}
          pathOptions={{ color: '#0b0b0c', fillColor: '#ffffff', fillOpacity: 1, weight: 2 }}>
          <Tooltip
            permanent
            direction="bottom"
            className="vertex-label">{`${index + 1}: [${latitude.toFixed(5)}, ${longitude.toFixed(5)}]`}</Tooltip>
        </CircleMarker>
      ))}
      {selectedPlace && (
        <CircleMarker
          center={[selectedPlace.lat, selectedPlace.lng]}
          radius={8}
          pathOptions={{ color: '#ffffff', fillColor: '#52525b', fillOpacity: 1, weight: 3 }}>
          <Tooltip permanent direction="bottom" className="paddock-label">
            {selectedPlace.name.split(',')[0]}
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  )
}
