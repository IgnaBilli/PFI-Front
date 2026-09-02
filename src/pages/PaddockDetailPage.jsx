import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  Calculator,
  CheckCircle2,
  CloudRain,
  Droplets,
  History,
  LoaderCircle,
  MapPin,
  Plus,
  Satellite,
  Thermometer,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import usePaddocks from '../hooks/usePaddocks.js';
import useCattle from '../hooks/useCattle.js';
import usePaddockAnalytics, { buildPaddockStatus } from '../hooks/usePaddockAnalytics.js';
import {
  CATEGORY_COLORS,
  FALLBACK_CATEGORY_COLOR,
  formatPhysiologicalStatus,
  withAnimalCounts,
} from '../services/mappers.js';
import {
  createForageEstimate,
  createNutritionEstimate,
  fetchForageHistory,
  fetchLatestClima,
  fetchPaddockTraslados,
} from '../services/analyticsService.js';
import { createCattleForPaddock } from '../services/cattleService.js';
import { formatShortDate } from '../utils/format.js';
import AddCattleModal from '../components/AddCattleModal.jsx';
import PolygonMapCanvas from '../components/PolygonMapCanvas.jsx';
import DonutChart from '../components/DonutChart.jsx';
import TrendLineChart from '../components/TrendLineChart.jsx';

function ToastNotification({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-4 z-[3000] flex w-[min(92vw,22rem)] items-start gap-3 rounded-xl border border-brand-400/30 bg-forest-800 px-4 py-3.5 shadow-2xl">
      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-400" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-sand-100">{toast.title || 'Listo'}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-sand-300">{toast.message}</p>
      </div>
      <button type="button" onClick={onClose} className="app-icon-button size-8 min-h-8" aria-label="Cerrar notificación">
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

function InlineError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="app-error mt-4 text-xs leading-relaxed">
      {children}
    </p>
  );
}

function SectionHeading({ id, title, description, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 id={id} className="font-display text-lg font-bold tracking-tight text-sand-100">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-xs leading-relaxed text-sand-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function ForageTrendChart({ history, color }) {
  const points = history
    .map((item) => ({
      t: new Date(item.fecha_calculo).getTime(),
      value: Number(item.kg_materia_seca_ha),
    }))
    .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.value));

  return (
    <TrendLineChart
      points={points}
      color={color}
      formatX={formatShortDate}
      formatTooltip={(point) => `${formatShortDate(point.t)} · ${point.value.toFixed(0)} kg MS/ha`}
      emptyMessage="Todavía no hay suficientes mediciones para mostrar la evolución."
    />
  );
}

function LoadingPage({ toast, onCloseToast }) {
  return (
    <div className="app-page" aria-busy="true" aria-label="Cargando detalle del potrero">
      <ToastNotification toast={toast} onClose={onCloseToast} />
      <div className="app-skeleton h-4 w-24 rounded" />
      <div className="mt-6 flex items-end justify-between gap-4">
        <div className="space-y-3">
          <div className="app-skeleton h-9 w-56 rounded-md" />
          <div className="app-skeleton h-4 w-20 rounded" />
        </div>
        <div className="app-skeleton h-8 w-24 rounded-full" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <div className="app-skeleton h-56 rounded-[var(--radius-lg)]" />
        <div className="app-skeleton h-56 rounded-[var(--radius-lg)]" />
      </div>
      <div className="mt-4 app-skeleton h-72 rounded-[var(--radius-lg)]" />
      <p className="sr-only">Cargando potrero...</p>
    </div>
  );
}

function forageEstimateKey(estimate) {
  if (!estimate) return '';
  const id = estimate.id_estimacion ?? estimate.id ?? '';
  return `${id}|${estimate.fecha_calculo ?? ''}|${estimate.kg_materia_seca_ha ?? ''}`;
}

