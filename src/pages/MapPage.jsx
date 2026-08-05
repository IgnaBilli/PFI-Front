import { useRef, useState } from 'react';
import {
  Check,
  Crosshair,
  LandPlot,
  LoaderCircle,
  MapPin,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import usePaddocks from '../hooks/usePaddocks.js';
import useCattle from '../hooks/useCattle.js';
import { useAuth } from '../context/AuthContext.jsx';
import { areaHectares } from '../utils/geo.js';
import { COLORS } from '../utils/mapConstants.js';
import AddCattleModal from '../components/AddCattleModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PolygonMapCanvas from '../components/PolygonMapCanvas.jsx';
import { buildPaddockPayload, geoJsonPolygonToCoords, withAnimalCounts } from '../services/mappers.js';
import { createPaddock, deletePaddock, updatePaddock } from '../services/paddockService.js';
import { createCattleForPaddock } from '../services/cattleService.js';
import { ApiError } from '../services/api.js';

export default function MapPage() {
  const { estanciaId, estancia } = useAuth();
  const { paddocks, loading: paddocksLoading, reload: reloadPaddocks } = usePaddocks(estanciaId);
  const { cattle, reload: reloadCattle } = useCattle(estanciaId);
  const paddocksWithCounts = withAnimalCounts(paddocks, cattle);

  const [name, setName] = useState('');
  const [pendingCattleList, setPendingCattleList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vertices, setVertices] = useState([]);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searching, setSearching] = useState(false);
  const [placeError, setPlaceError] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [mutating, setMutating] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const mapRef = useRef(null);

  async function reloadAll() {
    await Promise.all([reloadPaddocks(), reloadCattle()]);
  }

  function handleAddCustomCattle({ animals }) {
    setPendingCattleList((prev) => [...prev, ...animals]);
  }

  function addVertex(lat, lng) {
    setVertices((current) => [...current, { latitude: Number(lat), longitude: Number(lng) }]);
    setError('');
  }

  function handleCoordinateSubmit(event) {
    event.preventDefault();
    if (!isDrawing) {
      setError('Iniciá el trazado antes de agregar coordenadas.');
      return;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90 ||
      !Number.isFinite(lng) ||
      lng < -180 ||
      lng > 180
    ) {
      setError('Ingresá coordenadas válidas.');
      return;
    }
    addVertex(lat, lng);
    setLatitude('');
    setLongitude('');
    mapRef.current?.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 13));
  }

  async function savePaddock() {
    if (!name.trim()) {
      setError('Asignale un nombre al potrero.');
      return;
    }
    if (vertices.length < 3) {
      setError('El potrero necesita al menos 3 vértices.');
      return;
    }
    if (
      vertices.some(
        ({ latitude: lat, longitude: lng }) => lat < -90 || lat > 90 || lng < -180 || lng > 180
      )
    ) {
      setError('Revisá las coordenadas de los vértices.');
      return;
    }
    if (isDrawing) {
      setError('Terminá el trazado antes de guardar.');
      return;
    }

    setMutating(true);
    setActionError('');
    setError('');
    try {
      const payload = buildPaddockPayload({
        name,
        description: '',
        hectares: areaHectares(vertices),
        coordinates: vertices,
      });

      if (editingId) {
        await updatePaddock(editingId, payload);
      } else {
        const created = await createPaddock(estanciaId, payload);
        if (pendingCattleList.length > 0) {
          for (const cattlePayload of pendingCattleList) {
            await createCattleForPaddock(created.id_potrero, cattlePayload);
          }
        }
      }
      await reloadAll();
      setName('');
      setPendingCattleList([]);
      setVertices([]);
      setEditingId(null);
    } catch (err) {
      setActionError(err.message || 'No se pudo guardar el potrero.');
    } finally {
      setMutating(false);
    }
  }

  function startDrawing() {
    if (!editingId) setVertices([]);
    setIsDrawing(true);
    setError('');
  }

  function finishDrawing() {
    if (vertices.length < 3) {
      setError('Marcá al menos 3 vértices para terminar.');
      return;
    }
    setIsDrawing(false);
    setError('');
  }

  function editPaddock(paddock) {
    setEditingId(paddock.id);
    setName(paddock.name);
    setPendingCattleList([]);
    setVertices(paddock.coordinates.map((coordinate) => ({ ...coordinate })));
    setIsDrawing(false);
    setError('');
    focusPaddock(paddock);
    setPanelOpen(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setName('');
    setPendingCattleList([]);
    setVertices([]);
    setIsDrawing(false);
    setError('');
  }

  function updateVertex(index, field, value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    setVertices((current) =>
      current.map((vertex, itemIndex) =>
        itemIndex === index ? { ...vertex, [field]: number } : vertex
      )
    );
  }

  function focusPaddock(paddock) {
    const bounds = paddock.coordinates.map(({ latitude: lat, longitude: lng }) => [lat, lng]);
    mapRef.current?.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    setPanelOpen(false);
  }

  async function handleDeletePaddock(id) {
    setMutating(true);
    setActionError('');
    try {
      await deletePaddock(id);
      await reloadAll();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setPendingDeleteId(id);
      } else {
        setActionError(err.message || 'No se pudo eliminar el potrero.');
      }
    } finally {
      setMutating(false);
    }
  }

  async function confirmForceDelete() {
    if (!pendingDeleteId) return;
    setMutating(true);
    setActionError('');
    try {
      await deletePaddock(pendingDeleteId, { confirm: true });
      await reloadAll();
      setPendingDeleteId(null);
    } catch (err) {
      setActionError(err.message || 'No se pudo eliminar el potrero.');
      setPendingDeleteId(null);
    } finally {
      setMutating(false);
    }
  }

  function goToPlace(place) {
    const lat = Number(place.lat);
    const lng = Number(place.lon);
    setSelectedPlace({ lat, lng, name: place.display_name });
    setPlaceQuery(place.display_name.split(',').slice(0, 2).join(','));
    setPlaceResults([]);
    mapRef.current?.flyTo([lat, lng], 14, { duration: 1.4 });
  }

  async function searchPlace(event) {
    event.preventDefault();
    if (placeQuery.trim().length < 3) return;
    setSearching(true);
    setPlaceError('');
    try {
      const params = new URLSearchParams({
        q: placeQuery.trim(),
        format: 'json',
        limit: '5',
        countrycodes: 'ar',
        'accept-language': 'es',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      if (!response.ok) throw new Error('Search failed');
      const places = await response.json();
      setPlaceResults(places);
      if (places.length > 0) {
        const first = places[0];
        const lat = Number(first.lat);
        const lng = Number(first.lon);
        setSelectedPlace({ lat, lng, name: first.display_name });
        mapRef.current?.flyTo([lat, lng], 14, { duration: 1.4 });
      } else setPlaceError('No encontramos ese lugar en Argentina.');
    } catch {
      setPlaceError('No se pudo realizar la búsqueda.');
    } finally {
      setSearching(false);
    }
  }

  const outlinePolygon = estancia?.geom
    ? { coordinates: geoJsonPolygonToCoords(estancia.geom), label: estancia.nombre }
    : null;

  const existingPolygons = paddocksWithCounts
    .filter((paddock) => paddock.id !== editingId)
    .map((paddock, index) => ({
      id: paddock.id,
      coordinates: paddock.coordinates,
      color: COLORS[index % COLORS.length],
      label: paddock.name,
    }));

  return (
    <main className="relative flex h-full min-h-[560px] overflow-hidden bg-[#0b0b0c] text-sm">
      <AddCattleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddCustomCattle}
        existingCaravanas={[...cattle.map((c) => c.caravana), ...pendingCattleList.map((c) => c.numero_identificacion)]}
        lockedPaddockLabel={name || 'Nuevo Potrero'}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteId)}
        title="Potrero con ganado asignado"
        message="Este potrero tiene ganado asignado. ¿Querés eliminarlo de todas formas?"
        confirmLabel="Eliminar de todas formas"
        danger
        loading={mutating}
        onConfirm={confirmForceDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      <button
        onClick={() => setPanelOpen(true)}
        className="absolute right-3 top-3 z-[1000] flex items-center gap-2 rounded-lg border border-white/10 bg-[#0f0f11] px-3.5 py-2.5 text-[11px] font-bold text-stone-300 shadow-xl lg:hidden">
        <LandPlot size={14} /> Potreros{' '}
        <span className="rounded bg-[#222227] px-1.5 py-0.5 text-[10px] text-white">
          {paddocksWithCounts.length}
        </span>
      </button>
      <aside
        className={`absolute inset-y-0 left-0 z-[1002] w-[min(90vw,315px)] overflow-y-auto border-r border-white/[.06] bg-[#0f0f11] p-5 text-stone-300 shadow-2xl transition-transform lg:relative lg:z-auto lg:w-[315px] lg:shrink-0 lg:translate-x-0 lg:shadow-none ${panelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button
          onClick={() => setPanelOpen(false)}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg bg-white/[.04] text-stone-500 lg:hidden">
          <X size={17} />
        </button>
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a1a1aa]">
          {editingId ? 'Edición de potrero' : 'Mapa satelital'}
        </p>
        <div className="flex items-center justify-between">
          <h1 className="mt-1 font-display text-2xl text-white">
            {editingId ? 'Editar potrero' : 'Dibujar potrero'}
          </h1>
          {editingId && (
            <button
              onClick={cancelEdit}
              className="mt-1 text-[10px] font-bold text-stone-500 hover:text-white">
              Cancelar
            </button>
          )}
        </div>
        <p className="mt-1 text-[11px] leading-4 text-stone-600 font-medium">
          Iniciá el trazado y marcá los vértices sobre el mapa de forma simple.
        </p>

        {actionError && (
          <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2.5 text-[11px] font-semibold text-red-400">
            {actionError}
          </p>
        )}

        <div className="mt-5 space-y-3">
          <div>
            <span className="text-[10px] font-bold text-stone-400">Nombre del Potrero</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Lote Norte"
              className="mt-1.5 w-full rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3.5 py-2.5 text-[12px] text-white outline-none focus:border-stone-500"
            />
          </div>

          {!editingId && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-stone-400">
                  Ganado asignado:{' '}
                  <strong className="text-emerald-400 font-bold">
                    {pendingCattleList.length} cabezas
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20">
                + Agregar ganado custom
              </button>

              {pendingCattleList.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {pendingCattleList.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-white/[.06] bg-white/[.03] px-3 py-2 text-[11px]">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-white">{item.numero_identificacion}</span>
                        <span className="ml-2 text-stone-400">{item.peso_kg ?? '-'} kg</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingCattleList((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="ml-2 grid size-6 place-items-center rounded text-stone-500 hover:bg-red-500/20 hover:text-red-400"
                        title="Quitar">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {editingId && (
            <p className="rounded-lg bg-white/[.02] border border-white/[.05] p-3 text-[11px] text-stone-500">
              Para gestionar el ganado de este potrero, hacelo desde la sección Ganado.
            </p>
          )}
        </div>

        {!isDrawing ? (
          <button
            onClick={startDrawing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-stone-700 bg-stone-800 py-3 text-[12px] font-bold text-stone-200 hover:bg-stone-700">
            <Play size={14} fill="currentColor" />{' '}
            {editingId ? 'Modificar trazado' : 'Iniciar trazado'}
          </button>
        ) : (
          <button
            onClick={finishDrawing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-[12px] font-bold text-black hover:bg-stone-200">
            <Check size={14} /> Terminar trazado
          </button>
        )}
        <div
          className={`mt-2.5 flex items-center gap-2 rounded-md px-3 py-2 text-[10px] ${isDrawing ? 'bg-stone-500/10 text-stone-200' : 'bg-white/[.025] text-stone-600'}`}>
          <span
            className={`size-2 rounded-full ${isDrawing ? 'animate-pulse bg-white' : 'bg-stone-700'}`}
          />
          {isDrawing
            ? 'Modo trazado activo: hacé clic sobre el mapa para conectar líneas'
            : 'El mapa está en modo navegación'}
        </div>

        <form
          onSubmit={handleCoordinateSubmit}
          className={`mt-4 rounded-lg border border-white/[.05] bg-white/[.025] p-3.5 ${!isDrawing ? 'opacity-45' : ''}`}>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-stone-400">
            <Crosshair size={14} /> Agregar coordenada exacta
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              disabled={!isDrawing}
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              type="number"
              step="any"
              placeholder="Latitud"
              aria-label="Latitud"
              className="min-w-0 rounded-md border border-white/[.07] bg-[#0b0b0c] px-3 py-2.5 text-[11px] text-white outline-none focus:border-stone-500"
            />
            <input
              disabled={!isDrawing}
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              type="number"
              step="any"
              placeholder="Longitud"
              aria-label="Longitud"
              className="min-w-0 rounded-md border border-white/[.07] bg-[#0b0b0c] px-3 py-2.5 text-[11px] text-white outline-none focus:border-stone-500"
            />
          </div>
          <button
            disabled={!isDrawing}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-white/[.07] bg-white/[.04] py-2.5 text-[11px] font-bold text-stone-300 hover:bg-white/[.07] disabled:cursor-not-allowed">
            <Plus size={13} /> Agregar vértice
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-[11px] font-bold text-stone-400">
            Vértices <span className="ml-1 text-stone-600">{vertices.length}</span>
          </p>
          {vertices.length > 0 && (
            <button
              onClick={() => setVertices((current) => current.slice(0, -1))}
              className="flex items-center gap-1 text-[11px] font-bold text-white hover:underline">
              <RotateCcw size={12} /> Deshacer
            </button>
          )}
        </div>
        <div className="mt-2.5 max-h-36 space-y-2 overflow-y-auto">
          {vertices.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/[.08] px-4 py-5 text-center text-[11px] text-stone-700">
              Todavía no agregaste vértices.
            </div>
          ) : (
            vertices.map((vertex, index) => (
              <div
                key={`${vertex.latitude}-${vertex.longitude}-${index}`}
                className="flex items-center gap-2 rounded-md bg-white/[.035] px-2.5 py-2 text-[11px]">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-stone-700 text-[10px] font-bold text-white">
                  {index + 1}
                </span>
                <span className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
                  <input
                    aria-label={`Latitud del vértice ${index + 1}`}
                    type="number"
                    step="any"
                    value={vertex.latitude}
                    onChange={(event) => updateVertex(index, 'latitude', event.target.value)}
                    className="min-w-0 rounded border border-white/[.06] bg-[#0b0b0c] px-2 py-1.5 text-[10px] text-stone-300 outline-none focus:border-stone-500"
                  />
                  <input
                    aria-label={`Longitud del vértice ${index + 1}`}
                    type="number"
                    step="any"
                    value={vertex.longitude}
                    onChange={(event) => updateVertex(index, 'longitude', event.target.value)}
                    className="min-w-0 rounded border border-white/[.06] bg-[#0b0b0c] px-2 py-1.5 text-[10px] text-stone-300 outline-none focus:border-stone-500"
                  />
                </span>
                <button
                  onClick={() =>
                    setVertices((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                  aria-label={`Eliminar vértice ${index + 1}`}
                  className="text-stone-600 hover:text-red-400">
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
        {error && (
          <p
            role="alert"
            className="mt-3.5 rounded-lg bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-400">
            {error}
          </p>
        )}
        {vertices.length >= 3 && (
          <div className="mt-3.5 flex items-center justify-between rounded-md bg-stone-800 px-3.5 py-2.5 text-[11px]">
            <span className="text-stone-400">Superficie estimada</span>
            <strong className="text-white">{areaHectares(vertices).toFixed(2)} ha</strong>
          </div>
        )}
        <button
          onClick={savePaddock}
          disabled={mutating}
          className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-[12px] font-bold text-black transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60">
          {mutating ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}{' '}
          {editingId ? 'Guardar cambios' : 'Guardar potrero'}
        </button>

        <div className="my-6 h-px bg-white/[.06]" />
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-white">Mis potreros</h2>
          <span className="rounded-full bg-white/[.05] px-2 py-1 text-[10px] font-bold text-stone-500">
            {paddocksLoading ? <LoaderCircle size={11} className="animate-spin" /> : paddocksWithCounts.length}
          </span>
        </div>
        <div className="mt-4 space-y-2.5">
          {paddocksWithCounts.length === 0 ? (
            <p className="py-4 text-center text-[11px] text-stone-700">
              Los potreros guardados aparecerán acá.
            </p>
          ) : (
            paddocksWithCounts.map((paddock, index) => (
              <div
                key={paddock.id}
                className="group flex items-center gap-2 rounded-lg border border-white/[.05] bg-white/[.025] p-3">
                <button
                  onClick={() => focusPaddock(paddock)}
                  className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-md text-white font-bold text-[11px]"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                    <MapPin size={14} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-[12px] text-stone-200">
                      {paddock.name}
                    </strong>
                    <small className="text-[10px] text-stone-500">
                      {paddock.hectares.toFixed(1)} ha · {paddock.animals} cabezas
                    </small>
                  </span>
                </button>
                <button
                  onClick={() => editPaddock(paddock)}
                  disabled={mutating}
                  aria-label={`Editar ${paddock.name}`}
                  className="grid size-8 place-items-center rounded-md text-stone-500 hover:bg-stone-850 hover:text-white disabled:opacity-50">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDeletePaddock(paddock.id)}
                  disabled={mutating}
                  aria-label={`Eliminar ${paddock.name}`}
                  className="grid size-8 place-items-center rounded-md text-stone-600 hover:bg-red-950/40 hover:text-red-400 disabled:opacity-50">
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>
      {panelOpen && (
        <button
          aria-label="Cerrar panel"
          onClick={() => setPanelOpen(false)}
          className="absolute inset-0 z-[1001] bg-black/60 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <section className="relative min-w-0 flex-1">
        <div className="absolute left-1/2 top-3 z-[1000] w-[min(88%,390px)] -translate-x-1/2">
          <form
            onSubmit={searchPlace}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0f0f11]/95 px-3.5 shadow-2xl backdrop-blur">
            <Search size={14} className="shrink-0 text-white" />
            <input
              value={placeQuery}
              onChange={(event) => setPlaceQuery(event.target.value)}
              placeholder="Buscar localidad o dirección..."
              className="min-w-0 flex-1 bg-transparent py-3 text-[12px] text-stone-250 outline-none placeholder:text-stone-750"
            />
            {searching && <LoaderCircle size={14} className="animate-spin text-stone-500" />}
            {placeQuery && !searching && (
              <button
                type="button"
                onClick={() => {
                  setPlaceQuery('');
                  setPlaceResults([]);
                  setPlaceError('');
                }}
                className="text-stone-600 hover:text-stone-300">
                <X size={14} />
              </button>
            )}
          </form>
          {placeResults.length > 1 && (
            <div className="mt-1 overflow-hidden rounded-lg border border-white/10 bg-[#0f0f11] shadow-2xl">
              {placeResults.map((place) => (
                <button
                  key={place.place_id}
                  onClick={() => goToPlace(place)}
                  className="flex w-full items-start gap-2 border-b border-white/[.05] px-3.5 py-2.5 text-left text-[11px] leading-4 text-stone-400 last:border-0 hover:bg-white/[.04] hover:text-stone-200">
                  <MapPin size={13} className="mt-0.5 shrink-0 text-white" />
                  {place.display_name}
                </button>
              ))}
            </div>
          )}
          {placeError && (
            <p className="mt-1 rounded-md bg-[#0f0f11] px-3.5 py-2.5 text-[11px] text-stone-400 shadow-xl">
              {placeError}
            </p>
          )}
        </div>
        <PolygonMapCanvas
          mapRef={mapRef}
          isDrawing={isDrawing}
          onMapClick={addVertex}
          vertices={vertices}
          existingPolygons={existingPolygons}
          outlinePolygon={outlinePolygon}
          selectedPlace={selectedPlace}
        />
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-[500] -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#0f0f11]/90 px-3.5 py-2.5 text-[10px] font-semibold text-stone-300 shadow-xl backdrop-blur">
          {isDrawing
            ? 'Hacé clic para marcar cada vértice en el mapa'
            : 'Iniciá un trazado desde el panel lateral'}
        </div>
      </section>
    </main>
  );
}
