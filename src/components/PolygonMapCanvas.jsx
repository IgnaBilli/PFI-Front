import { useEffect } from 'react'
import { DomEvent, divIcon, latLngBounds } from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { distanceMeters, formatDistance, midpoint } from '../utils/geo.js'
import { ARGENTINA_CENTER, COLORS } from '../utils/mapConstants.js'

const VERTEX_ICON = divIcon({
  className: '',
  html: '<div style="width:44px;height:44px;display:grid;place-items:center;cursor:grab;"><span style="display:block;width:16px;height:16px;border-radius:50%;background:#eee5d7;border:2px solid #121614;box-shadow:0 0 0 1px rgba(0,0,0,.35);"></span></div>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
})

function MapClickHandler({ enabled, onAdd }) {
  useMapEvents({ click: ({ latlng }) => enabled && onAdd(latlng.lat, latlng.lng) })
  return null
}

// Acota el pan/zoom a la superficie de `restrictTo` (p. ej. mientras se
// edita un potrero puntual, o en las miniaturas de solo lectura), para que
// el mapa no muestre más que esa parcela. `JSON.stringify` como dependencia
// evita re-ajustar en cada render por una nueva referencia de array con las
// mismas coordenadas.
//
// Leaflet lee el tamaño del contenedor en el momento en que se monta, que en
// tarjetas chicas de un grid puede no ser todavía el tamaño final (el commit
// de React no espera el layout del navegador). Si se encuadra con ese tamaño
// equivocado, el mapa queda mal centrado/zoomeado y ya no se corrige solo:
// `invalidateSize()` por sí solo arregla el tamaño pero mantiene la vista
// vieja. Por eso acá siempre se invalida el tamaño primero y recién después
// se encuadra — y se repite con un ResizeObserver por si el contenedor
// cambia más tarde.
function BoundsRestrictor({ restrictTo, defaultMinZoom }) {
  const map = useMap()
  const key = restrictTo && restrictTo.length >= 3 ? JSON.stringify(restrictTo) : null

  useEffect(() => {
    function apply() {
      map.invalidateSize()
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
    }

    const raf = requestAnimationFrame(apply)
    let observer
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => apply())
      observer.observe(map.getContainer())
    }
    return () => {
      cancelAnimationFrame(raf)
      if (observer) observer.disconnect()
    }
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
  invalid = false,
  onVertexDrag = null,
  onPolygonClick = null,
  interactive = true,
  center = ARGENTINA_CENTER,
  zoom = 5,
  minZoom = 3,
  className = '',
}) {
  return (
    <MapContainer
      aria-label={isDrawing ? 'Mapa para dibujar el polígono' : 'Mapa de la estancia y sus potreros'}
      center={center}
      zoom={zoom}
      minZoom={minZoom}
      maxZoom={21}
      ref={mapRef}
      className={`h-full w-full ${isDrawing ? 'drawing-map' : ''} ${className}`}
      zoomControl={interactive}
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      boxZoom={interactive}
      keyboard={interactive}
      attributionControl={interactive}>
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
            color: '#ddd0bc',
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
            className: onPolygonClick ? 'cursor-pointer' : '',
          }}
          eventHandlers={
            onPolygonClick
              ? {
                  click: (event) => {
                    DomEvent.stopPropagation(event);
                    onPolygonClick(polygon.id);
                  },
                }
              : undefined
          }>
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
          pathOptions={{ color: '#ddd0bc', weight: 4, opacity: 0.9 }}
        />
      )}
      {vertices.length >= 3 && (
        <Polygon
          positions={vertices.map(({ latitude, longitude }) => [latitude, longitude])}
          pathOptions={
            invalid
              ? { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.25, weight: 2.5 }
              : { color: '#ddd0bc', fillColor: '#245746', fillOpacity: 0.25, weight: 2 }
          }
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
        <Marker
          key={`vertex-${index}`}
          position={[latitude, longitude]}
          icon={VERTEX_ICON}
          alt={`Vértice ${index + 1}`}
          draggable={Boolean(onVertexDrag)}
          eventHandlers={
            onVertexDrag
              ? {
                  dragend: (event) => {
                    const { lat, lng } = event.target.getLatLng()
                    onVertexDrag(index, lat, lng)
                  },
                }
              : undefined
          }>
          <Tooltip
            permanent
            direction="bottom"
            className="vertex-label">{`${index + 1}: [${latitude.toFixed(5)}, ${longitude.toFixed(5)}]`}</Tooltip>
        </Marker>
      ))}
      {selectedPlace && (
        <CircleMarker
          center={[selectedPlace.lat, selectedPlace.lng]}
          radius={8}
          pathOptions={{ color: '#ddd0bc', fillColor: '#245746', fillOpacity: 1, weight: 3 }}>
          <Tooltip permanent direction="bottom" className="paddock-label">
            {selectedPlace.name.split(',')[0]}
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  )
}
