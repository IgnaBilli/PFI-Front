import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Beef, Check, LandPlot, LoaderCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import usePaddocks from '../hooks/usePaddocks.js';
import useCattle from '../hooks/useCattle.js';
import usePaddockAnalytics, { buildPaddockStatus } from '../hooks/usePaddockAnalytics.js';
import { withAnimalCounts } from '../services/mappers.js';
import { assignCattle, relocateCattle } from '../services/cattleService.js';
import { ApiError } from '../services/api.js';
import PaddockThumbnail from '../components/PaddockThumbnail.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

function normalizeAnimalIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
}

export default function TrasladoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { estanciaId } = useAuth();
  const { paddocks, loading: paddocksLoading, error: paddocksError } = usePaddocks(estanciaId);
  const { cattle, loading: cattleLoading, error: cattleError, reload: reloadCattle } = useCattle(estanciaId);
  const paddocksWithCounts = withAnimalCounts(paddocks, cattle);
  const { dataById, loading: analyticsLoading, error: analyticsError } = usePaddockAnalytics(paddocksWithCounts);

  const storageKey = `terrabovina:traslado:${estanciaId ?? 'sin-estancia'}`;
  const [transferContext] = useState(()=>{
    if(location.state&&Object.hasOwn(location.state,'animalIds'))return location.state;
    try{const stored=JSON.parse(sessionStorage.getItem(storageKey)||'null');return stored&&!Array.isArray(stored)?stored:{};}catch{return {};}
  });
  const [animalIds] = useState(() => {
    if (location.state && Object.hasOwn(location.state, 'animalIds')) {
      return normalizeAnimalIds(location.state.animalIds);
    }
    try {
      const stored=JSON.parse(sessionStorage.getItem(storageKey) || '[]');
      return normalizeAnimalIds(Array.isArray(stored)?stored:stored?.animalIds);
    } catch {
      return [];
    }
  });
  const selectedAnimals = cattle.filter((animal) => animalIds.includes(Number(animal.id)));

  const [selectedPaddockId, setSelectedPaddockId] = useState(()=>Number(transferContext.destinationId)||null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loading = paddocksLoading || cattleLoading;
  const candidate = paddocksWithCounts.find((p) => p.enabledForCattle !== false && Number(p.id) === selectedPaddockId) ?? null;
  const selectionIsStale = !loading && !cattleError && selectedAnimals.length !== animalIds.length;
  const originCount = new Set(selectedAnimals.map((animal) => animal.paddockId ?? 'new')).size;
  const multipleOrigins = originCount > 1;
  const movedCount = candidate
    ? selectedAnimals.filter((animal) => Number(animal.paddockId) !== Number(candidate.id)).length
    : 0;

  useEffect(() => {
    try {
      if (animalIds.length === 0) sessionStorage.removeItem(storageKey);
      else sessionStorage.setItem(storageKey, JSON.stringify({animalIds,destinationId:transferContext.destinationId,recommendation:transferContext.recommendation===true}));
    } catch {
      // The route state remains the primary source when storage is unavailable.
    }
  }, [animalIds, storageKey, transferContext]);

  useEffect(() => {
    if (!selectionIsStale) return;
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Storage can be unavailable without blocking recovery through the cattle page.
    }
  }, [selectionIsStale, storageKey]);

  async function handleConfirm() {
    if (!candidate || movedCount === 0 || selectionIsStale) return;
    setSubmitting(true);
    setError('');
    let completedOrigins = 0;
    try {
      const groups = new Map();
      for (const animal of selectedAnimals) {
        const key = animal.paddockId ?? 'new';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(animal.id);
      }

      let movedAny = false;
      for (const [origin, ids] of groups.entries()) {
        if (Number(origin) === Number(candidate.id)) continue;
        movedAny = true;
        if (origin === 'new') {
          await assignCattle({ id_potrero: candidate.id, id_ganado: ids });
        } else {
          await relocateCattle(origin, {
            id_potrero_destino: candidate.id,
            id_ganado: ids,
            fecha_movimiento: new Date().toISOString(),
            recommendation:transferContext.recommendation===true,
          });
        }
        completedOrigins += 1;
      }

      if (!movedAny) {
        setError('Todos los animales seleccionados ya están en ese potrero.');
        setConfirmOpen(false);
        return;
      }

      await reloadCattle();
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // A blocked storage cleanup should not turn a completed transfer into an error.
      }
      setConfirmOpen(false);
      navigate(`/potreros/${candidate.id}`, {
        state: {
          toast: {
            title: 'Traslado realizado',
            message: `${movedCount} ${
              movedCount === 1 ? 'animal fue trasladado' : 'animales fueron trasladados'
            } a ${candidate.name}.`,
          },
        },
      });
    } catch (err) {
      if (completedOrigins > 0) await reloadCattle().catch(() => {});
      const partialMessage =
        multipleOrigins && completedOrigins > 0
          ? ` ${completedOrigins === 1 ? 'Un origen ya se completó' : `${completedOrigins} orígenes ya se completaron`}; el traslado quedó parcial.`
          : multipleOrigins
            ? ' Como hay varios potreros de origen, reintentá solo después de verificar el rodeo: un error intermedio puede dejar el traslado parcial.'
            : '';
      if (err instanceof ApiError && err.status === 404) {
        setError(
          `No se pudo completar el traslado: algún animal no existe o no tiene asignación activa en su potrero de origen.${partialMessage}`
        );
      } else {
        setError(`${err.message || 'No se pudo completar el traslado.'}${partialMessage}`);
      }
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (animalIds.length === 0 || selectionIsStale) {
    return (
      <div className="app-page text-sm">
        <Link
          to="/ganado"
          className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">
          <ArrowLeft size={13} /> Todo el ganado
        </Link>
        <div className="app-empty app-panel mt-6">
          <div>
            <AlertTriangle className="mx-auto mb-3" size={24} aria-hidden="true" />
            <p className="font-semibold text-[var(--text-soft)]">
              {selectionIsStale ? 'La selección ya no está vigente.' : 'No hay animales seleccionados para trasladar.'}
            </p>
            <p className="mt-1 text-xs">Volvé a Todo el ganado y generá una nueva selección.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page min-h-full pb-28 text-sm">
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Confirmar traslado"
        message={
          candidate
            ? `¿Seguro que querés realizar este cambio? Se ${
                movedCount === 1 ? 'moverá 1 animal' : `moverán ${movedCount} animales`
              } al potrero "${candidate.name}".${multipleOrigins ? ' Los movimientos se procesan por origen y un error intermedio puede dejar el traslado parcialmente completado.' : ''}`
            : '¿Seguro que querés realizar este cambio?'
        }
        confirmLabel="Confirmar"
        loading={submitting}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />

      <Link
        to="/ganado"
        className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">
        <ArrowLeft size={13} /> Todo el ganado
      </Link>

      <div className="mt-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text)] sm:text-3xl">Trasladar ganado</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Elegí el potrero de destino. {selectedAnimals.length}{' '}
            {selectedAnimals.length === 1 ? 'animal seleccionado' : 'animales seleccionados'}.
          </p>
        </div>
      </div>

      {error && (
        <p className="app-error mt-4 flex items-start gap-2" role="alert">
          <AlertTriangle size={13} className="shrink-0" /> {error}
        </p>
      )}

      <div className="mt-3 flex max-w-full flex-wrap gap-1.5">
        {selectedAnimals.map((a) => (
          <span
            key={a.id}
            className="flex min-h-11 min-w-0 max-w-full items-center gap-1 rounded-full bg-sand-100/[.05] px-2.5 py-1 text-xs font-semibold text-[var(--text-soft)]">
            <Beef size={12} className="shrink-0 text-[var(--text-muted)]" />
            <span className="min-w-0 truncate">{a.caravana}</span>
            <span className="min-w-0 truncate text-[var(--text-muted)]">· {a.paddock}</span>
          </span>
        ))}
      </div>

      {loading ? (
        <div className="app-empty mt-5 flex gap-2" role="status">
          <LoaderCircle size={16} className="animate-spin" /> Cargando potreros...
        </div>
      ) : paddocksError || cattleError ? (
        <p className="app-error mt-5" role="alert">{paddocksError || cattleError}</p>
      ) : paddocksWithCounts.length === 0 ? (
        <div className="app-empty app-panel mt-5">Todavía no creaste ningún potrero.</div>
      ) : (
        <fieldset className="mt-5">
          <legend className="mb-3 font-bold text-[var(--text-soft)]">Potrero de destino</legend>
          {analyticsError && (
            <p className="app-error mb-3 text-sm" role="alert">
              No se pudo cargar el estado productivo de todos los potreros. Podés elegir un destino, pero verificá sus analíticas antes de confirmar.
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {paddocksWithCounts.filter(p => p.enabledForCattle !== false).map((paddock) => {
            const isSelected = Number(paddock.id) === selectedPaddockId;
            const status = buildPaddockStatus(dataById[paddock.id], paddock.hectares, paddock.animals);
            const isOrigin = selectedAnimals.some((a) => Number(a.paddockId) === Number(paddock.id));
            const isCurrentForAll = selectedAnimals.every((a) => Number(a.paddockId) === Number(paddock.id));

            return (
              <label
                key={paddock.id}
                className={`app-panel relative overflow-hidden transition-colors focus-within:ring-2 focus-within:ring-[var(--focus)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--canvas)] ${
                  isCurrentForAll ? 'cursor-not-allowed opacity-55' : 'cursor-pointer hover:border-[var(--border-strong)]'
                } ${isSelected ? 'border-[var(--focus)]' : ''}`}>
                <input
                  type="radio"
                  name="destination-paddock"
                  value={paddock.id}
                  checked={isSelected}
                  disabled={isCurrentForAll}
                  onChange={() => setSelectedPaddockId(Number(paddock.id))}
                  className="sr-only"
                />
                <div className="relative h-36">
                  <PaddockThumbnail paddock={paddock} padding={0.0008} />
                  {isSelected && (
                    <span className="absolute left-3 top-3 z-[500] flex items-center gap-1 rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs font-bold text-[var(--accent-ink)] shadow-lg">
                      <Check size={11} aria-hidden="true" /> Destino elegido
                    </span>
                  )}
                  {isOrigin && (
                    <span className="absolute right-3 top-3 z-[500] max-w-[55%] truncate rounded-full bg-forest-950/90 px-2.5 py-1 text-xs font-semibold text-[var(--text-soft)] shadow-lg">
                      {isCurrentForAll ? 'Destino actual' : 'Origen de parte del rodeo'}
                    </span>
                  )}
                </div>

                <div className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="truncate text-[13px] text-[var(--text)]">{paddock.name}</strong>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ color: status.statusColor, backgroundColor: status.statusBg }}>
                      {analyticsLoading ? '...' : status.status}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <LandPlot size={12} /> {paddock.hectares.toFixed(1)} ha
                    </span>
                    <span className="flex items-center gap-1">
                      <Beef size={12} /> {paddock.animals} cab.
                    </span>
                  </div>

                </div>
              </label>
            );
          })}
          </div>
        </fieldset>
      )}

      {!loading && !paddocksError && !cattleError && paddocksWithCounts.length > 0 && (
        <aside className="app-panel sticky bottom-4 z-20 mt-6 flex flex-col gap-3 p-4 shadow-[var(--shadow-raised)] sm:flex-row sm:items-center sm:justify-between">
          <div role="status" aria-live="polite">
            <p className="font-bold text-[var(--text)]">
              {candidate ? `${candidate.name}: ${movedCount} ${movedCount === 1 ? 'animal' : 'animales'} a trasladar` : 'Elegí un potrero de destino'}
            </p>
            <p className={`mt-0.5 text-sm ${multipleOrigins ? 'text-warning-400' : 'text-[var(--text-muted)]'}`}>
              {multipleOrigins
                ? 'Hay varios orígenes: se procesan en secuencia y el traslado puede completarse parcialmente si uno falla.'
                : 'Revisá el destino antes de confirmar el movimiento.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={!candidate || movedCount === 0 || submitting}
            className="app-button-primary shrink-0 disabled:opacity-50">
            {submitting && <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />}
            Confirmar traslado
          </button>
        </aside>
      )}
    </div>
  );
}
