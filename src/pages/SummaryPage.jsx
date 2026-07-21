import { Beef, LandPlot, AlertTriangle, Lightbulb, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import usePaddocks from '../hooks/usePaddocks.js';
import useCattle from '../hooks/useCattle.js';
import { areaHectares } from '../utils/geo.js';

// Mock state and data details matching the image precisely
const paddockDetails = {
  'La Aguada': {
    status: 'Escasa',
    statusColor: '#ef4444',
    statusBg: '#ef444415',
    grass: '780 kg MS/ha',
    load: '135%',
    loadColor: '#ef4444',
    alert: 'Sobrecargado: la demanda supera el pasto disponible.',
  },
  'Las Lomas': {
    status: 'Buena',
    statusColor: '#22c55e',
    statusBg: '#22c55e15',
    grass: '2.240 kg MS/ha',
    load: '50%',
    loadColor: '#22c55e',
    recommendation: 'Tiene una recomendación disponible',
  },
  'El Monte': {
    status: 'Regular',
    statusColor: '#eab308',
    statusBg: '#eab30815',
    grass: '1.420 kg MS/ha',
    load: '83%',
    loadColor: '#eab308',
    ok: 'Todo en orden',
  },
  'Cañada Honda': {
    status: 'Regular',
    statusColor: '#eab308',
    statusBg: '#eab30815',
    grass: '1.580 kg MS/ha',
    load: '79%',
    loadColor: '#eab308',
    ok: 'Todo en orden',
  },
  'El Tala': {
    status: 'Buena',
    statusColor: '#22c55e',
    statusBg: '#22c55e15',
    grass: '2.050 kg MS/ha',
    load: '44%',
    loadColor: '#22c55e',
    ok: 'Todo en orden',
  },
};

export default function SummaryPage() {
  const { paddocks } = usePaddocks();
  const { cattle } = useCattle();

  return (
    <div className="min-h-full px-4 pb-8 pt-16 sm:px-7 md:pt-7 lg:px-10 text-sm">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-white">Estancia Casualidad</h1>
          <p className="mt-0.5 text-[11px] text-stone-500">
            Gral. Villegas, Buenos Aires · 1.840 ha · {paddocks.length} potreros
          </p>
        </div>
        <Link
          to="/mapa"
          className="flex items-center gap-1.5 rounded-lg border border-white/[.08] bg-[#161619] px-3.5 py-2 text-[11px] font-semibold text-stone-300 hover:bg-white/[.04]">
          <LandPlot size={13} className="text-stone-400" /> Ver mapa general
        </Link>
      </header>

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
            <strong className="block text-base font-bold text-white">{paddocks.length}</strong>
            <span className="block text-[10px] text-stone-500">Potreros activos</span>
          </div>
        </article>

        <article className="rounded-xl border border-white/[.05] bg-[#161619] p-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-[#d32f2f]/10 text-[#f44336]">
            <AlertTriangle size={18} />
          </span>
          <div>
            <strong className="block text-base font-bold text-white">0</strong>
            <span className="block text-[10px] text-stone-500">Potreros con alerta</span>
          </div>
        </article>

        <article className="rounded-xl border border-white/[.05] bg-[#161619] p-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-white/[.05] text-stone-300">
            <Lightbulb size={18} />
          </span>
          <div>
            <strong className="block text-base font-bold text-white">0</strong>
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

        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paddocks.map((paddock) => {
            const details = paddockDetails[paddock.name] || {
              status: 'Regular',
              statusColor: '#eab308',
              statusBg: '#eab30815',
              grass: '1.200 kg MS/ha',
              load: paddock.coordinates
                ? `${Math.round(((Number(paddock.animals) || 0) / (areaHectares(paddock.coordinates) || 1)) * 50)}%`
                : '50%',
              loadColor: '#eab308',
              ok: 'Todo en orden',
            };
            const hectares = areaHectares(paddock.coordinates);

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
                      <p className="mt-0.5 text-stone-500 font-medium">{hectares.toFixed(0)} ha</p>
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 font-semibold text-[10px]"
                      style={{ color: details.statusColor, backgroundColor: details.statusBg }}>
                      {details.status}
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
                          style={{ width: details.load, backgroundColor: details.statusColor }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1.5">
                      <span className="flex items-center gap-1">
                        <LandPlot size={13} className="text-stone-500" />
                        <strong>{Number(paddock.animals) || 0}</strong> cabezas
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
      </section>

      <footer className="mt-10 text-center text-[10px] text-stone-600">
        Última lectura satelital (Sentinel-2): 14 de junio de 2025 · Próxima estimada en 3 días
      </footer>
    </div>
  );
}
