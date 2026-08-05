import { useRef, useState } from 'react';
import {
  Check,
  Crosshair,
  LoaderCircle,
  Leaf,
  Play,
  Plus,
  RotateCcw,
  Save,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { createEstancia } from '../services/estanciaService.js';
import { coordsToGeoJsonPolygon } from '../services/mappers.js';
import { areaHectares } from '../utils/geo.js';
import PolygonMapCanvas from '../components/PolygonMapCanvas.jsx';

export default function OnboardingEstanciaPage() {
  const navigate = useNavigate();
  const { refreshEstancia, logout } = useAuth();
  const mapRef = useRef(null);

  const [name, setName] = useState('');
  const [vertices, setVertices] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function addVertex(lat, lng) {
    setVertices((current) => [...current, { latitude: Number(lat), longitude: Number(lng) }]);
    setError('');
  }

  function startDrawing() {
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

  function handleCoordinateSubmit(event) {
    event.preventDefault();
    if (!isDrawing) {
      setError('Iniciá el trazado antes de agregar coordenadas.');
      return;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setError('Ingresá coordenadas válidas.');
      return;
    }
    addVertex(lat, lng);
    setLatitude('');
    setLongitude('');
    mapRef.current?.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 13));
  }

  function updateVertex(index, field, value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    setVertices((current) =>
      current.map((vertex, itemIndex) => (itemIndex === index ? { ...vertex, [field]: number } : vertex))
    );
  }

  async function handleSave() {
    setError('');
    if (!name.trim()) {
      setError('Asignale un nombre a la estancia.');
      return;
    }
    if (vertices.length < 3) {
      setError('El límite de la estancia necesita al menos 3 vértices.');
      return;
    }
    if (isDrawing) {
      setError('Terminá el trazado antes de guardar.');
      return;
    }
    setSaving(true);
    try {
      await createEstancia({ nombre: name.trim(), geom: coordsToGeoJsonPolygon(vertices) });
      await refreshEstancia();
      navigate('/resumen');
    } catch (err) {
      setError(err.message || 'No se pudo crear la estancia.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="relative flex h-dvh min-h-[560px] overflow-hidden bg-[#0b0b0c] text-sm">
      <aside className="relative z-[1002] w-[min(90vw,340px)] shrink-0 overflow-y-auto border-r border-white/[.06] bg-[#0f0f11] p-5 text-stone-300 shadow-2xl">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-[#222227] text-white">
            <Leaf size={16} />
          </span>
          <strong className="text-[13px] font-bold text-white">TERRABOVINA</strong>
        </div>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[.2em] text-[#a1a1aa]">
          Primeros pasos
        </p>
        <h1 className="mt-1 font-display text-2xl text-white">Creá tu estancia</h1>
        <p className="mt-1 text-[11px] leading-4 text-stone-600 font-medium">
          Asignale un nombre y dibujá el límite general del establecimiento sobre el mapa.
        </p>

        <div className="mt-5">
          <span className="text-[10px] font-bold text-stone-400">Nombre de la estancia</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Estancia La Esperanza"
            className="mt-1.5 w-full rounded-lg border border-white/[.08] bg-[#0b0b0c] px-3.5 py-2.5 text-[12px] text-white outline-none focus:border-stone-500"
          />
        </div>

        {!isDrawing ? (
          <button
            onClick={startDrawing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-stone-700 bg-stone-800 py-3 text-[12px] font-bold text-stone-200 hover:bg-stone-700">
            <Play size={14} fill="currentColor" /> Iniciar trazado
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
          <span className={`size-2 rounded-full ${isDrawing ? 'animate-pulse bg-white' : 'bg-stone-700'}`} />
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
                  onClick={() => setVertices((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  aria-label={`Eliminar vértice ${index + 1}`}
                  className="text-stone-600 hover:text-red-400">
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3.5 rounded-lg bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-400">
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
          onClick={handleSave}
          disabled={saving}
          className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-[12px] font-bold text-black transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60">
          {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
          Crear estancia
        </button>
        <button
          onClick={logout}
          className="mt-2 w-full text-center text-[11px] font-semibold text-stone-600 hover:text-white">
          Cerrar sesión
        </button>
      </aside>

      <section className="relative min-w-0 flex-1">
        <PolygonMapCanvas mapRef={mapRef} isDrawing={isDrawing} onMapClick={addVertex} vertices={vertices} />
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-[500] -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#0f0f11]/90 px-3.5 py-2.5 text-[10px] font-semibold text-stone-300 shadow-xl backdrop-blur">
          {isDrawing
            ? 'Hacé clic para marcar cada vértice en el mapa'
            : 'Iniciá un trazado desde el panel lateral'}
        </div>
      </section>
    </main>
  );
}