export default function PaddockDetailPage() {
  const { paddockId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const mapPreviewRef = useRef(null);
  const forageRequestRef = useRef(false);
  const { estanciaId } = useAuth();
  const { paddocks, loading: paddocksLoading, error: paddocksError, reload: reloadPaddocks } = usePaddocks(estanciaId);
  const { cattle, loading: cattleLoading, error: cattleError, reload: reloadCattle } = useCattle(estanciaId);
  const paddocksWithCounts = withAnimalCounts(paddocks ?? [], cattle ?? []);
  const paddock = paddocksWithCounts.find((item) => String(item.id) === String(paddockId));
  const currentPaddockId = paddock?.id;
  const herd = paddock ? (cattle ?? []).filter((animal) => animal.paddockId === paddock.id) : [];

  const { dataById, loading: analyticsLoading, errorsById } = usePaddockAnalytics(paddock ? [paddock] : []);
  const entry = paddock ? dataById[paddock.id] : null;
  const analyticsErrors = paddock ? errorsById[paddock.id] ?? {} : {};

  const [toast, setToast] = useState(location.state?.toast ?? null);
  useEffect(() => {
    if (!location.state?.toast) return;
    navigate(location.pathname, { replace: true, state: {} });
    // The navigation toast should only be consumed once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const [forageHistory, setForageHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  useEffect(() => {
    if (currentPaddockId == null) return undefined;
    let cancelled = false;
    setForageHistory([]);
    setHistoryLoading(true);
    setHistoryError('');
    fetchForageHistory(currentPaddockId)
      .then((rows) => {
        if (!cancelled) setForageHistory(Array.isArray(rows) ? rows : []);
      })
      .catch((error) => {
        if (!cancelled) setHistoryError(error.message || 'No se pudo cargar el historial forrajero.');
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentPaddockId]);

  const [clima, setClima] = useState(null);
  const [climateLoading, setClimateLoading] = useState(false);
  const [climateError, setClimateError] = useState('');
  const [traslados, setTraslados] = useState([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [transfersError, setTransfersError] = useState('');
  useEffect(() => {
    if (currentPaddockId == null) return undefined;
    let cancelled = false;
    setClima(null);
    setTraslados([]);
    setClimateLoading(true);
    setTransfersLoading(true);
    setClimateError('');
    setTransfersError('');

    fetchLatestClima(currentPaddockId)
      .then((data) => {
        if (!cancelled) setClima(data ?? null);
      })
      .catch((error) => {
        if (!cancelled) setClimateError(error.message || 'No se pudo cargar el último dato climático.');
      })
      .finally(() => {
        if (!cancelled) setClimateLoading(false);
      });

    fetchPaddockTraslados(currentPaddockId)
      .then((rows) => {
        if (!cancelled) setTraslados(Array.isArray(rows) ? rows : []);
      })
      .catch((error) => {
        if (!cancelled) setTransfersError(error.message || 'No se pudieron cargar los traslados.');
      })
      .finally(() => {
        if (!cancelled) setTransfersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentPaddockId]);

  const [forageGenLoading, setForageGenLoading] = useState(false);
  const [forageGenError, setForageGenError] = useState('');
  const [forageOverride, setForageOverride] = useState(null);
  const [dmiLoading, setDmiLoading] = useState(false);
  const [dmiError, setDmiError] = useState('');
  const [dmiOverride, setDmiOverride] = useState(null);

  useEffect(() => {
    forageRequestRef.current = false;
    setForageOverride(null);
    setForageGenError('');
    setDmiOverride(null);
    setDmiError('');
  }, [currentPaddockId]);

  const latestForage = forageOverride ?? entry?.forage ?? null;
  const nutrition = dmiOverride ?? entry?.nutrition ?? null;
  const status = buildPaddockStatus({ ...entry, forage: latestForage, nutrition }, paddock?.hectares);

  async function handleGenerateForage() {
    if (!paddock || forageRequestRef.current) return;
    forageRequestRef.current = true;
    setForageGenLoading(true);
    setForageGenError('');
    try {
      const result = await createForageEstimate(paddock.id);
      setForageOverride(result);
      setForageHistory((current) => {
        const resultKey = forageEstimateKey(result);
        return [...current.filter((item) => forageEstimateKey(item) !== resultKey), result];
      });
      if (result.clima) setClima(result.clima);
    } catch (error) {
      setForageGenError(error.message || 'No se pudo calcular la disponibilidad forrajera.');
    } finally {
      forageRequestRef.current = false;
      setForageGenLoading(false);
    }
  }

  async function handleRecalculateDmi() {
    if (!paddock || dmiLoading) return;
    setDmiLoading(true);
    setDmiError('');
    try {
      const result = await createNutritionEstimate(paddock.id);
      setDmiOverride(result);
    } catch (error) {
      setDmiError(error.message || 'No se pudo recalcular la demanda nutricional.');
    } finally {
      setDmiLoading(false);
    }
  }

  const [addingCattle, setAddingCattle] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [selectedHerdIds, setSelectedHerdIds] = useState([]);

  useEffect(() => {
    setSelectedHerdIds([]);
    setActionError('');
  }, [currentPaddockId]);

  function toggleHerdSelection(id) {
    setSelectedHerdIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleHerdSelectAll() {
    setSelectedHerdIds((current) => (current.length === herd.length ? [] : herd.map((animal) => animal.id)));
  }

  async function handleAddCattle({ animals }) {
    if (!paddock) throw new Error('El potrero ya no está disponible.');
    setMutating(true);
    setActionError('');
    let createdCount = 0;
    try {
      for (const payload of animals) {
        await createCattleForPaddock(paddock.id, payload);
        createdCount += 1;
      }
      await reloadCattle();
      setAddingCattle(false);
    } catch (error) {
      if (createdCount > 0) await reloadCattle().catch(() => {});
      const message = createdCount > 0
        ? `Se registraron ${createdCount} ${createdCount === 1 ? 'animal' : 'animales'}, pero el lote quedó incompleto. Revisá el rodeo antes de reintentar.`
        : error.message || 'No se pudo agregar el ganado.';
      setActionError(message);
      throw new Error(message, { cause: error });
    } finally {
      setMutating(false);
    }
  }

  if (paddocksLoading || cattleLoading) {
    return <LoadingPage toast={toast} onCloseToast={() => setToast(null)} />;
  }

  if (paddocksError || cattleError) {
    return (
      <div className="app-page">
        <Link to="/potreros" className="app-button-ghost -ml-3 text-xs">
          <ArrowLeft size={16} aria-hidden="true" /> Volver a potreros
        </Link>
        <div className="app-panel app-empty mt-6">
          <AlertTriangle size={30} className="text-danger-400" aria-hidden="true" />
          <div>
            <h1 className="font-display text-xl font-bold text-sand-100">No pudimos cargar el potrero</h1>
            <p className="mt-2 text-sm text-sand-300">{paddocksError || cattleError}</p>
            <button
              type="button"
              onClick={() => Promise.all([reloadPaddocks(), reloadCattle()])}
              className="app-button-secondary mt-4">
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!paddock) {
    return (
      <div className="app-page">
        <ToastNotification toast={toast} onClose={() => setToast(null)} />
        <Link to="/potreros" className="app-button-ghost -ml-3 text-xs">
          <ArrowLeft size={16} aria-hidden="true" /> Volver a potreros
        </Link>
        <div className="app-panel app-empty mt-6">
          <MapPin size={30} className="text-sand-500" aria-hidden="true" />
          <div>
            <h1 className="font-display text-xl font-bold text-sand-100">Potrero no encontrado</h1>
            <p className="mt-2 text-sm">El potrero solicitado no existe o ya no está disponible.</p>
          </div>
        </div>
      </div>
    );
  }

  const herdByCategory = herd.reduce((accumulator, animal) => {
    const key = animal.category || 'Sin categoría';
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
  const paddockNameById = new Map(paddocksWithCounts.map((item) => [item.id, item.name]));
  const hectares = Number(paddock.hectares);
  const formattedHectares = Number.isFinite(hectares) ? hectares.toLocaleString('es-AR', { maximumFractionDigits: 1 }) : '-';
  const forageValue = Number(latestForage?.kg_materia_seca_ha);
  const demandValue = Number(nutrition?.kg_materia_seca_dia);
  const allSelected = herd.length > 0 && selectedHerdIds.length === herd.length;
  const someSelected = selectedHerdIds.length > 0 && !allSelected;

  return (
    <div className="app-page text-sm">
      <ToastNotification toast={toast} onClose={() => setToast(null)} />
      <AddCattleModal
        isOpen={addingCattle}
        onClose={() => setAddingCattle(false)}
        onAdd={handleAddCattle}
        existingCaravanas={(cattle ?? []).map((animal) => animal.caravana)}
        cattle={cattle ?? []}
        lockedPaddockId={paddock.id}
        lockedPaddockLabel={paddock.name}
      />

      <Link to="/potreros" className="app-button-ghost -ml-3 text-xs">
        <ArrowLeft size={16} aria-hidden="true" /> Volver a potreros
      </Link>

      <header className="mt-4 flex flex-col gap-4 border-b border-sand-100/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-sand-100 sm:text-4xl">{paddock.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-sand-500">
            <MapPin size={15} aria-hidden="true" /> {formattedHectares} ha
          </p>
        </div>
        {analyticsLoading ? (
          <div className="app-skeleton h-9 w-28 rounded-full" aria-label="Cargando condición" />
        ) : (
          <span
            className="inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-bold"
            style={{ color: status.statusColor, borderColor: `${status.statusColor}55`, backgroundColor: status.statusBg }}>
            Condición: {status.status}
          </span>
        )}
      </header>

      <InlineError>{actionError}</InlineError>
      <InlineError>{paddocksError || cattleError}</InlineError>
      {Object.keys(analyticsErrors).length > 0 && (
        <div className="app-error mt-4" role="alert">
          No se pudieron cargar todas las analíticas del potrero. Los datos disponibles se muestran de forma parcial.
        </div>
      )}

      <section className="app-panel mt-6 overflow-hidden" aria-labelledby="condition-title">
        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <div className="p-5 sm:p-6">
            <h2 id="condition-title" className="font-display text-xl font-bold text-sand-100">Condición actual</h2>
            {analyticsLoading ? (
              <div className="mt-5 space-y-3" aria-label="Cargando condición productiva">
                <div className="app-skeleton h-5 w-3/4 rounded" />
                <div className="app-skeleton h-4 w-full rounded" />
                <div className="app-skeleton h-4 w-5/6 rounded" />
              </div>
            ) : status.alert ? (
              <div className="mt-4 flex items-start gap-3 text-danger-400">
                <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-bold">Requiere atención</p>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-sand-200">{status.alert}</p>
                </div>
              </div>
            ) : status.recommendation ? (
              <div className="mt-4 flex items-start gap-3 text-warning-400">
                <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-bold">Recomendación activa</p>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-sand-200">{status.recommendation}</p>
                </div>
              </div>
            ) : status.ok ? (
              <div className="mt-4 flex items-start gap-3 text-brand-400">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-bold">Sin recomendaciones activas</p>
                  <p className="mt-1 text-sm text-sand-300">{status.ok}</p>
                </div>
              </div>
            ) : (
              <div className="app-empty mt-3 min-h-32 rounded-lg border border-dashed border-sand-100/15">
                <p>No hay datos suficientes para determinar la condición actual.</p>
              </div>
            )}
          </div>
          <div className="border-t border-sand-100/10 bg-forest-850 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sand-500">Relación demanda/oferta</p>
            <p className="mt-3 font-display text-3xl font-extrabold tabular-nums text-sand-100">{analyticsLoading ? '...' : status.load}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-forest-950" aria-hidden="true">
              <div className="h-full rounded-full bg-brand-400 transition-[width] duration-500" style={{ width: status.loadBarWidth }} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-sand-500">Calculada con la estimación forrajera, la superficie y la demanda nutricional disponibles.</p>
          </div>
        </div>
      </section>

      <section className="mt-4" aria-labelledby="actions-title">
        <div className="app-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 id="actions-title" className="font-display text-lg font-bold text-sand-100">Acciones del potrero</h2>
            <p className="mt-1 text-xs text-sand-500">Actualizá estimaciones, incorporá ganado o prepará un traslado.</p>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <button type="button" onClick={handleGenerateForage} disabled={forageGenLoading} className="app-button-secondary text-xs">
              {forageGenLoading ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Satellite size={16} aria-hidden="true" />}
              {latestForage ? 'Actualizar disponibilidad' : 'Calcular disponibilidad'}
            </button>
            <button type="button" onClick={handleRecalculateDmi} disabled={dmiLoading || herd.length === 0} className="app-button-secondary text-xs">
              {dmiLoading ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Calculator size={16} aria-hidden="true" />}
              Recalcular demanda
            </button>
            <button type="button" onClick={() => setAddingCattle(true)} disabled={mutating} className="app-button-primary text-xs">
              {mutating ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              Agregar ganado
            </button>
          </div>
        </div>
        <InlineError>{forageGenError || dmiError}</InlineError>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2" aria-label="Oferta forrajera y demanda nutricional">
        <article className="app-panel p-5 sm:p-6">
          <SectionHeading title="Oferta forrajera" description="Última disponibilidad estimada para este potrero." />
          {analyticsLoading && !forageOverride ? (
            <div className="mt-6 space-y-3">
              <div className="app-skeleton h-10 w-48 rounded" />
              <div className="app-skeleton h-4 w-36 rounded" />
            </div>
          ) : latestForage ? (
            <div className="mt-6">
              <p className="font-display text-3xl font-extrabold tabular-nums text-sand-100">
                {Number.isFinite(forageValue) ? forageValue.toLocaleString('es-AR', { maximumFractionDigits: 1 }) : '-'}
                <span className="ml-2 text-sm font-bold text-sand-500">kg MS/ha</span>
              </p>
              <p className="mt-2 text-xs text-sand-500">Medición {latestForage.fecha_calculo ? formatShortDate(latestForage.fecha_calculo) : 'sin fecha informada'}</p>
              <dl className="mt-6 grid gap-3 border-t border-sand-100/10 pt-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-sand-500">Índice NDVI</dt>
                  <dd className="mt-1 font-bold tabular-nums text-sand-100">{latestForage.indice_ndvi != null ? Number(latestForage.indice_ndvi).toFixed(2) : 'Sin datos'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-sand-500">Superficie analizada</dt>
                  <dd className="mt-1 font-bold tabular-nums text-sand-100">{latestForage.superficie_analizada_ha != null ? `${Number(latestForage.superficie_analizada_ha).toFixed(1)} ha` : 'Sin datos'}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="app-empty mt-4 min-h-40 rounded-lg border border-dashed border-sand-100/15">
              <div>
                <Satellite size={26} className="mx-auto text-sand-500" aria-hidden="true" />
                <p className="mt-3">Todavía no hay una estimación de disponibilidad forrajera.</p>
              </div>
            </div>
          )}
        </article>

        <article className="app-panel p-5 sm:p-6">
          <SectionHeading title="Demanda nutricional" description="Consumo diario estimado para el ganado asignado." />
          {analyticsLoading && !dmiOverride ? (
            <div className="mt-6 space-y-3">
              <div className="app-skeleton h-10 w-48 rounded" />
              <div className="app-skeleton h-4 w-36 rounded" />
            </div>
          ) : nutrition ? (
            <div className="mt-6">
              <p className="font-display text-3xl font-extrabold tabular-nums text-sand-100">
                {Number.isFinite(demandValue) ? demandValue.toLocaleString('es-AR', { maximumFractionDigits: 1 }) : '-'}
                <span className="ml-2 text-sm font-bold text-sand-500">kg MS/día</span>
              </p>
              <p className="mt-2 text-xs text-sand-500">
                {nutrition.cantidad_animales} {nutrition.cantidad_animales === 1 ? 'animal' : 'animales'} · cálculo {nutrition.fecha_calculo ? formatShortDate(nutrition.fecha_calculo) : 'sin fecha informada'}
              </p>
              {Object.keys(herdByCategory).length > 0 && (
                <dl className="mt-6 space-y-2 border-t border-sand-100/10 pt-4">
                  {Object.entries(herdByCategory).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between gap-4 text-xs">
                      <dt className="text-sand-300">{category}</dt>
                      <dd className="font-bold tabular-nums text-sand-100">{count} {count === 1 ? 'cabeza' : 'cabezas'}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ) : (
            <div className="app-empty mt-4 min-h-40 rounded-lg border border-dashed border-sand-100/15">
              <div>
                <Calculator size={26} className="mx-auto text-sand-500" aria-hidden="true" />
                <p className="mt-3">{herd.length === 0 ? 'Asigná ganado para poder calcular su demanda nutricional.' : 'Todavía no se calculó la demanda nutricional.'}</p>
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="app-panel mt-4 p-5 sm:p-6" aria-labelledby="herd-title">
        <SectionHeading
          id="herd-title"
          title="Ganado asignado"
          description={`${herd.length} ${herd.length === 1 ? 'animal asignado' : 'animales asignados'} a este potrero.`}
          action={selectedHerdIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-brand-400">{selectedHerdIds.length} seleccionados</span>
              <button type="button" onClick={() => navigate('/traslado', { state: { animalIds: selectedHerdIds } })} className="app-button-primary px-3 text-xs">
                <ArrowLeftRight size={15} aria-hidden="true" /> Trasladar
              </button>
              <button type="button" onClick={() => setSelectedHerdIds([])} className="app-button-ghost text-xs">Limpiar selección</button>
            </div>
          ) : null}
        />

        {herd.length === 0 ? (
          <div className="app-empty mt-5 rounded-lg border border-dashed border-sand-100/15">
            <div>
              <p>No hay ganado asignado a este potrero.</p>
              <button type="button" onClick={() => setAddingCattle(true)} className="app-button-primary mt-4 text-xs">
                <Plus size={15} aria-hidden="true" /> Agregar ganado
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="min-w-0">
              <label className="mb-3 flex w-fit items-center gap-2 text-xs font-bold text-sand-300 sm:hidden">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => { if (input) input.indeterminate = someSelected; }}
                  onChange={toggleHerdSelectAll}
                  className="size-4 rounded border-sand-100/20 bg-forest-950 text-brand-500 focus:ring-brand-400"
                />
                Seleccionar todo el ganado
              </label>

              <div className="space-y-2 sm:hidden">
                {herd.map((animal) => (
                  <label key={animal.id} className={`app-panel-muted flex items-start gap-3 p-4 ${selectedHerdIds.includes(animal.id) ? 'border-brand-400/40 bg-brand-700/20' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedHerdIds.includes(animal.id)}
                      onChange={() => toggleHerdSelection(animal.id)}
                      aria-label={`Seleccionar animal ${animal.caravana}`}
                      className="mt-1 size-4 shrink-0 rounded border-sand-100/20 bg-forest-950 text-brand-500 focus:ring-brand-400"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-sand-100">Caravana {animal.caravana}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-sand-300">{animal.category || 'Sin categoría'} · {animal.weight !== '-' ? animal.weight : 'Peso sin datos'} · {formatPhysiologicalStatus(animal.status)}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-lg border border-sand-100/10 sm:block">
                <table className="w-full min-w-[38rem] text-left text-xs">
                  <thead className="bg-forest-850 text-sand-500">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(input) => { if (input) input.indeterminate = someSelected; }}
                          onChange={toggleHerdSelectAll}
                          aria-label="Seleccionar todo el ganado"
                          className="size-4 rounded border-sand-100/20 bg-forest-950 text-brand-500 focus:ring-brand-400"
                        />
                      </th>
                      <th scope="col" className="px-4 py-3 font-bold">Caravana</th>
                      <th scope="col" className="px-4 py-3 font-bold">Categoría</th>
                      <th scope="col" className="px-4 py-3 text-right font-bold">Peso vivo</th>
                      <th scope="col" className="px-4 py-3 font-bold">Estado fisiológico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-100/10">
                    {herd.map((animal) => (
                      <tr key={animal.id} className={selectedHerdIds.includes(animal.id) ? 'bg-brand-700/15' : ''}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedHerdIds.includes(animal.id)}
                            onChange={() => toggleHerdSelection(animal.id)}
                            aria-label={`Seleccionar animal ${animal.caravana}`}
                            className="size-4 rounded border-sand-100/20 bg-forest-950 text-brand-500 focus:ring-brand-400"
                          />
                        </td>
                        <th scope="row" className="px-4 py-3 font-bold text-sand-100">{animal.caravana}</th>
                        <td className="px-4 py-3 text-sand-300">{animal.category || 'Sin categoría'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-sand-300">{animal.weight}</td>
                        <td className="px-4 py-3 text-sand-300">{formatPhysiologicalStatus(animal.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-sand-100/10 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <h3 className="text-sm font-bold text-sand-100">Distribución por categoría</h3>
              <DonutChart
                segments={Object.entries(herdByCategory).map(([category, count]) => ({
                  key: category,
                  label: category,
                  value: count,
                  color: CATEGORY_COLORS[category] || FALLBACK_CATEGORY_COLOR,
                }))}
                emptyMessage="Sin animales asignados."
                ariaLabel="Distribución del ganado por categoría"
              />
            </div>
          </div>
        )}
      </section>

      <section className="app-panel mt-4 p-5 sm:p-6" aria-labelledby="history-title">
        <SectionHeading id="history-title" title="Historial forrajero" description="Evolución de las estimaciones de materia seca por hectárea." />
        <div className="mt-5">
          {historyLoading ? (
            <div className="app-skeleton h-52 rounded-lg" aria-label="Cargando historial forrajero" />
          ) : historyError ? (
            <InlineError>{historyError}</InlineError>
          ) : (
            <ForageTrendChart history={forageHistory} color={status.statusColor} />
          )}
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="app-panel p-5 sm:p-6" aria-labelledby="climate-title">
          <SectionHeading id="climate-title" title="Último registro climático" description="Datos observados asociados al potrero, sin interpretación de pronóstico." />
          <div className="mt-5">
            {climateLoading ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((item) => <div key={item} className="app-skeleton h-24 rounded-lg" />)}
              </div>
            ) : climateError ? (
              <InlineError>{climateError}</InlineError>
            ) : clima ? (
              <>
                <dl className="grid gap-3 sm:grid-cols-3">
                  <div className="app-panel-muted p-4">
                    <dt className="flex items-center gap-2 text-xs text-sand-500"><Thermometer size={15} aria-hidden="true" /> Temperatura</dt>
                    <dd className="mt-3 text-xl font-extrabold tabular-nums text-sand-100">{clima.temperatura != null ? `${Number(clima.temperatura).toFixed(1)} °C` : 'Sin datos'}</dd>
                  </div>
                  <div className="app-panel-muted p-4">
                    <dt className="flex items-center gap-2 text-xs text-sand-500"><CloudRain size={15} aria-hidden="true" /> Precipitación</dt>
                    <dd className="mt-3 text-xl font-extrabold tabular-nums text-sand-100">{clima.precipitacion != null ? `${Number(clima.precipitacion).toFixed(1)} mm` : 'Sin datos'}</dd>
                  </div>
                  <div className="app-panel-muted p-4">
                    <dt className="flex items-center gap-2 text-xs text-sand-500"><Droplets size={15} aria-hidden="true" /> Humedad</dt>
                    <dd className="mt-3 text-xl font-extrabold tabular-nums text-sand-100">{clima.humedad != null ? `${Number(clima.humedad).toFixed(0)} %` : 'Sin datos'}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs text-sand-500">Registro {clima.fecha ? formatShortDate(clima.fecha) : 'sin fecha informada'}.</p>
              </>
            ) : (
              <div className="app-empty min-h-40 rounded-lg border border-dashed border-sand-100/15">
                <p>No hay registros climáticos para este potrero.</p>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-sand-100/10 pt-5" aria-labelledby="map-title">
            <SectionHeading
              id="map-title"
              title="Mapa del potrero"
              description="Ubicación y polígono registrado para esta superficie."
            />
            <div className="mt-4 h-44 overflow-hidden rounded-[var(--radius-md)] border border-sand-100/10 sm:h-52">
              {Array.isArray(paddock.coordinates) && paddock.coordinates.length > 0 ? (
                <PolygonMapCanvas
                  mapRef={mapPreviewRef}
                  isDrawing={false}
                  vertices={[]}
                  existingPolygons={[{
                    id: paddock.id,
                    coordinates: paddock.coordinates,
                    color: status.statusColor,
                    label: paddock.name,
                  }]}
                  restrictTo={paddock.coordinates}
                />
              ) : (
                <div className="app-empty h-full min-h-0">
                  <p>No hay un polígono registrado para mostrar en el mapa.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="app-panel p-5 sm:p-6" aria-labelledby="transfers-title">
          <SectionHeading id="transfers-title" title="Traslados recientes" description="Entradas y salidas de ganado registradas para este potrero." />
          <div className="mt-5">
            {transfersLoading ? (
              <div className="space-y-2" aria-label="Cargando traslados">
                {[0, 1, 2].map((item) => <div key={item} className="app-skeleton h-16 rounded-lg" />)}
              </div>
            ) : transfersError ? (
              <InlineError>{transfersError}</InlineError>
            ) : traslados.length === 0 ? (
              <div className="app-empty min-h-40 rounded-lg border border-dashed border-sand-100/15">
                <div>
                  <History size={26} className="mx-auto text-sand-500" aria-hidden="true" />
                  <p className="mt-3">Todavía no hay traslados registrados.</p>
                </div>
              </div>
            ) : (
              <ol className="space-y-2">
                {traslados.slice(0, 6).map((transfer) => {
                  const isEntry = transfer.direccion === 'entrada';
                  const counterpartId = isEntry ? transfer.id_potrero_origen : transfer.id_potrero_destino;
                  const counterpartName = paddockNameById.get(counterpartId) || 'Potrero no disponible';
                  return (
                    <li key={transfer.id_traslado} className="app-panel-muted flex items-start gap-3 p-3.5">
                      <span className={`mt-0.5 rounded-full px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${isEntry ? 'bg-brand-700/35 text-brand-400' : 'bg-earth-600/35 text-sand-200'}`}>
                        {isEntry ? 'Entrada' : 'Salida'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-sand-300">{isEntry ? 'Desde' : 'Hacia'} <strong className="text-sand-100">{counterpartName}</strong></p>
                        <p className="mt-1 text-xs leading-relaxed text-sand-500">{formatShortDate(transfer.fecha_movimiento)}{transfer.observaciones ? ` · ${transfer.observaciones}` : ''}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>
      </div>

    </div>
  );
}
