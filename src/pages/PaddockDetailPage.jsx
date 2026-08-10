import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  Calculator,
  CheckCircle2,
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudSun,
  Droplets,
  LoaderCircle,
  MapPin,
  Plus,
  Satellite,
  Sun,
  Thermometer,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import usePaddocks from '../hooks/usePaddocks.js';
import useCattle from '../hooks/useCattle.js';
import usePaddockAnalytics, { buildPaddockStatus } from '../hooks/usePaddockAnalytics.js';
import { withAnimalCounts } from '../services/mappers.js';
import {
  createForageEstimate,
  createNutritionEstimate,
  fetchForageHistory,
  fetchLatestClima,
  fetchPaddockTraslados,
} from '../services/analyticsService.js';
import { createCattleForPaddock } from '../services/cattleService.js';
import { CATEGORY_COLORS, FALLBACK_CATEGORY_COLOR } from '../services/mappers.js';
import { formatShortDate } from '../utils/format.js';
import AddCattleModal from '../components/AddCattleModal.jsx';
import PolygonMapCanvas from '../components/PolygonMapCanvas.jsx';
import DonutChart from '../components/DonutChart.jsx';
import TrendLineChart from '../components/TrendLineChart.jsx';

function ToastNotification({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className="animate-rise fixed right-4 top-4 z-[3000] flex w-[min(92vw,340px)] items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-[#161619] px-4 py-3.5 shadow-2xl">
      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold text-white">{toast.title || 'Listo'}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-stone-400">{toast.message}</p>
      </div>
      <button onClick={onClose} className="shrink-0 text-stone-500 hover:text-white">
        <X size={14} />
      </button>
    </div>
  );
}

// Lectura orientativa (no un pronóstico) de temperatura/precipitación/humedad
// reales del último dato climático, para darle una cara visual a la tarjeta.
function describeWeather({ temperatura, precipitacion, humedad }) {
  const precip = precipitacion != null ? Number(precipitacion) : null;
  const hum = humedad != null ? Number(humedad) : null;
  const temp = temperatura != null ? Number(temperatura) : null;

  if (precip != null && precip > 5) {
    return { Icon: CloudRain, label: 'Lluvioso', color: '#3987e5' };
  }
  if (precip != null && precip > 0) {
    return { Icon: CloudDrizzle, label: 'Llovizna', color: '#5598e7' };
  }
  if (hum != null && hum >= 75) {
    return { Icon: Cloud, label: 'Nublado y húmedo', color: '#898781' };
  }
  if (temp != null && temp >= 28) {
    return { Icon: Sun, label: 'Cálido y despejado', color: '#c98500' };
  }
  return { Icon: CloudSun, label: 'Templado', color: '#eda100' };
}

