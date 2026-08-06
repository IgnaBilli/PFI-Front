import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
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
import AddCattleModal from '../components/AddCattleModal.jsx';
import PolygonMapCanvas from '../components/PolygonMapCanvas.jsx';

function formatShortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
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

// Orden categórico fijo (nunca ciclado por índice) — paleta validada CVD-safe
// del sistema de referencia, pasos "dark" (única superficie que usa la app).
const CATEGORY_COLORS = {
  Vaca: '#3987e5',
  Vaquilla: '#d95926',
  Novillo: '#199e70',
  Toro: '#c98500',
  'Ternero/Ternera': '#d55181',
};
const FALLBACK_CATEGORY_COLOR = '#898781';

function polarToCartesian(cx, cy, r, angle) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function donutArcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const startOuter = polarToCartesian(cx, cy, rOuter, startAngle);
  const endOuter = polarToCartesian(cx, cy, rOuter, endAngle);
  const startInner = polarToCartesian(cx, cy, rInner, endAngle);
  const endInner = polarToCartesian(cx, cy, rInner, startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

function HerdCategoryDonut({ counts, total }) {
  const [hoverKey, setHoverKey] = useState(null);

  if (total === 0) {
    return (
      <p className="mt-3 rounded-lg border border-dashed border-white/[.08] px-4 py-8 text-center text-[11px] text-stone-600">
        Sin animales asignados todavía.
      </p>
    );
  }

  const cx = 90;
  const cy = 90;
  const rOuter = 80;
  const rInner = 52;
  let cursor = -Math.PI / 2;
  const segments = Object.entries(counts).map(([category, count]) => {
    const fraction = count / total;
    const startAngle = cursor;
    const endAngle = cursor + fraction * Math.PI * 2;
    cursor = endAngle;
    return {
      category,
      count,
      fraction,
      startAngle,
      endAngle,
      color: CATEGORY_COLORS[category] || FALLBACK_CATEGORY_COLOR,
    };
  });

  const hovered = segments.find((s) => s.category === hoverKey) || null;

  return (
    <div className="mt-3">
      <div className="relative mx-auto w-fit">
        <svg width="180" height="180" viewBox="0 0 180 180" role="img" aria-label="Distribución del rodeo por categoría">
          {segments.map((s) => (
            <path
              key={s.category}
              d={donutArcPath(cx, cy, rOuter, rInner, s.startAngle, s.endAngle)}
              fill={s.color}
              stroke="#161619"
              strokeWidth={2}
              opacity={hoverKey && hoverKey !== s.category ? 0.35 : 1}
              style={{ cursor: 'pointer', transition: 'opacity .15s' }}
              onMouseEnter={() => setHoverKey(s.category)}
              onMouseLeave={() => setHoverKey((k) => (k === s.category ? null : k))}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[22px] font-bold text-white">{hovered ? hovered.count : total}</span>
          <span className="max-w-[80px] truncate text-[9px] font-semibold uppercase tracking-wider text-stone-500">
            {hovered ? hovered.category : 'Total'}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        {segments.map((s) => (
          <div
            key={s.category}
            className="flex items-center justify-between text-[11px] cursor-pointer"
            onMouseEnter={() => setHoverKey(s.category)}
            onMouseLeave={() => setHoverKey((k) => (k === s.category ? null : k))}>
            <span className="flex items-center gap-1.5 text-stone-400">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              {s.category}
            </span>
            <strong className="text-stone-200">
              {s.count} · {Math.round(s.fraction * 100)}%
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ForageTrendChart({ history, color }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const points = history
    .map((h) => ({ t: new Date(h.fecha_calculo).getTime(), value: Number(h.kg_materia_seca_ha) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.value));

  if (points.length < 2) {
    return (
      <p className="mt-3 rounded-lg border border-dashed border-white/[.08] px-4 py-6 text-center text-[11px] text-stone-600">
        Todavía no hay suficiente histórico para graficar la evolución.
      </p>
    );
  }

  const width = 600;
  const height = 200;
  const padding = { top: 12, right: 12, bottom: 22, left: 38 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const minT = points[0].t;
  const maxT = points[points.length - 1].t;
  const maxValue = Math.max(...points.map((p) => p.value), 1);

  const x = (t) => padding.left + (maxT === minT ? innerW / 2 : ((t - minT) / (maxT - minT)) * innerW);
  const y = (v) => padding.top + innerH - (v / maxValue) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.t).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(' ');
  const areaPath =
    `${linePath} L ${x(points[points.length - 1].t).toFixed(1)} ${(padding.top + innerH).toFixed(1)} ` +
    `L ${x(points[0].t).toFixed(1)} ${(padding.top + innerH).toFixed(1)} Z`;

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="relative mt-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Evolución del pasto disponible">
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerH * (1 - f)}
            y2={padding.top + innerH * (1 - f)}
            stroke="rgba(255,255,255,.06)"
          />
        ))}
        <text x={padding.left - 6} y={padding.top + 4} textAnchor="end" className="fill-stone-600" fontSize="9">
          {Math.round(maxValue)}
        </text>
        <text x={padding.left - 6} y={padding.top + innerH} textAnchor="end" className="fill-stone-600" fontSize="9">
          0
        </text>
        <path d={areaPath} fill={color} fillOpacity="0.12" stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(p.t)} cy={y(p.value)} r={hoverIndex === i ? 4 : 2.5} fill={color} stroke="#161619" strokeWidth="1.5" />
            <rect
              x={x(p.t) - 10}
              y={padding.top}
              width="20"
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex((current) => (current === i ? null : current))}
            />
          </g>
        ))}
        <text x={padding.left} y={height - 6} className="fill-stone-600" fontSize="9">
          {formatShortDate(points[0].t)}
        </text>
        <text x={width - padding.right} y={height - 6} textAnchor="end" className="fill-stone-600" fontSize="9">
          {formatShortDate(points[points.length - 1].t)}
        </text>
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-white/10 bg-[#0b0b0c] px-2 py-1 text-[10px] font-semibold text-white shadow-xl"
          style={{ left: `${(x(hovered.t) / width) * 100}%`, top: `${(y(hovered.value) / height) * 100}%` }}>
          {formatShortDate(hovered.t)} · {hovered.value.toFixed(0)} kg MS/ha
        </div>
      )}
    </div>
  );
}

