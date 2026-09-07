import { useRef, useState } from 'react';
import { LoaderCircle, Plus, RotateCcw, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { createEstancia } from '../services/estanciaService.js';
import { coordsToGeoJsonPolygon } from '../services/mappers.js';
import { areaHectares, isSimplePolygon } from '../utils/geo.js';
import PolygonMapCanvas from '../components/PolygonMapCanvas.jsx';
import PlaceSearchBar from '../components/PlaceSearchBar.jsx';
import usePlaceSearch from '../hooks/usePlaceSearch.js';
import Logo from '../components/Logo.jsx';
import useBoundaryPreview from '../hooks/useBoundaryPreview.js';

export default function OnboardingEstanciaPage() {
  const navigate = useNavigate();
  const { refreshEstancia, logout } = useAuth();
  const mapRef = useRef(null);
  const placeSearch = usePlaceSearch({
    onSelect: (lat, lng) => mapRef.current?.flyTo([lat, lng], 14, { duration: 1.4 }),
  });

  const [name, setName] = useState('');
  const [vertices, setVertices] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const polygonIsSimple = isSimplePolygon(vertices);
  const boundary = useBoundaryPreview(vertices, vertices.length >= 3 && polygonIsSimple);

  function addVertex(lat, lng) {
    setVertices((current) => [...current, { latitude: Number(lat), longitude: Number(lng) }]);
    setError('');
  }

  function updateVertex(index, field, value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    setVertices((current) =>
      current.map((vertex, itemIndex) => (itemIndex === index ? { ...vertex, [field]: number } : vertex))
    );
  }

  function moveVertex(index, lat, lng) {
    setVertices((current) =>
      current.map((vertex, itemIndex) => (itemIndex === index ? { latitude: lat, longitude: lng } : vertex))
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
    if (
      vertices.some(
        ({ latitude, longitude }) => latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
      )
    ) {
      setError('Revisá las coordenadas de los vértices.');
      return;
    }
    if (!isSimplePolygon(vertices)) {
      setError('El polígono se cruza a sí mismo. Ajustá los vértices antes de guardar.');
      return;
    }
    if (!boundary.data?.disponible || boundary.pending || boundary.error) {
      setError('El límite todavía no está verificado como disponible. Ajustá el dibujo o esperá la comprobación.');
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

  const canSave = name.trim() && vertices.length >= 3 && polygonIsSimple && boundary.data?.disponible && !boundary.pending && !boundary.error;

  return (
    <main className="relative flex h-dvh min-h-[560px] flex-col overflow-hidden bg-[var(--canvas-deep)] text-sm md:flex-row">
      <aside className="relative z-[1002] max-h-[54dvh] w-full shrink-0 overflow-y-auto border-b border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--text-soft)] shadow-2xl md:max-h-none md:w-[340px] md:border-b-0 md:border-r md:p-5">
        <Logo size={36} />
        <h1 className="mt-4 font-display text-2xl text-[var(--text)] md:mt-6">Creá tu estancia</h1>
        <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
          Asignale un nombre y dibujá el límite general del establecimiento sobre el mapa.
        </p>

        <div className="mt-4">
          <label htmlFor="estancia-name" className="app-label">1. Nombre de la estancia</label>
          <input
            id="estancia-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Estancia La Esperanza"
            className="app-field text-base sm:text-sm"
          />
        </div>

        <div className="app-panel-muted mt-3 flex items-start gap-2 px-3 py-2.5 text-xs text-[var(--text-soft)]">
          <span aria-hidden="true" className="mt-1 size-2 shrink-0 rounded-full bg-[var(--accent-hover)]" />
          <span><strong className="text-[var(--text)]">2. Marcá el límite.</strong> Tocá el mapa para agregar puntos o editá sus coordenadas abajo.</span>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-[var(--text-soft)]">
            Vértices <span className="ml-1 text-[var(--text-muted)]">{vertices.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const center = mapRef.current?.getCenter?.();
                addVertex(center?.lat ?? -38.4161, center?.lng ?? -63.6167);
              }}
              className="app-button-ghost min-h-11 gap-1 text-xs">
              <Plus size={12} aria-hidden="true" /> Agregar vértice
            </button>
            {vertices.length > 0 && (
            <button
              type="button"
              onClick={() => setVertices((current) => current.slice(0, -1))}
              className="app-button-ghost min-h-11 gap-1 text-xs">
              <RotateCcw size={12} /> Deshacer
            </button>
            )}
          </div>
        </div>
        <div className="mt-2.5 max-h-36 space-y-2 overflow-y-auto">
          {vertices.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] px-4 py-5 text-center text-sm text-[var(--text-muted)]">
              Todavía no agregaste vértices.
            </div>
          ) : (
            vertices.map((vertex, index) => (
              <div
                key={`${vertex.latitude}-${vertex.longitude}-${index}`}
                className="app-panel-muted flex items-center gap-2 px-2.5 py-2 text-xs">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-forest-700 text-xs font-bold text-[var(--text)]">
                  {index + 1}
                </span>
                <span className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
                  <input
                    aria-label={`Latitud del vértice ${index + 1}`}
                    type="number"
                    step="any"
                    value={vertex.latitude}
                    onChange={(event) => updateVertex(index, 'latitude', event.target.value)}
                    className="app-field min-h-11 min-w-0 px-2 py-1.5 text-sm"
                  />
                  <input
                    aria-label={`Longitud del vértice ${index + 1}`}
                    type="number"
                    step="any"
                    value={vertex.longitude}
                    onChange={(event) => updateVertex(index, 'longitude', event.target.value)}
                    className="app-field min-h-11 min-w-0 px-2 py-1.5 text-sm"
                  />
                </span>
                <button
                  onClick={() => setVertices((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  aria-label={`Eliminar vértice ${index + 1}`}
                  className="app-icon-button shrink-0 border-0 bg-transparent hover:text-[var(--danger)]">
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="app-panel-muted mt-3 px-3 py-2 text-xs" aria-live="polite">
          <p>Rojo punteado: zona ya registrada. Tu límite no puede cruzarla ni tocar su borde.</p>
          <p className="mt-1">{vertices.length < 3 ? 'Marcá al menos 3 puntos para consultar los límites cercanos.'
            : boundary.pending ? 'Verificando superposición…'
            : boundary.error ? `No se pudo verificar: ${boundary.error}`
            : boundary.data?.incompleto ? 'Hay demasiadas zonas. Reducí la extensión del dibujo.'
            : boundary.data?.disponible ? 'Sin superposición detectada. Se volverá a validar al guardar.'
            : boundary.data ? 'Tu límite cruza o toca una zona registrada. Mové los vértices fuera del borde rojo.' : ''}</p>
          <p className="mt-1 text-[var(--text-muted)]">Referencia de registros de TerraBovina, no un límite catastral. Fuera del rojo no implica disponibilidad hasta verificar el dibujo.</p>
        </div>
        {error && (
          <p role="alert" aria-live="assertive" className="app-error mt-3.5 text-sm">
            {error}
          </p>
        )}
        {vertices.length >= 3 && !polygonIsSimple && !error && (
          <p role="alert" className="app-error mt-3.5 text-sm">
            El polígono se cruza a sí mismo. Ajustá los vértices antes de guardar.
          </p>
        )}
        {vertices.length >= 3 && (
          <div className="mt-3.5 flex items-center justify-between rounded-md bg-forest-800 px-3.5 py-2.5 text-xs">
            <span className="text-[var(--text-soft)]">Superficie estimada</span>
            <strong className="text-[var(--text)]">{areaHectares(vertices).toFixed(2)} ha</strong>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          aria-describedby={!canSave ? 'onboarding-save-hint' : undefined}
          className="app-button-primary mt-3.5 w-full disabled:opacity-50">
          {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
          Crear estancia
        </button>
        {!canSave && (
          <p id="onboarding-save-hint" className="mt-2 text-center text-xs text-[var(--text-muted)]">
            Completá el nombre y un límite válido, sin superposición, para guardar.
          </p>
        )}
        <button
          onClick={logout}
          className="app-button-ghost mt-1 w-full text-xs">
          Cerrar sesión
        </button>
      </aside>

      <section className="relative min-h-0 min-w-0 flex-1">
        <PlaceSearchBar
          {...placeSearch}
          className="absolute left-14 right-3 top-3 z-[1000] md:left-1/2 md:right-auto md:w-[min(88%,390px)] md:-translate-x-1/2"
        />
        <PolygonMapCanvas
          mapRef={mapRef}
          isDrawing
          onMapClick={addVertex}
          vertices={vertices}
          occupiedZones={boundary.zones}
          selectedPlace={placeSearch.selectedPlace}
          invalid={vertices.length >= 3 && (!polygonIsSimple || (boundary.data && !boundary.data.disponible))}
          onVertexDrag={moveVertex}
        />
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[500] rounded-md border border-[var(--border)] bg-[var(--surface)]/95 px-3.5 py-2.5 text-center text-xs font-semibold text-[var(--text-soft)] shadow-xl sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:whitespace-nowrap">
          Tocá o hacé clic para marcar cada vértice
        </div>
      </section>
    </main>
  );
}