// Fila estilo "pronóstico" (ícono + etiqueta + barra + valor), pero aplicada
// a una sola lectura real en vez de un rango mín/máx por día — no fabricamos
// un forecast que no existe, sólo tomamos prestado el lenguaje visual.
function WeatherMetricRow({ icon: Icon, color, label, value, max, unit, decimals = 0 }) {
  const numeric = value != null ? Number(value) : null;
  const pct = numeric != null ? Math.min(100, Math.max(0, (numeric / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3 text-[11px]">
      <span className="flex w-[92px] shrink-0 items-center gap-1.5 text-stone-400">
        <Icon size={13} style={{ color }} />
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[.06]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <strong className="w-14 shrink-0 text-right text-white">
        {numeric != null ? `${numeric.toFixed(decimals)}${unit}` : '-'}
      </strong>
    </div>
  );
}

function ForageTrendChart({ history, color }) {
  const points = history
    .map((h) => ({ t: new Date(h.fecha_calculo).getTime(), value: Number(h.kg_materia_seca_ha) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.value));

  return (
    <TrendLineChart
      points={points}
      color={color}
      formatX={formatShortDate}
      formatTooltip={(p) => `${formatShortDate(p.t)} · ${p.value.toFixed(0)} kg MS/ha`}
      emptyMessage="Todavía no hay suficiente histórico para graficar la evolución."
    />
  );
}

export default function PaddockDetailPage() {
  const { paddockId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const mapPreviewRef = useRef(null);
  const { estanciaId } = useAuth();
  const { paddocks, loading: paddocksLoading } = usePaddocks(estanciaId);
  const { cattle, loading: cattleLoading, reload: reloadCattle } = useCattle(estanciaId);
  const paddocksWithCounts = withAnimalCounts(paddocks, cattle);
  const paddock = paddocksWithCounts.find((p) => String(p.id) === paddockId);

  const { dataById, loading: analyticsLoading } = usePaddockAnalytics(paddock ? [paddock] : []);
  const entry = paddock ? dataById[paddock.id] : null;

  const [toast, setToast] = useState(location.state?.toast ?? null);
  useEffect(() => {
    if (!location.state?.toast) return;
    // Limpiamos el state de navegación para que un refresh o "atrás" no
    // vuelva a mostrar el mismo toast.
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const [forageHistory, setForageHistory] = useState([]);
  useEffect(() => {
    if (!paddock) return undefined;
    let cancelled = false;
    fetchForageHistory(paddock.id).then((rows) => {
      if (!cancelled) setForageHistory(rows);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paddock?.id]);

  const [clima, setClima] = useState(null);
  const [traslados, setTraslados] = useState([]);
  useEffect(() => {
    if (!paddock) return undefined;
    let cancelled = false;
    fetchLatestClima(paddock.id).then((data) => {
      if (!cancelled) setClima(data);
    });
    fetchPaddockTraslados(paddock.id).then((rows) => {
      if (!cancelled) setTraslados(rows);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paddock?.id]);

  const [forageGenLoading, setForageGenLoading] = useState(false);
  const [forageGenError, setForageGenError] = useState('');
  const [forageOverride, setForageOverride] = useState(null);

  useEffect(() => {
    setForageOverride(null);
    setForageGenError('');
  }, [paddock?.id]);

  const latestForage = forageOverride ?? entry?.forage ?? null;

  async function handleGenerateForage() {
    if (!paddock) return;
    setForageGenLoading(true);
    setForageGenError('');
    try {
      const result = await createForageEstimate(paddock.id);
      setForageOverride(result);
      setForageHistory((current) => [...current, result]);
      if (result.clima) setClima(result.clima);
    } catch (err) {
      setForageGenError(err.message || 'No se pudo calcular la disponibilidad forrajera.');
    } finally {
      setForageGenLoading(false);
    }
  }

  const [dmiLoading, setDmiLoading] = useState(false);
  const [dmiError, setDmiError] = useState('');
  const [dmiOverride, setDmiOverride] = useState(null);
  const nutrition = dmiOverride ?? entry?.nutrition ?? null;

  const status = buildPaddockStatus(
    { ...entry, forage: latestForage, nutrition },
    paddock?.hectares
  );

  useEffect(() => {
    setDmiOverride(null);
    setDmiError('');
  }, [paddock?.id]);

  async function handleRecalculateDmi() {
    if (!paddock) return;
    setDmiLoading(true);
    setDmiError('');
    try {
      const result = await createNutritionEstimate(paddock.id);
      setDmiOverride(result);
    } catch (err) {
      setDmiError(err.message || 'No se pudo calcular el consumo DMI.');
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
  }, [paddock?.id]);

  function toggleHerdSelection(id) {
    setSelectedHerdIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleHerdSelectAll() {
    setSelectedHerdIds((current) => (current.length === herd.length ? [] : herd.map((a) => a.id)));
  }

  async function handleAddCattle({ animals }) {
    if (!paddock) return;
    setMutating(true);
    setActionError('');
    try {
      for (const payload of animals) {
        await createCattleForPaddock(paddock.id, payload);
      }
      await reloadCattle();
      setAddingCattle(false);
    } catch (err) {
      setActionError(err.message || 'No se pudo agregar el ganado.');
    } finally {
      setMutating(false);
    }
  }

  if (paddocksLoading || cattleLoading) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 pb-8 pt-16 sm:px-7 md:pt-7 lg:px-10 text-sm">
        <ToastNotification toast={toast} onClose={() => setToast(null)} />
        <div className="flex items-center gap-2 text-[12px] text-stone-500">
          <LoaderCircle size={16} className="animate-spin" /> Cargando potrero...
        </div>
      </div>
    );
  }

  if (!paddock) {
    return (
      <div className="px-4 pb-8 pt-16 sm:px-7 md:pt-7 lg:px-10 text-sm">
        <ToastNotification toast={toast} onClose={() => setToast(null)} />
        <Link
          to="/potreros"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-white">
          <ArrowLeft size={13} /> Potreros
        </Link>
        <p className="mt-6 text-center text-[12px] text-stone-500">No encontramos este potrero.</p>
      </div>
    );
  }

  const herd = cattle.filter((a) => a.paddockId === paddock.id);
  const herdByCategory = herd.reduce((acc, a) => {
    const key = a.category || 'Sin categoría';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const forageValues = forageHistory
    .map((h) => Number(h.kg_materia_seca_ha))
    .filter(Number.isFinite);
  const maxForage = Math.max(...forageValues, Number(latestForage?.kg_materia_seca_ha) || 0, 1);
  const forageBarPct = latestForage
    ? Math.min(100, (Number(latestForage.kg_materia_seca_ha) / maxForage) * 100)
    : 0;

  const paddockNameById = new Map(paddocksWithCounts.map((p) => [p.id, p.name]));

  return (
    <div className="min-h-full px-4 pb-10 pt-16 sm:px-7 md:pt-7 lg:px-10 text-sm">
      <ToastNotification toast={toast} onClose={() => setToast(null)} />
      <AddCattleModal
        isOpen={addingCattle}
        onClose={() => setAddingCattle(false)}
        onAdd={handleAddCattle}
        existingCaravanas={cattle.map((c) => c.caravana)}
        cattle={cattle}
        lockedPaddockId={paddock.id}
        lockedPaddockLabel={paddock.name}
      />

      <Link
        to="/potreros"
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-white">
        <ArrowLeft size={13} /> Potreros
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-white">{paddock.name}</h1>
          <p className="mt-0.5 text-[12px] font-medium text-stone-500">
            {paddock.hectares.toFixed(0)} ha
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold"
          style={{ color: status.statusColor, backgroundColor: status.statusBg }}>
          {analyticsLoading ? '...' : status.status}
        </span>
      </div>

      {actionError && (
        <p className="mt-4 rounded-lg bg-red-500/10 px-3.5 py-2.5 text-[11px] font-semibold text-red-400">
          {actionError}
        </p>
      )}

      {status.alert && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
          <div>
            <p className="text-[12px] font-bold text-red-400">Potrero sobrecargado</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-red-300/90">{status.alert}</p>
          </div>
        </div>
      )}
      {status.recommendation && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
          <div>
            <p className="text-[12px] font-bold text-amber-400">Hay una recomendación pendiente</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-300/90">
              {status.recommendation}
            </p>
          </div>
        </div>
      )}
      {status.ok && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-white/[.06] bg-white/[.03] px-4 py-3">
          <CheckCircle2 size={15} className="shrink-0 text-stone-500" />
          <p className="text-[11px] font-semibold text-stone-300">{status.ok}</p>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-white/[.06] bg-[#161619] p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-base text-white">Disponibilidad de pasto</h2>
                <p className="mt-0.5 text-[11px] text-stone-500">
                  Medición vigente y su evolución en el tiempo (NDVI Sentinel-2).
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateForage}
                disabled={forageGenLoading}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[.08] bg-white/[.03] px-3 py-1.5 text-[11px] font-bold text-stone-300 hover:bg-white/[.06] disabled:opacity-50">
                {forageGenLoading ? (
                  <LoaderCircle size={12} className="animate-spin" />
                ) : (
                  <Satellite size={12} />
                )}
                {latestForage ? 'Actualizar medición' : 'Calcular disponibilidad'}
              </button>
            </div>

            {forageGenError && (
              <p className="mt-3 rounded-md bg-red-500/10 p-2.5 text-[11px] font-semibold text-red-400">
                {forageGenError}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/[.06] bg-white/[.02] p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Tasa de crecimiento de pasto
                </p>
                <p className="mt-1 text-[17px] font-bold" style={{ color: status.statusColor }}>
                  {status.grass}
                </p>
              </div>
              {latestForage?.indice_ndvi != null && (
                <div className="rounded-lg border border-white/[.06] bg-white/[.02] p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Verdor (NDVI)
                  </p>
                  <p className="mt-1 text-[17px] font-bold text-white">
                    {Number(latestForage.indice_ndvi).toFixed(2)}
                  </p>
                </div>
              )}
              {latestForage?.superficie_analizada_ha != null && (
                <div className="rounded-lg border border-white/[.06] bg-white/[.02] p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Superficie analizada
                  </p>
                  <p className="mt-1 text-[17px] font-bold text-white">
                    {Number(latestForage.superficie_analizada_ha).toFixed(1)} ha
                  </p>
                </div>
              )}
            </div>

            {latestForage && (
              <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[.04]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${forageBarPct}%`, backgroundColor: status.statusColor }}
                />
              </div>
            )}

            <h3 className="mt-6 text-[12px] font-bold text-stone-300">Evolución del pasto</h3>
            <ForageTrendChart history={forageHistory} color={status.statusColor} />
          </section>

          <section className="rounded-xl border border-white/[.06] bg-[#161619] p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-base text-white">Demanda nutricional</h2>
                <p className="mt-0.5 text-[11px] text-stone-500">
                  Cuánto pasto pide hoy la hacienda de este potrero.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRecalculateDmi}
                disabled={dmiLoading || herd.length === 0}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[.08] bg-white/[.03] px-3 py-1.5 text-[11px] font-bold text-stone-300 hover:bg-white/[.06] disabled:opacity-50">
                {dmiLoading ? (
                  <LoaderCircle size={12} className="animate-spin" />
                ) : (
                  <Calculator size={12} />
                )}
                Recalcular
              </button>
            </div>

            {dmiError && (
              <p className="mt-3 rounded-md bg-red-500/10 p-2.5 text-[11px] font-semibold text-red-400">
                {dmiError}
              </p>
            )}

            {nutrition ? (
              <>
                <p className="mt-4 font-display text-[26px] font-bold text-white">
                  {Number(nutrition.kg_materia_seca_dia).toFixed(1)}{' '}
                  <span className="font-sans text-[13px] font-semibold text-stone-500">
                    kg MS/día
                  </span>
                </p>
                <p className="text-[11px] text-stone-500">
                  {nutrition.cantidad_animales}{' '}
                  {nutrition.cantidad_animales === 1 ? 'animal' : 'animales'} · calculado{' '}
                  {formatShortDate(nutrition.fecha_calculo)}
                </p>
              </>
            ) : (
              <p className="mt-4 text-[11px] text-stone-500">
                Todavía no se calculó la demanda nutricional de este potrero.
              </p>
            )}

            {Object.keys(herdByCategory).length > 0 && (
              <div className="mt-4 space-y-1.5 border-t border-white/[.06] pt-3.5">
                {Object.entries(herdByCategory).map(([cat, count]) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between text-[11px] text-stone-400">
                    <span>{cat}</span>
                    <strong className="text-stone-200">
                      {count} {count === 1 ? 'cab.' : 'cab.'}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-white/[.06] bg-[#161619] p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base text-white">Ganado asignado</h2>
                <p className="mt-0.5 text-[11px] text-stone-500">
                  Animales que están pastoreando en este potrero.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddingCattle(true)}
                disabled={mutating}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-bold text-black hover:bg-emerald-400 disabled:opacity-50">
                <Plus size={13} /> Agregar ganado
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-stone-500">
                {herd.length} {herd.length === 1 ? 'animal asignado' : 'animales asignados'}
              </p>
              {selectedHerdIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
                  <span className="text-[11px] font-semibold text-emerald-400">
                    {selectedHerdIds.length} seleccionados
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/traslado', { state: { animalIds: selectedHerdIds } })}
                    className="flex items-center gap-1 rounded bg-white/[.08] px-2.5 py-1 text-[10px] font-bold text-stone-200 hover:bg-white/[.14]">
                    <ArrowLeftRight size={12} /> Trasladar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedHerdIds([])}
                    className="text-[10px] text-stone-500 hover:text-white">
                    Limpiar
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                {herd.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-white/[.06]">
                    <table className="w-full min-w-[420px] text-left text-[11px]">
                      <thead className="border-b border-white/[.06] text-[10px] uppercase tracking-wider text-stone-500">
                        <tr>
                          <th className="w-8 px-3 py-2">
                            <input
                              type="checkbox"
                              checked={herd.length > 0 && selectedHerdIds.length === herd.length}
                              onChange={toggleHerdSelectAll}
                              className="rounded border-white/[.1] bg-[#0b0b0c] text-emerald-500 focus:ring-0 focus:ring-offset-0"
                            />
                          </th>
                          <th className="px-3 py-2 font-bold">Caravana</th>
                          <th className="px-3 py-2 font-bold">Categoría</th>
                          <th className="px-3 py-2 text-right font-bold">Peso</th>
                          <th className="px-3 py-2 font-bold">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[.05] text-stone-300">
                        {herd.map((a) => (
                          <tr
                            key={a.id}
                            className={
                              selectedHerdIds.includes(a.id) ? 'bg-emerald-500/[0.03]' : ''
                            }>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selectedHerdIds.includes(a.id)}
                                onChange={() => toggleHerdSelection(a.id)}
                                className="rounded border-white/[.1] bg-[#0b0b0c] text-emerald-500 focus:ring-0 focus:ring-offset-0"
                              />
                            </td>
                            <td className="px-3 py-2 font-semibold text-white">{a.caravana}</td>
                            <td className="px-3 py-2">{a.category}</td>
                            <td className="px-3 py-2 text-right">{a.weight}</td>
                            <td className="px-3 py-2">{a.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="md:col-span-1 md:border-l md:border-white/[.06] md:pl-4">
                <p className="text-[11px] font-bold text-stone-300">Distribución por categoría</p>
                <DonutChart
                  segments={Object.entries(herdByCategory).map(([category, count]) => ({
                    key: category,
                    label: category,
                    value: count,
                    color: CATEGORY_COLORS[category] || FALLBACK_CATEGORY_COLOR,
                  }))}
                  emptyMessage="Sin animales asignados todavía."
                  ariaLabel="Distribución del rodeo por categoría"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-white/[.06] bg-[#161619] p-5">
            <h2 className="font-display text-base text-white">Traslados recientes</h2>
            <p className="mt-0.5 text-[11px] text-stone-500">
              Entradas y salidas de ganado de este potrero.
            </p>

            {traslados.length === 0 ? (
              <p className="mt-4 text-[11px] text-stone-500">
                Todavía no hay traslados registrados para este potrero.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {traslados.slice(0, 6).map((t) => {
                  const isEntrada = t.direccion === 'entrada';
                  const counterpartId = isEntrada ? t.id_potrero_origen : t.id_potrero_destino;
                  const counterpartName =
                    paddockNameById.get(counterpartId) || 'potrero desconocido';
                  return (
                    <div
                      key={t.id_traslado}
                      className="flex items-start gap-3 rounded-lg border border-white/[.06] bg-white/[.02] px-3.5 py-2.5">
                      <span
                        className="mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                        style={
                          isEntrada
                            ? { color: '#199e70', backgroundColor: '#199e7022' }
                            : { color: '#d95926', backgroundColor: '#d9592622' }
                        }>
                        {isEntrada ? 'Entrada' : 'Salida'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-stone-300">
                          {isEntrada ? 'Desde' : 'Hacia'}{' '}
                          <strong className="text-white">{counterpartName}</strong>
                        </p>
                        <p className="mt-0.5 text-[10px] text-stone-500">
                          {formatShortDate(t.fecha_movimiento)}
                          {t.observaciones ? ` · ${t.observaciones}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="lg:col-span-1">
          <section className="rounded-xl border border-white/[.06] bg-[#161619] p-5">
            <h2 className="font-display text-base text-white">Polígono del potrero</h2>
            <p className="mt-0.5 text-[11px] text-stone-500">
              Ubicación y forma real, tal como se ve en el mapa.
            </p>
            <div className="mt-3 h-48 overflow-hidden rounded-lg border border-white/[.06]">
              <PolygonMapCanvas
                mapRef={mapPreviewRef}
                isDrawing={false}
                vertices={[]}
                existingPolygons={[
                  {
                    id: paddock.id,
                    coordinates: paddock.coordinates,
                    color: status.statusColor,
                    label: paddock.name,
                  },
                ]}
                restrictTo={paddock.coordinates}
              />
            </div>
          </section>

          <section className="mt-4 rounded-xl border border-white/[.06] bg-[#161619] p-5">
            <div className="flex items-center justify-center gap-1 text-[11px] text-stone-500">
              <MapPin size={11} />
              {paddock.name}
            </div>

            {clima ? (
              <>
                {(() => {
                  const weather = describeWeather(clima);
                  const WeatherIcon = weather.Icon;
                  const temp = clima.temperatura != null ? Number(clima.temperatura) : null;
                  return (
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <WeatherIcon size={44} strokeWidth={1.5} style={{ color: weather.color }} />
                      <p className="font-display text-[34px] font-bold leading-none text-white">
                        {temp != null ? `${Math.round(temp)}°` : '-'}
                      </p>
                      <div className="text-right">
                        <p className="text-[13px] font-bold text-white">{weather.label}</p>
                        {clima.humedad != null && (
                          <p className="text-[10px] text-stone-500">
                            Humedad {Number(clima.humedad).toFixed(0)}%
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-5 space-y-3 border-t border-white/[.06] pt-4">
                  <WeatherMetricRow
                    icon={Thermometer}
                    color="#c98500"
                    label="Temperatura"
                    value={clima.temperatura}
                    max={40}
                    unit="°"
                    decimals={1}
                  />
                  <WeatherMetricRow
                    icon={CloudRain}
                    color="#3987e5"
                    label="Precipitación"
                    value={clima.precipitacion}
                    max={50}
                    unit=" mm"
                    decimals={1}
                  />
                  <WeatherMetricRow
                    icon={Droplets}
                    color="#199e70"
                    label="Humedad"
                    value={clima.humedad}
                    max={100}
                    unit="%"
                  />
                </div>

                <p className="mt-4 text-center text-[10px] text-stone-600">
                  Último dato registrado{clima.fecha ? ` · ${formatShortDate(clima.fecha)}` : ''}.
                </p>
              </>
            ) : (
              <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/[.08] px-4 py-6 text-center">
                <span className="grid size-14 place-items-center rounded-full bg-white/[.04] text-stone-600">
                  <CloudSun size={28} strokeWidth={1.5} />
                </span>
                <p className="text-[11px] text-stone-500">
                  Todavía no hay datos climáticos para este potrero. Se generan junto con la
                  disponibilidad de pasto — usá &quot;Calcular disponibilidad&quot; arriba.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