export default function PaddockDetailPage() {
  const { paddockId } = useParams();
  const mapPreviewRef = useRef(null);
  const { estanciaId } = useAuth();
  const { paddocks, loading: paddocksLoading } = usePaddocks(estanciaId);
  const { cattle, loading: cattleLoading, reload: reloadCattle } = useCattle(estanciaId);
  const paddocksWithCounts = withAnimalCounts(paddocks, cattle);
  const paddock = paddocksWithCounts.find((p) => String(p.id) === paddockId);

  const { dataById, loading: analyticsLoading } = usePaddockAnalytics(paddock ? [paddock] : []);
  const entry = paddock ? dataById[paddock.id] : null;

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
  const status = buildPaddockStatus({ ...entry, forage: latestForage });

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
        <div className="flex items-center gap-2 text-[12px] text-stone-500">
          <LoaderCircle size={16} className="animate-spin" /> Cargando potrero...
        </div>
      </div>
    );
  }

  if (!paddock) {
    return (
      <div className="px-4 pb-8 pt-16 sm:px-7 md:pt-7 lg:px-10 text-sm">
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

  const forageValues = forageHistory.map((h) => Number(h.kg_materia_seca_ha)).filter(Number.isFinite);
  const maxForage = Math.max(...forageValues, Number(latestForage?.kg_materia_seca_ha) || 0, 1);
  const forageBarPct = latestForage
    ? Math.min(100, (Number(latestForage.kg_materia_seca_ha) / maxForage) * 100)
    : 0;

  const paddockNameById = new Map(paddocksWithCounts.map((p) => [p.id, p.name]));

  return (
    <div className="min-h-full px-4 pb-10 pt-16 sm:px-7 md:pt-7 lg:px-10 text-sm">
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
          <p className="mt-0.5 text-[12px] font-medium text-stone-500">{paddock.hectares.toFixed(0)} ha</p>
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
            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-300/90">{status.recommendation}</p>
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
            {forageGenLoading ? <LoaderCircle size={12} className="animate-spin" /> : <Satellite size={12} />}
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
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Pasto disponible</p>
            <p className="mt-1 text-[17px] font-bold" style={{ color: status.statusColor }}>
              {status.grass}
            </p>
          </div>
          {latestForage?.indice_ndvi != null && (
            <div className="rounded-lg border border-white/[.06] bg-white/[.02] p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Verdor (NDVI)</p>
              <p className="mt-1 text-[17px] font-bold text-white">{Number(latestForage.indice_ndvi).toFixed(2)}</p>
            </div>
          )}
          {latestForage?.superficie_analizada_ha != null && (
            <div className="rounded-lg border border-white/[.06] bg-white/[.02] p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Superficie analizada</p>
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
              <p className="mt-0.5 text-[11px] text-stone-500">Cuánto pasto pide hoy la hacienda de este potrero.</p>
            </div>
            <button
              type="button"
              onClick={handleRecalculateDmi}
              disabled={dmiLoading || herd.length === 0}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[.08] bg-white/[.03] px-3 py-1.5 text-[11px] font-bold text-stone-300 hover:bg-white/[.06] disabled:opacity-50">
              {dmiLoading ? <LoaderCircle size={12} className="animate-spin" /> : <Calculator size={12} />}
              Recalcular
            </button>
          </div>

          {dmiError && (
            <p className="mt-3 rounded-md bg-red-500/10 p-2.5 text-[11px] font-semibold text-red-400">{dmiError}</p>
          )}

          {nutrition ? (
            <>
              <p className="mt-4 font-display text-[26px] font-bold text-white">
                {Number(nutrition.kg_materia_seca_dia).toFixed(1)}{' '}
                <span className="font-sans text-[13px] font-semibold text-stone-500">kg MS/día</span>
              </p>
              <p className="text-[11px] text-stone-500">
                {nutrition.cantidad_animales} {nutrition.cantidad_animales === 1 ? 'animal' : 'animales'} · calculado{' '}
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
                <div key={cat} className="flex items-center justify-between text-[11px] text-stone-400">
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
              <p className="mt-0.5 text-[11px] text-stone-500">Animales que están pastoreando en este potrero.</p>
            </div>
            <button
              type="button"
              onClick={() => setAddingCattle(true)}
              disabled={mutating}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-bold text-black hover:bg-emerald-400 disabled:opacity-50">
              <Plus size={13} /> Agregar ganado
            </button>
          </div>

          <p className="mt-4 text-[11px] text-stone-500">
            {herd.length} {herd.length === 1 ? 'animal asignado' : 'animales asignados'}
          </p>

          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              {herd.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-white/[.06]">
                  <table className="w-full min-w-[380px] text-left text-[11px]">
                    <thead className="border-b border-white/[.06] text-[10px] uppercase tracking-wider text-stone-500">
                      <tr>
                        <th className="px-3 py-2 font-bold">Caravana</th>
                        <th className="px-3 py-2 font-bold">Categoría</th>
                        <th className="px-3 py-2 text-right font-bold">Peso</th>
                        <th className="px-3 py-2 font-bold">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[.05] text-stone-300">
                      {herd.map((a) => (
                        <tr key={a.id}>
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
              <HerdCategoryDonut counts={herdByCategory} total={herd.length} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/[.06] bg-[#161619] p-5">
          <h2 className="font-display text-base text-white">Traslados recientes</h2>
          <p className="mt-0.5 text-[11px] text-stone-500">Entradas y salidas de ganado de este potrero.</p>

          {traslados.length === 0 ? (
            <p className="mt-4 text-[11px] text-stone-500">Todavía no hay traslados registrados para este potrero.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {traslados.slice(0, 6).map((t) => {
                const isEntrada = t.direccion === 'entrada';
                const counterpartId = isEntrada ? t.id_potrero_origen : t.id_potrero_destino;
                const counterpartName = paddockNameById.get(counterpartId) || 'potrero desconocido';
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
                        {isEntrada ? 'Desde' : 'Hacia'} <strong className="text-white">{counterpartName}</strong>
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
          <p className="mt-0.5 text-[11px] text-stone-500">Ubicación y forma real, tal como se ve en el mapa.</p>
          <div className="mt-3 h-48 overflow-hidden rounded-lg border border-white/[.06]">
            <PolygonMapCanvas
              mapRef={mapPreviewRef}
              isDrawing={false}
              vertices={[]}
              existingPolygons={[
                { id: paddock.id, coordinates: paddock.coordinates, color: status.statusColor, label: paddock.name },
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
                Todavía no hay datos climáticos para este potrero. Se generan junto con la disponibilidad de pasto —
                usá &quot;Calcular disponibilidad&quot; arriba.
              </p>
            </div>
          )}
        </section>
      </div>
      </div>
    </div>
  );
}
