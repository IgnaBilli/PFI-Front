import {
  ArrowLeftRight,
  Beef,
  LandPlot,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Sprout,
  ArrowRight,
  Clock3,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import usePaddocks from '../hooks/usePaddocks.js';
import useCattle from '../hooks/useCattle.js';
import useRotation from '../hooks/useRotation.js';
import usePaddockAnalytics, { buildPaddockStatus } from '../hooks/usePaddockAnalytics.js';
import useEstanciaAnaliticas from '../hooks/useEstanciaAnaliticas.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  CATEGORY_API_TO_UI,
  CATEGORY_COLORS,
  FALLBACK_CATEGORY_COLOR,
  withAnimalCounts,
} from '../services/mappers.js';
import { formatShortDate } from '../utils/format.js';
import DonutChart from '../components/DonutChart.jsx';
import TrendLineChart from '../components/TrendLineChart.jsx';

const FORAGE_COLOR = '#4a846d';

function getTimestamp(item) {
  const value =
    item?.fecha_calculo ?? item?.fecha_generacion ?? item?.fecha ?? item?.created_at ?? null;
  const timestamp = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getErrorMessage(error) {
  return typeof error === 'string' ? error : error?.message || '';
}

function LoadingBlock({ className = 'h-24' }) {
  return <div className={`app-skeleton rounded-xl ${className}`} aria-hidden="true" />;
}

// Lista de barras: proporción del Stock utilizable total de la estancia.
function ForageDistributionList({ rows }) {
  if (rows.length === 0) {
    return (
      <p className="mt-4 text-xs text-sand-500">
        Todavía no hay estimaciones de Stock en ningún potrero.
      </p>
    );
  }
  const sorted = [...rows].sort((a, b) => Number(b.porcentaje) - Number(a.porcentaje));
  return (
    <div className="mt-4 space-y-3">
      {sorted.map((row) => (
        <div key={row.id_potrero}>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-semibold text-sand-300">{row.nombre}</span>
            <span className="shrink-0 text-sand-500">
              {Number(row.porcentaje).toFixed(0)}% · {Number(row.stock_total_kg_ms).toFixed(0)}{' '}
              kg MS
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[.04]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, Number(row.porcentaje))}%`,
                backgroundColor: FORAGE_COLOR,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SummaryPage() {
  const { estanciaId, estancia } = useAuth();
  const rotation = useRotation(estanciaId);
  const rotationRecommendations = rotation.data?.recommendations ?? [];
  const rotationOrigins = new Set(rotationRecommendations.map(r => r.origin));
  const { paddocks, loading: paddocksLoading, error: paddocksError } = usePaddocks(estanciaId);
  const { cattle, loading: cattleLoading, error: cattleError } = useCattle(estanciaId);
  const paddocksWithCounts = withAnimalCounts(paddocks, cattle);
  const paddockAnalytics = usePaddockAnalytics(paddocksWithCounts);
  const {
    dataById,
    loading: analyticsLoading,
    error: paddockAnalyticsError = '',
  } = paddockAnalytics;
  const estanciaAnalytics = useEstanciaAnaliticas(estanciaId);
  const {
    analiticas,
    traslados: trasladoAnaliticas,
    loading: estanciaAnaliticasLoading,
    error: estanciaAnaliticasError = '',
    analiticasError = '',
    trasladosError = '',
    errors: estanciaErrors = {},
  } = estanciaAnalytics;

  const loading = paddocksLoading || cattleLoading;

  const activePaddocks = paddocksWithCounts.filter((p) => p.active && p.enabledForCattle !== false);
  const alertPaddocks = paddocksWithCounts.filter(
    (p) =>
      (dataById[p.id]?.recommendation?.prioridad ?? dataById[p.id]?.recommendation?.tipo) ===
      'REDUCIR_CARGA'
  );
  const recommendationPaddocks = paddocksWithCounts.filter(
    (p) => dataById[p.id]?.recommendation && !alertPaddocks.includes(p)
  );
  const attentionPaddocks = [...alertPaddocks, ...recommendationPaddocks].filter(p => !rotationOrigins.has(p.id));
  const recommendationsCount = attentionPaddocks.length + rotationRecommendations.length;
  const attentionLoading = analyticsLoading || rotation.loading;

  const cargaAnimalSegments = (analiticas?.distribucionCargaAnimal ?? []).map((row) => {
    const label = CATEGORY_API_TO_UI[row.categoria] ?? row.categoria;
    return {
      key: row.categoria,
      label,
      value: row.cantidad_animales,
      color: CATEGORY_COLORS[label] || FALLBACK_CATEGORY_COLOR,
    };
  });

  const forageGrowthPoints = (analiticas?.evolucionStock7dias ?? [])
    .filter((d) => d.stock_total_kg_ms != null)
    .map((d) => ({ t: new Date(/^\d{4}-\d{2}-\d{2}$/.test(d.fecha) ? `${d.fecha}T12:00:00` : d.fecha).getTime(), value: Number(d.stock_total_kg_ms), coverage: `${d.potreros_con_datos}/${d.potreros_activos} potreros`, partial: !d.completo }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.value))
    .sort((a, b) => a.t - b.t);

  const rutasFrecuentes = trasladoAnaliticas?.rutasMasFrecuentes ?? [];
  const sourceTimestamps = paddocksWithCounts.flatMap((paddock) => {
    const entry = dataById[paddock.id];
    return [getTimestamp(entry?.stock), getTimestamp(entry?.nutrition), getTimestamp(entry?.recommendation)];
  });
  const latestTimestamp = [...sourceTimestamps, ...forageGrowthPoints.map((point) => point.t)]
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  const pageError = getErrorMessage(paddocksError) || getErrorMessage(cattleError);
  const paddockAnalyticsErrorMessage = getErrorMessage(paddockAnalyticsError);
  const estanciaDataError =
    getErrorMessage(estanciaErrors.analiticas) ||
    getErrorMessage(analiticasError) ||
    (!estanciaErrors.traslados ? getErrorMessage(estanciaAnaliticasError) : '');
  const analyticsError = paddockAnalyticsErrorMessage || estanciaDataError;
  const movementError =
    getErrorMessage(estanciaErrors.traslados) || getErrorMessage(trasladosError);

  return (
    <div className="app-page text-sm">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-bold text-white">
            {estancia?.nombre || 'Mi estancia'}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-sand-500">
            <span>{paddocksWithCounts.length} potreros</span>
            {latestTimestamp && (
              <span className="flex items-center gap-1.5">
                <Clock3 size={12} aria-hidden="true" /> Último dato: {formatShortDate(latestTimestamp)}
              </span>
            )}
          </p>
        </div>
        <Link
          to="/mapa"
          className="app-button-secondary self-start px-4 text-xs sm:self-auto">
          <LandPlot size={15} aria-hidden="true" /> Ver mapa general
        </Link>
      </header>

      {pageError && (
        <div className="app-error mt-5" role="alert">
          <strong className="block text-sm">No se pudo actualizar todo el resumen</strong>
          <span className="mt-0.5 block text-xs">{pageError} Los datos disponibles siguen visibles.</span>
        </div>
      )}

      <section className="app-panel mt-6 overflow-hidden" aria-labelledby="attention-heading">
        <div className="flex flex-col gap-2 border-b border-sand-100/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="attention-heading" className="text-base font-bold text-white">
              Atención y acciones
            </h2>
            <p className="mt-0.5 text-xs text-sand-500">
              Recomendaciones que requieren revisión en tus potreros.
            </p>
          </div>
          {!attentionLoading && (
            <span className="text-xs font-semibold text-sand-300">
              {recommendationsCount} {recommendationsCount === 1 ? 'pendiente' : 'pendientes'}
            </span>
          )}
        </div>
        {rotation.error && <p role="alert" className="app-error mx-5 my-3">No se pudieron comprobar las rotaciones. <Link to="/rotacion" className="underline">Revisar Rotación</Link></p>}
        {rotation.data?.partial && <p className="px-5 py-3 text-xs text-warning-400">Rotación tiene datos pendientes de actualizar; las recomendaciones pueden estar incompletas. <Link to="/rotacion" className="underline">Actualizar en Rotación</Link></p>}
        {rotationRecommendations.length > 0 && <div className="grid gap-px bg-sand-100/10 sm:grid-cols-2">
          {rotationRecommendations.map(r => <Link key={r.origin} to={`/rotacion#potrero-${r.origin}`} className="group flex items-start gap-3 bg-forest-800 px-5 py-4 hover:bg-forest-700">
            <ArrowLeftRight size={18} className="mt-1 shrink-0 text-warning-400" aria-hidden="true"/>
            <span className="min-w-0 flex-1"><strong className="block text-sm text-white">{r.name} · {r.reason === 'FUERA_USO' ? 'Vaciar potrero fuera de uso' : 'Rotación recomendada'}</strong>
              <span className="mt-1 block text-xs text-warning-400">{r.reason === 'FUERA_USO' ? `Redistribuir los ${r.remove} animales.` : `Retirar aproximadamente ${r.remove} animales.`}</span>
              {r.destinations.length > 0 && <span className="mt-1 block text-xs text-sand-300">{r.destinations.map(d => `${d.quantity} a ${d.name}`).join(' · ')}</span>}
              {r.unallocated > 0 && <span className="mt-1 block text-xs text-warning-400">{r.unallocated} sin destino sugerido{r.needsDemand ? ': falta actualizar consumo' : ': falta capacidad'}.</span>}
              <span className="mt-2 block text-xs text-sand-300">Ver recomendación →</span>
            </span>
          </Link>)}
        </div>}
        {attentionLoading ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2" aria-label="Cargando acciones">
            <LoadingBlock className="h-20" />
            <LoadingBlock className="h-20" />
          </div>
        ) : paddockAnalyticsErrorMessage && attentionPaddocks.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-5 text-sm text-warning-400">
            <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
            <span>No se pudieron comprobar las recomendaciones de los potreros.</span>
          </div>
        ) : attentionPaddocks.length === 0 && (rotationRecommendations.length > 0 || rotation.error || rotation.data?.partial) ? null : attentionPaddocks.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-5 text-sm text-sand-300">
            <CheckCircle2 size={18} className="shrink-0 text-brand-400" aria-hidden="true" />
            <span>No hay recomendaciones pendientes con los datos disponibles.</span>
          </div>
        ) : (
          <div className="grid gap-px bg-sand-100/10 sm:grid-cols-2">
            {attentionPaddocks.map((paddock) => {
              const details = buildPaddockStatus(dataById[paddock.id], paddock.hectares);
              const isAlert = Boolean(details.alert);
              return (
                <Link
                  key={paddock.id}
                  to={`/potreros/${paddock.id}`}
                  className="group flex min-w-0 items-center gap-3 bg-forest-800 px-5 py-4 transition-colors hover:bg-forest-700">
                  {isAlert ? (
                    <AlertTriangle size={18} className="shrink-0 text-danger-400" aria-hidden="true" />
                  ) : (
                    <Lightbulb size={18} className="shrink-0 text-warning-400" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-white">{paddock.name}</strong>
                    <span className={`mt-0.5 block truncate text-xs ${isAlert ? 'text-danger-400' : 'text-warning-400'}`}>
                      {details.alert || details.recommendation}
                    </span>
                  </span>
                  <ArrowRight size={16} className="shrink-0 text-sand-500 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="app-panel mt-4 grid grid-cols-2 divide-x divide-y divide-sand-100/10 overflow-hidden lg:grid-cols-4 lg:divide-y-0" aria-label="Indicadores principales">
        {loading ? (
          Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="p-4"><LoadingBlock className="h-12" /></div>
          ))
        ) : (
          <>
            {[
              [cattleError ? '—' : cattle.length, 'Cabezas en el campo', Beef],
              [paddocksError ? '—' : activePaddocks.length, 'Potreros activos', LandPlot],
              [paddocksError || paddockAnalyticsError ? '—' : alertPaddocks.length, 'Alertas de carga', AlertTriangle],
              [paddocksError || paddockAnalyticsError || rotation.error || rotation.loading ? '—' : recommendationsCount, 'Recomendaciones', Lightbulb],
            ].map(([value, label, Icon]) => (
              <div key={label} className="flex min-w-0 flex-col items-start gap-2 px-3 py-4 sm:flex-row sm:items-center sm:gap-3 sm:px-5">
                <Icon size={17} className="shrink-0 text-sand-500" aria-hidden="true" />
                <span className="min-w-0">
                  <strong className="block text-xl font-bold tabular-nums text-white">{value}</strong>
                  <span className="block break-words text-xs leading-tight text-sand-500">{label}</span>
                </span>
              </div>
            ))}
          </>
        )}
      </section>

      <section className="mt-8" aria-labelledby="paddock-status-heading">
        <div className="flex items-center justify-between">
          <h2 id="paddock-status-heading" className="text-base font-bold text-white">Estado de los potreros</h2>
          <Link
            to="/potreros"
            className="app-button-ghost min-h-9 text-xs">
            Ver todos <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Cargando potreros">
            {Array.from({ length: 3 }, (_, index) => <LoadingBlock key={index} className="h-40" />)}
          </div>
        ) : paddocksWithCounts.length === 0 ? (
          <div className="app-panel app-empty mt-3">
            <div>
              <p className="text-sm text-sand-300">Todavía no hay potreros creados.</p>
              <Link to="/mapa" className="app-button-primary mt-4 px-4 text-xs">Crear en el mapa</Link>
            </div>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paddocksWithCounts.map((paddock) => {
              const details = buildPaddockStatus(dataById[paddock.id], paddock.hectares);

              return (
                <Link
                  key={paddock.id}
                  to={`/potreros/${paddock.id}`}
                  className="app-panel group flex min-h-40 flex-col justify-between p-5 transition-colors hover:border-sand-100/25 hover:bg-forest-700">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-white">{paddock.name}</h3>
                      <p className="mt-1 text-xs text-sand-500">
                        {Number(paddock.hectares).toFixed(0)} ha · {paddock.animals} cabezas
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold"
                      style={{ color: details.statusColor, backgroundColor: details.statusBg }}>
                      {paddock.enabledForCattle === false ? 'Fuera de uso' : analyticsLoading ? 'Cargando' : details.status}
                    </span>
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <span className={`line-clamp-2 text-xs leading-relaxed ${details.alert ? 'text-danger-400' : details.recommendation ? 'text-warning-400' : 'text-sand-300'}`}>
                      {details.alert || details.recommendation || details.ok || 'Sin mediciones disponibles'}
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-sand-500 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8" aria-labelledby="analytics-heading">
        <h2 id="analytics-heading" className="text-base font-bold text-white">Analítica de la estancia</h2>
        <p className="mt-1 max-w-2xl text-xs text-sand-500">
          Agregado de todos los potreros: carga animal, Stock utilizable y movimientos de ganado.
        </p>
        {analyticsError && (
          <div className="app-error mt-3 text-xs" role="status">
            {analyticsError} Algunas analíticas pueden no estar disponibles.
          </div>
        )}

        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <article className="app-panel p-5">
            <div className="flex items-center gap-2">
              <Beef size={16} className="text-sand-500" aria-hidden="true" />
              <h3 className="text-sm font-bold text-sand-100">Carga animal por categoría</h3>
            </div>
            {estanciaAnaliticasLoading ? (
              <LoadingBlock className="mt-4 h-64" />
            ) : estanciaDataError ? (
              <p className="app-empty min-h-64 text-xs">No se pudo cargar esta distribución.</p>
            ) : (
              <DonutChart
                segments={cargaAnimalSegments}
                emptyMessage="Todavía no hay ganado registrado."
                ariaLabel="Distribución de carga animal por categoría"
              />
            )}
          </article>

          <article className="app-panel p-5">
            <div className="flex items-center gap-2">
              <Sprout size={16} className="text-sand-500" aria-hidden="true" />
              <h3 className="text-sm font-bold text-sand-100">Stock utilizable por potrero</h3>
            </div>
            {estanciaAnaliticasLoading ? (
              <LoadingBlock className="mt-4 h-64" />
            ) : estanciaDataError ? (
              <p className="app-empty min-h-64 text-xs">No se pudo cargar la distribución de Stock.</p>
            ) : (
              <ForageDistributionList rows={analiticas?.distribucionStock ?? []} />
            )}
          </article>

          <article className="app-panel p-5 lg:col-span-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Sprout size={16} className="text-brand-400" aria-hidden="true" />
                <h3 className="text-sm font-bold text-sand-100">Stock utilizable total · últimos 7 días</h3>
              </div>
              {forageGrowthPoints.length > 0 && (
                <span className="text-xs text-sand-500">
                  Datos al {formatShortDate(forageGrowthPoints[forageGrowthPoints.length - 1].t)}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-sand-500">Suma del último saldo de cada potrero para cada fecha, en kg MS. No se cuentan los recálculos repetidos.</p>
            {forageGrowthPoints.some((point) => point.partial) && (
              <p className="mt-2 text-xs text-amber-400">Hay días con datos parciales: el total incluye solo los potreros con stock calculado para esa fecha. Consultá cada punto para ver la cobertura.</p>
            )}
            {estanciaAnaliticasLoading ? (
              <LoadingBlock className="mt-4 h-52" />
            ) : estanciaDataError ? (
              <p className="app-empty min-h-52 text-xs">No se pudo cargar la evolución del Stock.</p>
            ) : (
              <TrendLineChart
                points={forageGrowthPoints}
                color={FORAGE_COLOR}
                formatX={formatShortDate}
                formatTooltip={(point) => `${formatShortDate(point.t)} · ${point.value.toLocaleString('es-AR', { maximumFractionDigits: 0 })} kg MS · ${point.coverage}${point.partial ? ' · Parcial' : ''}`}
                emptyMessage="Todavía no hay suficientes mediciones en los últimos 7 días."
                ariaLabel="Stock utilizable total de la estancia durante los últimos 7 días"
              />
            )}
          </article>

          <article className="app-panel p-5 lg:col-span-2">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={16} className="text-sand-500" aria-hidden="true" />
              <h3 className="text-sm font-bold text-sand-100">Traslados de ganado</h3>
            </div>
            {estanciaAnaliticasLoading ? (
              <LoadingBlock className="mt-4 h-40" />
            ) : movementError ? (
              <div className="app-error mt-3 text-xs" role="status">
                {movementError} No se muestran totales para evitar datos incompletos.
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:w-72">
                  <div className="rounded-lg border border-white/[.06] bg-white/[.02] p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-sand-500">
                      Traslados
                    </p>
                    <p className="mt-1 text-[17px] font-bold text-white">
                      {trasladoAnaliticas?.totalTraslados ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/[.06] bg-white/[.02] p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-sand-500">
                      Animales movidos
                    </p>
                    <p className="mt-1 text-[17px] font-bold text-white">
                      {trasladoAnaliticas?.totalAnimalesMovidos ?? 0}
                    </p>
                  </div>
                </div>

                <h4 className="mt-5 text-xs font-bold text-sand-300">Rutas más frecuentes</h4>
                {rutasFrecuentes.length === 0 ? (
                  <p className="mt-2 text-xs text-sand-500">
                    Todavía no hay traslados registrados.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {rutasFrecuentes.map((ruta, index) => (
                      <div
                        key={`${ruta.id_potrero_origen}-${ruta.id_potrero_destino}-${index}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-sand-100/10 bg-sand-100/[.02] px-3.5 py-2.5 text-xs">
                        <span className="flex min-w-0 items-center gap-1.5 text-sand-300">
                          <span className="truncate font-semibold text-white">
                            {ruta.potrero_origen_nombre}
                          </span>
                          <ArrowLeftRight size={12} className="shrink-0 text-sand-500" />
                          <span className="truncate font-semibold text-white">
                            {ruta.potrero_destino_nombre}
                          </span>
                        </span>
                        <span className="shrink-0 text-sand-500">
                          {ruta.cantidad_animales}{' '}
                          {ruta.cantidad_animales === 1 ? 'animal' : 'animales'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
