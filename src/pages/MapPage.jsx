import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LandPlot,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import usePaddocks from '../hooks/usePaddocks.js';
import useCattle from '../hooks/useCattle.js';
import usePlaceSearch from '../hooks/usePlaceSearch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { areaHectares, isSimplePolygon } from '../utils/geo.js';
import { COLORS } from '../utils/mapConstants.js';
import AddCattleModal from '../components/AddCattleModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PolygonMapCanvas from '../components/PolygonMapCanvas.jsx';
import PlaceSearchBar from '../components/PlaceSearchBar.jsx';
import { buildPaddockPayload, coordsToGeoJsonPolygon, geoJsonPolygonToCoords, withAnimalCounts } from '../services/mappers.js';
import { createPaddock, deletePaddock, updatePaddock } from '../services/paddockService.js';
import { createCattleForPaddock } from '../services/cattleService.js';
import { deleteEstancia, updateEstancia } from '../services/estanciaService.js';
import { ApiError } from '../services/api.js';

export default function MapPage() {
  const navigate = useNavigate();
  const { estanciaId, estancia, refreshEstancia } = useAuth();
  const {
    paddocks,
    loading: paddocksLoading,
    error: paddocksError,
    reload: reloadPaddocks,
  } = usePaddocks(estanciaId);
  const {
    cattle,
    loading: cattleLoading,
    error: cattleError,
    reload: reloadCattle,
  } = useCattle(estanciaId);
  const paddocksWithCounts = withAnimalCounts(paddocks, cattle);

  const [name, setName] = useState('');
  const [vertices, setVertices] = useState([]);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editMode, setEditMode] = useState('potrero'); // 'potrero' | 'estancia'
  const [estanciaMode, setEstanciaMode] = useState('view'); // 'view' | 'edit' (solo aplica si editMode === 'estancia')
  const [potreroMode, setPotreroMode] = useState('home'); // 'home' | 'draw' (solo aplica si editMode === 'potrero' && !editingId)
  const [mutating, setMutating] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [estanciaDeleteConfirmation, setEstanciaDeleteConfirmation] = useState(null);
  const [addingToPaddock, setAddingToPaddock] = useState(null);
  const [selectedPaddock, setSelectedPaddock] = useState(null);
  const mapRef = useRef(null);
  const placeSearch = usePlaceSearch({
    onSelect: (lat, lng) => mapRef.current?.flyTo([lat, lng], 14, { duration: 1.4 }),
  });
  const { selectedPlace } = placeSearch;

  async function reloadAll() {
    await Promise.all([reloadPaddocks(), reloadCattle()]);
  }

  function openAddCattle(paddock) {
    setEditingId(null);
    setEditMode('potrero');
    setName('');
    setVertices([]);
    setIsDrawing(false);
    setError('');
    setAddingToPaddock(paddock);
    focusPaddock(paddock);
    setPanelOpen(true);
  }

  async function handleAddCattleToPaddock({ animals }) {
    if (!addingToPaddock) throw new Error('Seleccioná un potrero antes de agregar ganado.');
    if (!estanciaId || cattleLoading || cattleError) {
      throw new Error('No se puede agregar ganado hasta completar la carga de datos.');
    }
    setMutating(true);
    setActionError('');
    let createdCount = 0;
    try {
      for (const payload of animals) {
        await createCattleForPaddock(addingToPaddock.id, payload);
        createdCount += 1;
      }
      await reloadAll();
      setAddingToPaddock(null);
    } catch (err) {
      if (createdCount > 0) await reloadAll().catch(() => {});
      const message = createdCount > 0
        ? `Se registraron ${createdCount} ${createdCount === 1 ? 'animal' : 'animales'}, pero el lote quedó incompleto. Revisá el rodeo antes de reintentar.`
        : err.message || 'No se pudo agregar el ganado.';
      setActionError(message);
      throw new Error(message, { cause: err });
    } finally {
      setMutating(false);
    }
  }

  function addVertex(lat, lng) {
    setVertices((current) => [...current, { latitude: Number(lat), longitude: Number(lng) }]);
    setError('');
  }

  async function savePaddock() {
    if (!estanciaId || paddocksLoading || paddocksError) {
      setError('No se puede guardar el potrero hasta completar la carga de la estancia.');
      return;
    }
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
    if (!isSimplePolygon(vertices)) {
      setError('El polígono se cruza a sí mismo. Ajustá los vértices antes de guardar.');
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
        await createPaddock(estanciaId, payload);
      }
      await reloadAll();
      setName('');
      setVertices([]);
      setEditingId(null);
    } catch (err) {
      setActionError(err.message || 'No se pudo guardar el potrero.');
    } finally {
      setMutating(false);
    }
  }

  function editPaddock(paddock) {
    setEditMode('potrero');
    setPotreroMode('home');
    setEditingId(paddock.id);
    setName(paddock.name);
    setVertices(paddock.coordinates.map((coordinate) => ({ ...coordinate })));
    setIsDrawing(true);
    setError('');
    focusPaddock(paddock);
    setPanelOpen(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setName('');
    setVertices([]);
    setIsDrawing(false);
    setError('');
  }

  function openDrawPaddock() {
    setEditMode('potrero');
    setPotreroMode('draw');
    setEditingId(null);
    setName('');
    setVertices([]);
    setIsDrawing(true);
    setError('');
    setActionError('');
  }

  function cancelDrawPaddock() {
    setPotreroMode('home');
    setName('');
    setVertices([]);
    setIsDrawing(false);
    setError('');
  }

  function viewEstancia() {
    if (!outlinePolygon) return;
    setEditMode('estancia');
    setEstanciaMode('view');
    setPotreroMode('home');
    setEditingId(null);
    setName('');
    setVertices([]);
    setIsDrawing(false);
    setError('');
    setActionError('');
    const bounds = outlinePolygon.coordinates.map(({ latitude: lat, longitude: lng }) => [lat, lng]);
    mapRef.current?.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    setPanelOpen(true);
  }

  function startEstanciaEdit() {
    if (!outlinePolygon) return;
    setEditMode('estancia');
    setEstanciaMode('edit');
    setEditingId(null);
    setName('');
    setVertices(outlinePolygon.coordinates.map((coordinate) => ({ ...coordinate })));
    setIsDrawing(true);
    setError('');
    setActionError('');
    const bounds = outlinePolygon.coordinates.map(({ latitude: lat, longitude: lng }) => [lat, lng]);
    mapRef.current?.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    setPanelOpen(false);
  }

  function closeEstanciaView() {
    setEditMode('potrero');
    setEstanciaMode('view');
    setPotreroMode('home');
  }

  function cancelEstanciaEdit() {
    setEstanciaMode('view');
    setVertices([]);
    setIsDrawing(false);
    setError('');
  }

  async function saveEstanciaBoundary() {
    if (!estanciaId) {
      setError('No se puede guardar el límite porque faltan datos de la estancia.');
      return;
    }
    if (vertices.length < 3) {
      setError('El límite de la estancia necesita al menos 3 vértices.');
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
    if (!isSimplePolygon(vertices)) {
      setError('El polígono se cruza a sí mismo. Ajustá los vértices antes de guardar.');
      return;
    }

    setMutating(true);
    setActionError('');
    setError('');
    try {
      await updateEstancia(estanciaId, { geom: coordsToGeoJsonPolygon(vertices) });
      await refreshEstancia();
      setEditMode('potrero');
      setVertices([]);
    } catch (err) {
      const afectados = err.data?.potrerosAfectados;
      const detalle =
        Array.isArray(afectados) && afectados.length > 0
          ? ` Potreros afectados: ${afectados.map((p) => p.nombre).join(', ')}.`
          : '';
      setActionError((err.message || 'No se pudo actualizar el límite de la estancia.') + detalle);
    } finally {
      setMutating(false);
    }
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

  function moveVertex(index, lat, lng) {
    setVertices((current) =>
      current.map((vertex, itemIndex) =>
        itemIndex === index ? { latitude: lat, longitude: lng } : vertex
      )
    );
  }

  function focusPaddock(paddock) {
    const bounds = paddock.coordinates.map(({ latitude: lat, longitude: lng }) => [lat, lng]);
    mapRef.current?.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    setPanelOpen(false);
  }

  function handlePolygonSelect(paddockId) {
    const paddock = paddocksWithCounts.find((p) => p.id === paddockId);
    if (!paddock) return;
    openPaddockPicker(paddock);
  }

  function openPaddockPicker(paddock) {
    focusPaddock(paddock);
    setSelectedPaddock(paddock);
    setPanelOpen(true);
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

  async function confirmEstanciaDelete() {
    if (!estanciaId || !estanciaDeleteConfirmation) return;
    const force = estanciaDeleteConfirmation.requiresConfirmation === true;

    setMutating(true);
    setActionError('');
    try {
      await deleteEstancia(estanciaId, { confirm: force });
      setEstanciaDeleteConfirmation(null);
      await refreshEstancia();
    } catch (err) {
      if (!force && err instanceof ApiError && err.status === 409 && err.data?.requiresConfirmation) {
        setEstanciaDeleteConfirmation({
          requiresConfirmation: true,
          potrerosAfectados: Number(err.data.potrerosAfectados) || 0,
          ganadoAfectado: Number(err.data.ganadoAfectado) || 0,
        });
      } else {
        setActionError(err.message || 'No se pudo eliminar la estancia.');
        setEstanciaDeleteConfirmation(null);
      }
    } finally {
      setMutating(false);
    }
  }

  const outlinePolygon = estancia?.geom
    ? { coordinates: geoJsonPolygonToCoords(estancia.geom), label: estancia.nombre }
    : null;

  const polygonIsSimple = isSimplePolygon(vertices);
  const paddockDataIncomplete = !estanciaId || paddocksLoading || Boolean(paddocksError);
  const cattleDataIncomplete = !estanciaId || cattleLoading || Boolean(cattleError);

  const existingPolygons = paddocksWithCounts
    .filter((paddock) => paddock.id !== editingId)
    .map((paddock, index) => ({
      id: paddock.id,
      coordinates: paddock.coordinates,
      color: COLORS[index % COLORS.length],
      label: paddock.name,
    }));

  // Al editar un potrero puntual o el límite de la estancia, acotamos el
  // mapa a esa superficie (mismo criterio para ambos casos).
  const restrictTo =
    editMode === 'estancia'
      ? outlinePolygon?.coordinates ?? null
      : editMode === 'potrero' && editingId && !addingToPaddock
        ? paddocksWithCounts.find((p) => p.id === editingId)?.coordinates ?? null
        : null;

  return (
    <div className="map-page relative flex h-full min-h-[360px] overflow-hidden bg-[var(--canvas-deep)] text-sm text-[var(--text-soft)]">
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
      <ConfirmDialog
        isOpen={Boolean(estanciaDeleteConfirmation)}
        title={
          estanciaDeleteConfirmation?.requiresConfirmation
            ? 'La estancia tiene datos asociados'
            : 'Eliminar estancia'
        }
        message={
          estanciaDeleteConfirmation?.requiresConfirmation
            ? `También se darán de baja ${estanciaDeleteConfirmation.potrerosAfectados} ${estanciaDeleteConfirmation.potrerosAfectados === 1 ? 'potrero' : 'potreros'} y ${estanciaDeleteConfirmation.ganadoAfectado} ${estanciaDeleteConfirmation.ganadoAfectado === 1 ? 'animal' : 'animales'}. Esta acción no se puede deshacer.`
            : `¿Querés eliminar ${estancia?.nombre || 'esta estancia'}? Esta acción no se puede deshacer.`
        }
        confirmLabel={
          estanciaDeleteConfirmation?.requiresConfirmation
            ? 'Eliminar todo'
            : 'Eliminar estancia'
        }
        danger
        loading={mutating}
        onConfirm={confirmEstanciaDelete}
        onCancel={() => setEstanciaDeleteConfirmation(null)}
      />

      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        aria-label={`Abrir panel de potreros, ${paddocksWithCounts.length} en total`}
        aria-controls="map-management-panel"
        aria-expanded={panelOpen}
        className="app-button-secondary absolute right-3 top-16 z-[1001] px-3 shadow-xl md:top-3 lg:hidden">
        <LandPlot size={14} /> Potreros{' '}
        <span className="rounded bg-forest-700 px-1.5 py-0.5 text-xs text-[var(--text)]">
          {paddocksWithCounts.length}
        </span>
      </button>
      <aside
        id="map-management-panel"
        aria-label="Panel de gestión del mapa"
        className={`absolute bottom-0 left-0 top-14 z-[1002] ${addingToPaddock ? 'w-[min(94vw,560px)] lg:w-[560px]' : 'w-[min(92vw,340px)] lg:w-[340px]'} overflow-y-auto overscroll-contain border-r border-[var(--border)] bg-[var(--surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-14 text-[var(--text-soft)] shadow-2xl transition-transform md:top-0 lg:relative lg:inset-y-0 lg:z-auto lg:shrink-0 lg:translate-x-0 lg:p-5 lg:shadow-none ${panelOpen ? 'visible translate-x-0' : 'invisible -translate-x-full lg:visible'}`}>
        <button
          type="button"
          onClick={() => setPanelOpen(false)}
          aria-label="Cerrar panel de gestión"
          className="app-icon-button absolute right-3 top-3 lg:hidden">
          <X size={17} aria-hidden="true" />
        </button>

        {actionError && (
          <p role="alert" aria-live="assertive" className="app-error mt-3 text-sm">
            {actionError}
          </p>
        )}
        {(paddocksError || cattleError) && (
          <div role="alert" aria-live="polite" className="app-error mt-3 space-y-1 text-sm">
            {paddocksError && <p>Potreros: {paddocksError}</p>}
            {cattleError && <p>Ganado: {cattleError}</p>}
            <p className="text-xs">Las acciones que dependen de esos datos quedan deshabilitadas.</p>
          </div>
        )}

        {addingToPaddock ? (
          <AddCattleModal
            isOpen
            variant="inline"
            onClose={() => setAddingToPaddock(null)}
            onAdd={handleAddCattleToPaddock}
            existingCaravanas={cattle.map((c) => c.caravana)}
            cattle={cattle}
            lockedPaddockId={addingToPaddock.id}
            lockedPaddockLabel={addingToPaddock.name}
          />
        ) : selectedPaddock ? (
          <>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--text-muted)]">Potrero</p>
            <div className="flex items-center justify-between">
              <h1 className="mt-1 font-display text-2xl text-[var(--text)]">{selectedPaddock.name}</h1>
              <button
                type="button"
                onClick={() => setSelectedPaddock(null)}
                aria-label={`Cerrar acciones de ${selectedPaddock.name}`}
                className="app-button-ghost mt-1 min-h-11 text-xs">
                Cerrar
              </button>
            </div>
            <p className="mt-1 text-sm font-medium leading-5 text-[var(--text-muted)]">
              Elegí qué querés hacer con este potrero.
            </p>

            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => {
                  const paddock = selectedPaddock;
                  setSelectedPaddock(null);
                  editPaddock(paddock);
                }}
                aria-label={`Editar límites de ${selectedPaddock.name}`}
                disabled={paddockDataIncomplete}
                className="app-button-secondary min-h-12 w-full justify-start px-3.5 py-3 text-left disabled:opacity-50">
                <Pencil size={15} className="shrink-0 text-[var(--text-soft)]" />
                <span>
                  <span className="block text-xs font-bold text-[var(--text)]">Editar límites</span>
                  <span className="block text-xs text-[var(--text-muted)]">Modificar el trazado de este potrero.</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const paddock = selectedPaddock;
                  setSelectedPaddock(null);
                  openAddCattle(paddock);
                }}
                aria-label={`Agregar ganado a ${selectedPaddock.name}`}
                disabled={cattleDataIncomplete || selectedPaddock.enabledForCattle === false}
                className="app-button-secondary min-h-12 w-full justify-start px-3.5 py-3 text-left disabled:opacity-50">
                <Plus size={15} className="shrink-0 text-[var(--text-soft)]" />
                <span>
                  <span className="block text-xs font-bold text-[var(--text)]">Agregar ganado</span>
                  <span className="block text-xs text-[var(--text-muted)]">Incorporar animales a este potrero.</span>
                </span>
              </button>

              <button
                type="button"
                aria-label={`Ver detalle de ${selectedPaddock.name}`}
                onClick={() => navigate(`/potreros/${selectedPaddock.id}`)}
                className="app-button-secondary min-h-12 w-full justify-start px-3.5 py-3 text-left">
                <LandPlot size={15} className="shrink-0 text-[var(--text-soft)]" />
                <span>
                  <span className="block text-xs font-bold text-[var(--text)]">Ver detalle del potrero</span>
                  <span className="block text-xs text-[var(--text-muted)]">Pasto, clima, ganado y traslados.</span>
                </span>
              </button>
            </div>
          </>
        ) : (
        <>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--text-muted)]">
          {editMode === 'estancia'
            ? estanciaMode === 'edit'
              ? 'Límite de la estancia'
              : 'Tu estancia'
            : editingId
              ? 'Edición de potrero'
              : 'Mapa satelital'}
        </p>
        <div className="flex items-center justify-between">
          <h1 className="mt-1 font-display text-2xl text-[var(--text)]">
            {editMode === 'estancia'
              ? estanciaMode === 'edit'
                ? 'Editar límite'
                : estancia?.nombre || 'Estancia'
              : editingId
                ? 'Editar potrero'
                : potreroMode === 'draw'
                  ? 'Dibujar potrero'
                  : 'Tus potreros'}
          </h1>
          {(editingId || editMode === 'estancia' || (editMode === 'potrero' && potreroMode === 'draw')) && (
            <button
              onClick={
                editMode === 'estancia'
                  ? estanciaMode === 'edit'
                    ? cancelEstanciaEdit
                    : closeEstanciaView
                  : editingId
                    ? cancelEdit
                    : cancelDrawPaddock
              }
              className="app-button-ghost mt-1 min-h-11 text-xs">
              {editMode === 'estancia' && estanciaMode === 'view' ? 'Cerrar' : 'Cancelar'}
            </button>
          )}
        </div>
        <p className="mt-1 text-sm font-medium leading-5 text-[var(--text-muted)]">
          {editMode === 'estancia'
            ? estanciaMode === 'edit'
              ? 'Modificá el trazado del límite general de la estancia.'
              : 'Información general de tu estancia.'
            : editMode === 'potrero' && !editingId && potreroMode === 'home'
              ? 'Dibujá un potrero, editá el límite de la estancia o elegí un potrero de la lista.'
              : 'Iniciá el trazado y marcá los vértices sobre el mapa de forma simple.'}
        </p>

        {editMode === 'potrero' && !editingId && potreroMode === 'home' && outlinePolygon && (
          <div className="mt-4 space-y-2">
            <button type="button" onClick={openDrawPaddock} disabled={paddockDataIncomplete} className="app-button-primary w-full">
              <Plus size={14} /> Dibujar potrero
            </button>
            <button type="button" onClick={startEstanciaEdit} disabled={!estanciaId} className="app-button-secondary w-full">
              <Pencil size={14} /> Editar límite
            </button>
            <button
              type="button"
              onClick={viewEstancia}
              className="app-button-secondary w-full text-xs">
              <LandPlot size={13} /> Ver estancia
            </button>
          </div>
        )}

        {editMode === 'potrero' && (editingId || potreroMode === 'draw') && (
          <div className="mt-5 space-y-3">
            <div>
              <label htmlFor="paddock-name" className="app-label">Nombre del potrero</label>
              <input
                id="paddock-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Lote Norte"
                className="app-field text-base sm:text-sm"
              />
            </div>
            {editingId && (
              <p className="app-panel-muted p-3 text-sm text-[var(--text-muted)]">
                Para agregar ganado a este potrero, usá el botón{' '}
                <Plus size={11} className="inline -mt-0.5" /> de la lista de potreros de abajo.
              </p>
            )}
          </div>
        )}

        {editMode === 'estancia' && estanciaMode === 'view' ? (
          <div className="mt-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="app-panel-muted p-3.5">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Superficie</p>
                <p className="mt-1 text-[15px] font-bold text-[var(--text)]">
                  {areaHectares(outlinePolygon?.coordinates ?? []).toFixed(2)} ha
                </p>
              </div>
              <div className="app-panel-muted p-3.5">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Potreros</p>
                <p className="mt-1 text-[15px] font-bold text-[var(--text)]">{paddocksWithCounts.length}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={startEstanciaEdit}
              disabled={!estanciaId}
              className="app-button-primary w-full disabled:opacity-50">
              <Pencil size={14} /> Editar límite
            </button>
            <button
              type="button"
              onClick={openDrawPaddock}
              disabled={paddockDataIncomplete}
              className="app-button-secondary w-full disabled:opacity-50">
              <Plus size={14} /> Dibujar potrero
            </button>
            <details className="mt-6 border-t border-[var(--border)] pt-3">
              <summary className="min-h-11 cursor-pointer py-3 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)]">
                Administración de la estancia
              </summary>
              <p className="mb-3 text-xs text-[var(--text-muted)]">Acciones permanentes fuera del flujo habitual de dibujo.</p>
              <button
                type="button"
                onClick={() => {
                  setActionError('');
                  setEstanciaDeleteConfirmation({ requiresConfirmation: false });
                }}
                disabled={mutating || !estanciaId}
                className="app-button-ghost w-full text-[var(--danger)] hover:bg-danger-400/10 disabled:opacity-50">
                <Trash2 size={14} /> Eliminar estancia
              </button>
            </details>
          </div>
        ) : editMode === 'potrero' && !editingId && potreroMode === 'home' ? null : (
        <>
        <div className="app-panel-muted mt-4 flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-soft)]">
          <span className="size-2 shrink-0 rounded-full bg-[var(--accent-hover)]" />
          Hacé clic sobre el mapa para marcar cada vértice. Arrastrá los puntos para ajustarlos.
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
                  onClick={() =>
                    setVertices((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                  aria-label={`Eliminar vértice ${index + 1}`}
                  className="app-icon-button shrink-0 border-0 bg-transparent hover:text-[var(--danger)]">
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
        {error && (
          <p
            role="alert"
            className="app-error mt-3.5 text-sm font-semibold">
            {error}
          </p>
        )}
        {vertices.length >= 3 && !polygonIsSimple && (
          <p
            role="alert"
            className="app-error mt-3.5 text-sm font-semibold">
            El polígono se cruza a sí mismo. Arrastrá los vértices para corregirlo antes de guardar.
          </p>
        )}
        {vertices.length >= 3 && (
          <div className="mt-3.5 flex items-center justify-between rounded-md bg-forest-800 px-3.5 py-2.5 text-xs">
            <span className="text-[var(--text-soft)]">Superficie estimada</span>
            <strong className="text-[var(--text)]">{areaHectares(vertices).toFixed(2)} ha</strong>
          </div>
        )}
        <button
          onClick={editMode === 'estancia' ? saveEstanciaBoundary : savePaddock}
          disabled={mutating || (vertices.length >= 3 && !polygonIsSimple) || (editMode === 'estancia' ? !estanciaId : paddockDataIncomplete)}
          className="app-button-primary mt-3.5 w-full disabled:opacity-50">
          {mutating ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}{' '}
          {editMode === 'estancia' ? 'Guardar límite' : editingId ? 'Guardar cambios' : 'Guardar potrero'}
        </button>
        </>
        )}

        <div className="my-6 h-px bg-[var(--border)]" />
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-[var(--text)]">Mis potreros</h2>
          <span className="rounded-full bg-sand-100/[.05] px-2 py-1 text-xs font-bold text-[var(--text-muted)]">
            {paddocksLoading ? <LoaderCircle size={11} className="animate-spin" /> : paddocksWithCounts.length}
          </span>
        </div>
        <div className="mt-4 space-y-2.5">
          {paddocksWithCounts.length === 0 ? (
            <p className="py-4 text-center text-sm text-[var(--text-muted)]">
              Los potreros guardados aparecerán acá.
            </p>
          ) : (
            paddocksWithCounts.map((paddock, index) => (
              <div
                key={paddock.id}
                className="group flex items-center gap-2 rounded-lg border border-[var(--border)] bg-sand-100/[.025] p-3">
                <button
                  onClick={() => openPaddockPicker(paddock)}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3.5 text-left">
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-md text-xs font-bold text-[var(--text)]"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                    <MapPin size={14} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-xs text-[var(--text)]">
                      {paddock.name}
                    </strong>
                    <small className="text-xs text-[var(--text-muted)]">
                      {paddock.hectares.toFixed(1)} ha · {cattleDataIncomplete ? 'ganado sin cargar' : `${paddock.animals} cabezas`}
                      {paddock.enabledForCattle === false && ' · Fuera de uso'}
                    </small>
                  </span>
                </button>
                <button
                  onClick={() => openAddCattle(paddock)}
                  disabled={mutating || cattleDataIncomplete || paddock.enabledForCattle === false || (editMode === 'estancia' && estanciaMode === 'edit')}
                  aria-label={`Agregar ganado a ${paddock.name}`}
                  title="Agregar ganado"
                  className="app-icon-button shrink-0 border-0 bg-transparent disabled:opacity-50">
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => editPaddock(paddock)}
                  disabled={mutating || paddockDataIncomplete || (editMode === 'estancia' && estanciaMode === 'edit')}
                  aria-label={`Editar ${paddock.name}`}
                  className="app-icon-button shrink-0 border-0 bg-transparent disabled:opacity-50">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDeletePaddock(paddock.id)}
                  disabled={mutating || paddockDataIncomplete || (editMode === 'estancia' && estanciaMode === 'edit')}
                  aria-label={`Eliminar ${paddock.name}`}
                  className="app-icon-button shrink-0 border-0 bg-transparent text-[var(--text-muted)] hover:text-[var(--danger)] disabled:opacity-50">
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
        </>
        )}
      </aside>
      {panelOpen && (
        <button
          aria-label="Cerrar panel"
          onClick={() => setPanelOpen(false)}
          className="absolute inset-0 z-[1001] bg-black/60 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <section className="relative min-w-0 flex-1">
        <PlaceSearchBar
          {...placeSearch}
          className="absolute left-3 right-3 top-32 z-[1000] md:left-14 md:right-36 md:top-3 lg:left-1/2 lg:right-auto lg:w-[min(70%,390px)] lg:-translate-x-1/2"
        />
        <PolygonMapCanvas
          mapRef={mapRef}
          isDrawing={isDrawing}
          onMapClick={addVertex}
          vertices={vertices}
          existingPolygons={existingPolygons}
          outlinePolygon={editMode === 'estancia' && estanciaMode === 'edit' ? null : outlinePolygon}
          selectedPlace={selectedPlace}
          restrictTo={restrictTo}
          invalid={vertices.length >= 3 && !polygonIsSimple}
          onVertexDrag={moveVertex}
          onPolygonClick={isDrawing ? null : handlePolygonSelect}
        />
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[500] rounded-md border border-[var(--border)] bg-[var(--surface)]/95 px-3.5 py-2.5 text-center text-xs font-semibold text-[var(--text-soft)] shadow-xl sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:whitespace-nowrap">
          {isDrawing
            ? 'Hacé clic para marcar cada vértice en el mapa'
            : 'Elegí "Dibujar potrero" o "Editar límite" en el panel lateral'}
        </div>
      </section>
    </div>
  );
}
