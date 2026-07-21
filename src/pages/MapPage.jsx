import { useRef, useState } from 'react'
import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, Tooltip, useMapEvents } from 'react-leaflet'
import { Check, Crosshair, LandPlot, LoaderCircle, MapPin, Pencil, Play, Plus, RotateCcw, Save, Search, Trash2, X } from 'lucide-react'
import usePaddocks from '../hooks/usePaddocks.js'
import { areaHectares, distanceMeters, formatDistance, midpoint } from '../utils/geo.js'

const ARGENTINA_CENTER = [-38.4161, -63.6167]
const COLORS = ['#7c7c8a', '#52525b', '#3f3f46', '#a1a1aa', '#d4d4d8', '#e4e4e7']

export default function MapPage() {
  const { paddocks, addPaddock, removePaddock, updatePaddock } = usePaddocks()
  const [name, setName] = useState('')
  const [animals, setAnimals] = useState('')
  const [vertices, setVertices] = useState([])
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [error, setError] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState([])
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [searching, setSearching] = useState(false)
  const [placeError, setPlaceError] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const mapRef = useRef(null)

  function addVertex(lat, lng) {
    setVertices((current) => [...current, { latitude: Number(lat), longitude: Number(lng) }])
    setError('')
  }

  function handleCoordinateSubmit(event) {
    event.preventDefault()
    if (!isDrawing) {
      setError('Iniciá el trazado antes de agregar coordenadas.')
      return
    }
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setError('Ingresá coordenadas válidas.')
      return
    }
    addVertex(lat, lng)
    setLatitude('')
    setLongitude('')
    mapRef.current?.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 13))
  }

  function savePaddock() {
    if (!name.trim()) {
      setError('Asignale un nombre al potrero.')
      return
    }
    if (vertices.length < 3) {
      setError('El potrero necesita al menos 3 vértices.')
      return
    }
    if (vertices.some(({ latitude: lat, longitude: lng }) => lat < -90 || lat > 90 || lng < -180 || lng > 180)) {
      setError('Revisá las coordenadas de los vértices.')
      return
    }
    if (isDrawing) {
      setError('Terminá el trazado antes de guardar.')
      return
    }
    const paddock = {
      id: editingId ?? crypto.randomUUID(),
      name: name.trim(),
      animals: Number(animals) || 0,
      coordinates: vertices,
      createdAt: editingId ? paddocks.find((item) => item.id === editingId)?.createdAt : new Date().toISOString(),
    }
    if (editingId) updatePaddock(paddock)
    else addPaddock(paddock)
    setName('')
    setAnimals('')
    setVertices([])
    setEditingId(null)
    setError('')
  }

  function startDrawing() {
    if (!editingId) setVertices([])
    setIsDrawing(true)
    setError('')
  }

  function finishDrawing() {
    if (vertices.length < 3) {
      setError('Marcá al menos 3 vértices para terminar.')
      return
    }
    setIsDrawing(false)
    setError('')
  }

  function editPaddock(paddock) {
    setEditingId(paddock.id)
    setName(paddock.name)
    setAnimals(String(Number(paddock.animals) || 0))
    setVertices(paddock.coordinates.map((coordinate) => ({ ...coordinate })))
    setIsDrawing(false)
    setError('')
    focusPaddock(paddock)
    setPanelOpen(true)
  }

  function cancelEdit() {
    setEditingId(null)
    setName('')
    setAnimals('')
    setVertices([])
    setIsDrawing(false)
    setError('')
  }

  function updateVertex(index, field, value) {
    const number = Number(value)
    if (!Number.isFinite(number)) return
    setVertices((current) => current.map((vertex, itemIndex) => itemIndex === index ? { ...vertex, [field]: number } : vertex))
  }

  function focusPaddock(paddock) {
    const bounds = paddock.coordinates.map(({ latitude: lat, longitude: lng }) => [lat, lng])
    mapRef.current?.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 })
    setPanelOpen(false)
  }

  function goToPlace(place) {
    const lat = Number(place.lat)
    const lng = Number(place.lon)
    setSelectedPlace({ lat, lng, name: place.display_name })
    setPlaceQuery(place.display_name.split(',').slice(0, 2).join(','))
    setPlaceResults([])
    mapRef.current?.flyTo([lat, lng], 14, { duration: 1.4 })
  }

  async function searchPlace(event) {
    event.preventDefault()
    if (placeQuery.trim().length < 3) return
    setSearching(true)
    setPlaceError('')
    try {
      const params = new URLSearchParams({ q: placeQuery.trim(), format: 'json', limit: '5', countrycodes: 'ar', 'accept-language': 'es' })
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
      if (!response.ok) throw new Error('Search failed')
      const places = await response.json()
      setPlaceResults(places)
      if (places.length > 0) {
        const first = places[0]
        const lat = Number(first.lat)
        const lng = Number(first.lon)
        setSelectedPlace({ lat, lng, name: first.display_name })
        mapRef.current?.flyTo([lat, lng], 14, { duration: 1.4 })
      } else setPlaceError('No encontramos ese lugar en Argentina.')
    } catch {
      setPlaceError('No se pudo realizar la búsqueda.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <main className="relative flex h-full min-h-[560px] overflow-hidden bg-[#0b0b0c] text-sm">
        <button onClick={() => setPanelOpen(true)} className="absolute right-3 top-3 z-[1000] flex items-center gap-2 rounded-lg border border-white/10 bg-[#0f0f11] px-3.5 py-2.5 text-[11px] font-bold text-stone-300 shadow-xl lg:hidden">
          <LandPlot size={14} /> Potreros <span className="rounded bg-[#222227] px-1.5 py-0.5 text-[10px] text-white">{paddocks.length}</span>
        </button>
        <aside className={`absolute inset-y-0 left-0 z-[1002] w-[min(90vw,315px)] overflow-y-auto border-r border-white/[.06] bg-[#0f0f11] p-5 text-stone-300 shadow-2xl transition-transform lg:relative lg:z-auto lg:w-[315px] lg:shrink-0 lg:translate-x-0 lg:shadow-none ${panelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <button onClick={() => setPanelOpen(false)} className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg bg-white/[.04] text-stone-500 lg:hidden"><X size={17} /></button>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a1a1aa]">{editingId ? 'Edición de potrero' : 'Mapa satelital'}</p>
          <div className="flex items-center justify-between"><h1 className="mt-1 font-display text-2xl text-white">{editingId ? 'Editar potrero' : 'Dibujar potrero'}</h1>{editingId && <button onClick={cancelEdit} className="mt-1 text-[10px] font-bold text-stone-500 hover:text-white">Cancelar</button>}</div>
          <p className="mt-1 text-[11px] leading-4 text-stone-600 font-medium">Iniciá el trazado y marcá los vértices sobre el mapa de forma simple.</p>

          <div className="mt-5 grid grid-cols-[1fr_95px] gap-2">
            <label className="block"><span className="text-[10px] font-bold text-stone-400">Nombre</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Lote Norte" className="mt-1.5 w-full rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3.5 py-2.5 text-[12px] text-white outline-none focus:border-stone-500" /></label>
            <label className="block"><span className="text-[10px] font-bold text-stone-400">Cabezas</span><input value={animals} onChange={(event) => setAnimals(event.target.value)} min="0" type="number" placeholder="0" className="mt-1.5 w-full rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3.5 py-2.5 text-[12px] text-white outline-none focus:border-stone-500" /></label>
          </div>

          {!isDrawing ? (
            <button onClick={startDrawing} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-stone-700 bg-stone-800 py-3 text-[12px] font-bold text-stone-200 hover:bg-stone-700"><Play size={14} fill="currentColor" /> {editingId ? 'Modificar trazado' : 'Iniciar trazado'}</button>
          ) : (
            <button onClick={finishDrawing} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-[12px] font-bold text-black hover:bg-stone-200"><Check size={14} /> Terminar trazado</button>
          )}
          <div className={`mt-2.5 flex items-center gap-2 rounded-md px-3 py-2 text-[10px] ${isDrawing ? 'bg-stone-500/10 text-stone-200' : 'bg-white/[.025] text-stone-600'}`}><span className={`size-2 rounded-full ${isDrawing ? 'animate-pulse bg-white' : 'bg-stone-700'}`} />{isDrawing ? 'Modo trazado activo: hacé clic sobre el mapa para conectar líneas' : 'El mapa está en modo navegación'}</div>

          <form onSubmit={handleCoordinateSubmit} className={`mt-4 rounded-lg border border-white/[.05] bg-white/[.025] p-3.5 ${!isDrawing ? 'opacity-45' : ''}`}>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-stone-400"><Crosshair size={14} /> Agregar coordenada exacta</div>
            <div className="grid grid-cols-2 gap-2">
              <input disabled={!isDrawing} value={latitude} onChange={(event) => setLatitude(event.target.value)} type="number" step="any" placeholder="Latitud" aria-label="Latitud" className="min-w-0 rounded-md border border-white/[.07] bg-[#0b0b0c] px-3 py-2.5 text-[11px] text-white outline-none focus:border-stone-500" />
              <input disabled={!isDrawing} value={longitude} onChange={(event) => setLongitude(event.target.value)} type="number" step="any" placeholder="Longitud" aria-label="Longitud" className="min-w-0 rounded-md border border-white/[.07] bg-[#0b0b0c] px-3 py-2.5 text-[11px] text-white outline-none focus:border-stone-500" />
            </div>
            <button disabled={!isDrawing} className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-white/[.07] bg-white/[.04] py-2.5 text-[11px] font-bold text-stone-300 hover:bg-white/[.07] disabled:cursor-not-allowed"><Plus size={13} /> Agregar vértice</button>
          </form>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-[11px] font-bold text-stone-400">Vértices <span className="ml-1 text-stone-600">{vertices.length}</span></p>
            {vertices.length > 0 && <button onClick={() => setVertices((current) => current.slice(0, -1))} className="flex items-center gap-1 text-[11px] font-bold text-white hover:underline"><RotateCcw size={12} /> Deshacer</button>}
          </div>
          <div className="mt-2.5 max-h-36 space-y-2 overflow-y-auto">
            {vertices.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/[.08] px-4 py-5 text-center text-[11px] text-stone-700">Todavía no agregaste vértices.</div>
            ) : vertices.map((vertex, index) => (
              <div key={`${vertex.latitude}-${vertex.longitude}-${index}`} className="flex items-center gap-2 rounded-md bg-white/[.035] px-2.5 py-2 text-[11px]">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-stone-700 text-[10px] font-bold text-white">{index + 1}</span>
                <span className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
                  <input aria-label={`Latitud del vértice ${index + 1}`} type="number" step="any" value={vertex.latitude} onChange={(event) => updateVertex(index, 'latitude', event.target.value)} className="min-w-0 rounded border border-white/[.06] bg-[#0b0b0c] px-2 py-1.5 text-[10px] text-stone-300 outline-none focus:border-stone-500" />
                  <input aria-label={`Longitud del vértice ${index + 1}`} type="number" step="any" value={vertex.longitude} onChange={(event) => updateVertex(index, 'longitude', event.target.value)} className="min-w-0 rounded border border-white/[.06] bg-[#0b0b0c] px-2 py-1.5 text-[10px] text-stone-300 outline-none focus:border-stone-500" />
                </span>
                <button onClick={() => setVertices((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Eliminar vértice ${index + 1}`} className="text-stone-600 hover:text-red-400"><X size={14} /></button>
              </div>
            ))}
          </div>
          {error && <p role="alert" className="mt-3.5 rounded-lg bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-400">{error}</p>}
          {vertices.length >= 3 && <div className="mt-3.5 flex items-center justify-between rounded-md bg-stone-800 px-3.5 py-2.5 text-[11px]"><span className="text-stone-400">Superficie estimada</span><strong className="text-white">{areaHectares(vertices).toFixed(2)} ha</strong></div>}
          <button onClick={savePaddock} className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-[12px] font-bold text-black transition hover:bg-stone-200"><Save size={14} /> {editingId ? 'Guardar cambios' : 'Guardar potrero'}</button>

          <div className="my-6 h-px bg-white/[.06]" />
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-white">Mis potreros</h2>
            <span className="rounded-full bg-white/[.05] px-2 py-1 text-[10px] font-bold text-stone-500">{paddocks.length}</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {paddocks.length === 0 ? <p className="py-4 text-center text-[11px] text-stone-700">Los potreros guardados aparecerán acá.</p> : paddocks.map((paddock, index) => (
              <div key={paddock.id} className="group flex items-center gap-2 rounded-lg border border-white/[.05] bg-white/[.025] p-3">
                <button onClick={() => focusPaddock(paddock)} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md text-white font-bold text-[11px]" style={{ backgroundColor: COLORS[index % COLORS.length] }}><MapPin size={14} /></span>
                  <span className="min-w-0"><strong className="block truncate text-[12px] text-stone-200">{paddock.name}</strong><small className="text-[10px] text-stone-500">{areaHectares(paddock.coordinates).toFixed(1)} ha · {Number(paddock.animals) || 0} cabezas</small></span>
                </button>
                <button onClick={() => editPaddock(paddock)} aria-label={`Editar ${paddock.name}`} className="grid size-8 place-items-center rounded-md text-stone-500 hover:bg-stone-850 hover:text-white"><Pencil size={14} /></button>
                <button onClick={() => removePaddock(paddock.id)} aria-label={`Eliminar ${paddock.name}`} className="grid size-8 place-items-center rounded-md text-stone-600 hover:bg-red-950/40 hover:text-red-400"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </aside>
        {panelOpen && <button aria-label="Cerrar panel" onClick={() => setPanelOpen(false)} className="absolute inset-0 z-[1001] bg-black/60 backdrop-blur-[2px] lg:hidden" />}

        <section className="relative min-w-0 flex-1">
          <div className="absolute left-1/2 top-3 z-[1000] w-[min(88%,390px)] -translate-x-1/2">
            <form onSubmit={searchPlace} className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0f0f11]/95 px-3.5 shadow-2xl backdrop-blur">
              <Search size={14} className="shrink-0 text-white" />
              <input value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} placeholder="Buscar localidad o dirección..." className="min-w-0 flex-1 bg-transparent py-3 text-[12px] text-stone-250 outline-none placeholder:text-stone-750" />
              {searching && <LoaderCircle size={14} className="animate-spin text-stone-500" />}
              {placeQuery && !searching && <button type="button" onClick={() => { setPlaceQuery(''); setPlaceResults([]); setPlaceError('') }} className="text-stone-600 hover:text-stone-300"><X size={14} /></button>}
            </form>
            {placeResults.length > 1 && <div className="mt-1 overflow-hidden rounded-lg border border-white/10 bg-[#0f0f11] shadow-2xl">{placeResults.map((place) => <button key={place.place_id} onClick={() => goToPlace(place)} className="flex w-full items-start gap-2 border-b border-white/[.05] px-3.5 py-2.5 text-left text-[11px] leading-4 text-stone-400 last:border-0 hover:bg-white/[.04] hover:text-stone-200"><MapPin size={13} className="mt-0.5 shrink-0 text-white" />{place.display_name}</button>)}</div>}
            {placeError && <p className="mt-1 rounded-md bg-[#0f0f11] px-3.5 py-2.5 text-[11px] text-stone-400 shadow-xl">{placeError}</p>}
          </div>
          <MapContainer center={ARGENTINA_CENTER} zoom={5} minZoom={3} maxZoom={21} ref={mapRef} className={`h-full w-full ${isDrawing ? 'drawing-map' : ''}`} zoomControl>
            <TileLayer maxNativeZoom={19} maxZoom={21} attribution='Tiles &copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            <MapClickHandler enabled={isDrawing} onAdd={addVertex} />
            {paddocks.filter((paddock) => paddock.id !== editingId).map((paddock, index) => (
              <Polygon key={paddock.id} positions={paddock.coordinates.map(({ latitude, longitude }) => [latitude, longitude])} pathOptions={{ color: COLORS[index % COLORS.length], fillColor: COLORS[index % COLORS.length], fillOpacity: 0.15, weight: 2.5 }}>
                <Tooltip sticky className="paddock-label">{paddock.name}</Tooltip>
              </Polygon>
            ))}
            {vertices.length >= 2 && <Polyline positions={vertices.map(({ latitude: lat, longitude: lng }) => [lat, lng])} pathOptions={{ color: '#ffffff', weight: 4, opacity: 0.9 }} />}
            {vertices.length >= 3 && <Polygon positions={vertices.map(({ latitude: lat, longitude: lng }) => [lat, lng])} pathOptions={{ color: '#ffffff', fillColor: '#888888', fillOpacity: 0.25, weight: 2 }} />}
            {vertices.slice(1).map((vertex, index) => <CircleMarker key={`distance-${index}`} center={midpoint(vertices[index], vertex)} radius={1} pathOptions={{ opacity: 0, fillOpacity: 0 }}><Tooltip permanent direction="top" className="distance-label">{formatDistance(distanceMeters(vertices[index], vertex))}</Tooltip></CircleMarker>)}
            {vertices.map(({ latitude: lat, longitude: lng }, index) => <CircleMarker key={`${lat}-${lng}-${index}`} center={[lat, lng]} radius={7} pathOptions={{ color: '#0b0b0c', fillColor: '#ffffff', fillOpacity: 1, weight: 2 }}><Tooltip permanent direction="bottom" className="vertex-label">{`${index + 1}: [${lat.toFixed(5)}, ${lng.toFixed(5)}]`}</Tooltip></CircleMarker>)}
            {selectedPlace && <CircleMarker center={[selectedPlace.lat, selectedPlace.lng]} radius={8} pathOptions={{ color: '#ffffff', fillColor: '#52525b', fillOpacity: 1, weight: 3 }}><Tooltip permanent direction="bottom" className="paddock-label">{selectedPlace.name.split(',')[0]}</Tooltip></CircleMarker>}
          </MapContainer>
          <div className="pointer-events-none absolute bottom-6 left-1/2 z-[500] -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#0f0f11]/90 px-3.5 py-2.5 text-[10px] font-semibold text-stone-300 shadow-xl backdrop-blur">{isDrawing ? 'Hacé clic para marcar cada vértice en el mapa' : 'Iniciá un trazado desde el panel lateral'}</div>
        </section>
    </main>
  )
}

function MapClickHandler({ enabled, onAdd }) {
  useMapEvents({ click: ({ latlng }) => enabled && onAdd(latlng.lat, latlng.lng) })
  return null
}
