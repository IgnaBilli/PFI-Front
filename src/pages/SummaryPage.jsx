import {
  ArrowLeftRight,
  Beef,
  LandPlot,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  LoaderCircle,
  Sprout,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import usePaddocks from '../hooks/usePaddocks.js';
import useCattle from '../hooks/useCattle.js';
import usePaddockAnalytics, { buildPaddockStatus } from '../hooks/usePaddockAnalytics.js';
import useEstanciaAnaliticas from '../hooks/useEstanciaAnaliticas.js';
import { useAuth } from '../context/AuthContext.jsx';
import { CATEGORY_API_TO_UI, CATEGORY_COLORS, FALLBACK_CATEGORY_COLOR, withAnimalCounts } from '../services/mappers.js';
import { formatShortDate } from '../utils/format.js';
import DonutChart from '../components/DonutChart.jsx';
import TrendLineChart from '../components/TrendLineChart.jsx';

const FORAGE_COLOR = '#199e70';

// Lista de barras horizontales: una por potrero, magnitud = % de forraje de
// la estancia que aporta (secuencial, un solo hue, sin ranking por color).
function ForageDistributionList({ rows }) {
  if (rows.length === 0) {
    return (
      <p className="mt-4 text-[11px] text-stone-500">
        Todavía no hay mediciones de disponibilidad forrajera en ningún potrero.
      </p>
    );
  }
  const sorted = [...rows].sort((a, b) => Number(b.porcentaje) - Number(a.porcentaje));
  return (
    <div className="mt-4 space-y-3">
      {sorted.map((row) => (
        <div key={row.id_potrero}>
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate font-semibold text-stone-300">{row.nombre}</span>
            <span className="shrink-0 text-stone-500">
              {Number(row.porcentaje).toFixed(0)}% · {Number(row.kg_materia_seca_total).toFixed(0)} kg MS
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[.04]">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, Number(row.porcentaje))}%`, backgroundColor: FORAGE_COLOR }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SummaryPage() {
  const { estanciaId, estancia } = useAuth();
  const { paddocks, loading: paddocksLoading, error: paddocksError } = usePaddocks(estanciaId);
  const { cattle, loading: cattleLoading, error: cattleError } = useCattle(estanciaId);
  const paddocksWithCounts = withAnimalCounts(paddocks, cattle);
  const { dataById, loading: analyticsLoading } = usePaddockAnalytics(paddocksWithCounts);
  const { analiticas, traslados: trasladoAnaliticas, loading: estanciaAnaliticasLoading } = useEstanciaAnaliticas(estanciaId);

  const loading = paddocksLoading || cattleLoading;

  const activePaddocks = paddocksWithCounts.filter((p) => p.active);
  const alerts = paddocksWithCounts.filter(
    (p) => (dataById[p.id]?.recommendation?.prioridad ?? dataById[p.id]?.recommendation?.tipo) === 'REDUCIR_CARGA'
  ).length;
  const recommendationsCount = paddocksWithCounts.filter((p) => dataById[p.id]?.recommendation).length;

  const cargaAnimalSegments = (analiticas?.distribucionCargaAnimal ?? []).map((row) => {
    const label = CATEGORY_API_TO_UI[row.categoria] ?? row.categoria;
    return {
      key: row.categoria,
      label,
      value: row.cantidad_animales,
      color: CATEGORY_COLORS[label] || FALLBACK_CATEGORY_COLOR,
    };
  });

  const forageGrowthPoints = (analiticas?.crecimientoForraje7dias ?? [])
    .map((d) => ({ t: new Date(d.fecha).getTime(), value: Number(d.kg_materia_seca_ha_promedio) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.value))
    .sort((a, b) => a.t - b.t);

  const rutasFrecuentes = trasladoAnaliticas?.rutasMasFrecuentes ?? [];

  return (
    <div className="min-h-full px-4 pb-8 pt-16 sm:px-7 md:pt-7 lg:px-10 text-sm">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-white">{estancia?.nombre || 'Mi estancia'}</h1>
          <p className="mt-0.5 text-[11px] text-stone-500">{paddocksWithCounts.length} Potreros</p>
        </div>
        <Link
          to="/mapa"
          className="flex items-center gap-1.5 rounded-lg border border-white/[.08] bg-[#161619] px-3.5 py-2 text-[11px] font-semibold text-stone-300 hover:bg-white/[.04]">
          <LandPlot size={13} className="text-stone-400" /> Ver mapa general
        </Link>
      </header>

      {(paddocksError || cattleError) && (
        <p className="mt-4 rounded-lg bg-red-500/10 px-3.5 py-2.5 text-[11px] font-semibold text-red-400">
          {paddocksError || cattleError}
        </p>
      )}

      {/* Indicadores principales */}
      <section className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-white/[.05] bg-[#161619] p-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-[#222227] text-white">
            <Beef size={18} />
          </span>
          <div>
            <strong className="block text-base font-bold text-white">{cattle.length}</strong>
            <span className="block text-[10px] text-stone-500">Cabezas en el campo</span>
          </div>
        </article>

        <article className="rounded-xl border border-white/[.05] bg-[#161619] p-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-[#222227] text-white">
            <LandPlot size={18} />
          </span>
          <div>
            <strong className="block text-base font-bold text-white">{activePaddocks.length}</strong>
            <span className="block text-[10px] text-stone-500">Potreros activos</span>
          </div>
        </article>

        <article className="rounded-xl border border-white/[.05] bg-[#161619] p-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-[#d32f2f]/10 text-[#f44336]">
            <AlertTriangle size={18} />
          </span>
          <div>
            <strong className="block text-base font-bold text-white">{alerts}</strong>
            <span className="block text-[10px] text-stone-500">Potreros con alerta</span>
          </div>
        </article>

        <article className="rounded-xl border border-white/[.05] bg-[#161619] p-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-white/[.05] text-stone-300">
            <Lightbulb size={18} />
          </span>
          <div>
            <strong className="block text-base font-bold text-white">{recommendationsCount}</strong>
            <span className="block text-[10px] text-stone-500">Recomendaciones</span>
          </div>
        </article>
      </section>

      {/* Estado de los potreros */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-bold text-white">Estado de los potreros</h2>
          <Link
            to="/potreros"
            className="text-[10px] font-semibold text-stone-500 hover:text-white">
            Ver todos
          </Link>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-stone-500">
            <LoaderCircle size={16} className="animate-spin" /> Cargando potreros...
          </div>
        ) : paddocksWithCounts.length === 0 ? (
          <p className="mt-6 text-center text-[12px] text-stone-500">
            Todavía no hay potreros creados.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paddocksWithCounts.map((paddock) => {
              const details = buildPaddockStatus(dataById[paddock.id], paddock.hectares);

              return (
                <article
                  key={paddock.id}
                  className="rounded-xl border border-white/[.05] bg-[#161619] p-5 text-[11px] text-stone-400 flex flex-col justify-between min-h-[170px]">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-[13px] font-bold text-white leading-tight">
                          {paddock.name}
                        </h3>
                        <p className="mt-0.5 text-stone-500 font-medium">{paddock.hectares.toFixed(0)} ha</p>
                      </div>
                      <span
                        className="rounded-full px-2 py-0.5 font-semibold text-[10px]"
                        style={{ color: details.statusColor, backgroundColor: details.statusBg }}>
                        {analyticsLoading ? '...' : details.status}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      <div>
                        <div className="flex justify-between">
                          <span>Pasto disponible</span>
                          <strong style={{ color: details.statusColor }}>{details.grass}</strong>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/[.04] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: details.loadBarWidth, backgroundColor: details.statusColor }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1.5">
                        <span className="flex items-center gap-1">
                          <LandPlot size={13} className="text-stone-500" />
                          <strong>{paddock.animals}</strong> cabezas
                        </span>
                        <span>
                          Carga <strong style={{ color: details.loadColor }}>{details.load}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    {details.alert && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-red-500/10 p-2 text-red-400 text-[10px] font-medium leading-normal">
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>{details.alert}</span>
                      </div>
                    )}
                    {details.recommendation && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 p-2 text-amber-400 text-[10px] font-medium leading-normal">
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>{details.recommendation}</span>
                      </div>
                    )}
                    {details.ok && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-white/[.03] p-2 text-stone-300 text-[10px] font-medium leading-normal">
                        <CheckCircle2 size={13} className="shrink-0 text-stone-550" />
                        <span>{details.ok}</span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Analítica de la estancia */}
      <section className="mt-6">
        <h2 className="text-[13px] font-bold text-white">Analítica de la estancia</h2>
        <p className="mt-0.5 text-[11px] text-stone-500">
          Agregado de todos los potreros: carga animal, forraje y movimientos de ganado.
        </p>

        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-white/[.06] bg-[#161619] p-5">
            <div className="flex items-center gap-2">
              <Beef size={15} className="text-stone-400" />
              <h3 className="text-[12px] font-bold text-stone-200">Carga animal por categoría</h3>
            </div>
            {estanciaAnaliticasLoading ? (
              <div className="mt-6 flex items-center justify-center gap-2 py-8 text-[11px] text-stone-500">
                <LoaderCircle size={14} className="animate-spin" /> Cargando...
              </div>
            ) : (
              <DonutChart
                segments={cargaAnimalSegments}
                emptyMessage="Todavía no hay ganado registrado."
                ariaLabel="Distribución de carga animal por categoría"
              />
            )}
          </article>

          <article className="rounded-xl border border-white/[.06] bg-[#161619] p-5">
            <div className="flex items-center gap-2">
              <Sprout size={15} className="text-stone-400" />
              <h3 className="text-[12px] font-bold text-stone-200">Forraje por potrero</h3>
            </div>
            {estanciaAnaliticasLoading ? (
              <div className="mt-6 flex items-center justify-center gap-2 py-8 text-[11px] text-stone-500">
                <LoaderCircle size={14} className="animate-spin" /> Cargando...
              </div>
            ) : (
              <ForageDistributionList rows={analiticas?.distribucionForraje ?? []} />
            )}
          </article>

          <article className="rounded-xl border border-white/[.06] bg-[#161619] p-5 lg:col-span-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-stone-400" />
              <h3 className="text-[12px] font-bold text-stone-200">Crecimiento de forraje (últimos 7 días)</h3>
            </div>
            <p className="mt-0.5 text-[11px] text-stone-500">
              Promedio diario de kg MS/ha entre los potreros con medición ese día.
            </p>
            {estanciaAnaliticasLoading ? (
              <div className="mt-6 flex items-center justify-center gap-2 py-8 text-[11px] text-stone-500">
                <LoaderCircle size={14} className="animate-spin" /> Cargando...
              </div>
            ) : (
              <TrendLineChart
                points={forageGrowthPoints}
                color={FORAGE_COLOR}
                formatX={formatShortDate}
                formatTooltip={(p) => `${formatShortDate(p.t)} · ${p.value.toFixed(0)} kg MS/ha`}
                emptyMessage="Todavía no hay suficientes mediciones para graficar la evolución."
              />
            )}
          </article>

          <article className="rounded-xl border border-white/[.06] bg-[#161619] p-5 lg:col-span-2">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={15} className="text-stone-400" />
              <h3 className="text-[12px] font-bold text-stone-200">Traslados de ganado</h3>
            </div>

            {estanciaAnaliticasLoading ? (
              <div className="mt-6 flex items-center justify-center gap-2 py-8 text-[11px] text-stone-500">
                <LoaderCircle size={14} className="animate-spin" /> Cargando...
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:w-72">
                  <div className="rounded-lg border border-white/[.06] bg-white/[.02] p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Traslados</p>
                    <p className="mt-1 text-[17px] font-bold text-white">
                      {trasladoAnaliticas?.totalTraslados ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/[.06] bg-white/[.02] p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Animales movidos</p>
                    <p className="mt-1 text-[17px] font-bold text-white">
                      {trasladoAnaliticas?.totalAnimalesMovidos ?? 0}
                    </p>
                  </div>
                </div>

                <h4 className="mt-5 text-[11px] font-bold text-stone-300">Rutas más frecuentes</h4>
                {rutasFrecuentes.length === 0 ? (
                  <p className="mt-2 text-[11px] text-stone-500">Todavía no hay traslados registrados.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {rutasFrecuentes.map((ruta, index) => (
                      <div
                        key={`${ruta.id_potrero_origen}-${ruta.id_potrero_destino}-${index}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-white/[.06] bg-white/[.02] px-3.5 py-2.5 text-[11px]">
                        <span className="flex min-w-0 items-center gap-1.5 text-stone-300">
                          <span className="truncate font-semibold text-white">{ruta.potrero_origen_nombre}</span>
                          <ArrowLeftRight size={11} className="shrink-0 text-stone-500" />
                          <span className="truncate font-semibold text-white">{ruta.potrero_destino_nombre}</span>
                        </span>
                        <span className="shrink-0 text-stone-500">
                          {ruta.cantidad_animales} {ruta.cantidad_animales === 1 ? 'animal' : 'animales'}
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
