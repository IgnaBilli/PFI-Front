import { LandPlot, AlertTriangle, CheckCircle2 } from 'lucide-react';
import usePaddocks from '../hooks/usePaddocks.js';
import { areaHectares } from '../utils/geo.js';
import { Link } from 'react-router-dom';

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

export default function PaddocksPage() {
  const { paddocks } = usePaddocks();

  return (
    <div className="min-h-full px-4 pb-8 pt-16 sm:px-7 md:pt-7 lg:px-10 text-sm">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-white">Potreros</h1>
          <p className="mt-0.5 text-[11px] text-stone-500">
            El estado de cada potrero según la última medición de pasto por satélite.
          </p>
        </div>
        <Link
          to="/mapa"
          className="flex items-center gap-1.5 rounded-lg border border-white/[.08] bg-[#161619] px-3.5 py-2 text-[11px] font-semibold text-stone-300 hover:bg-white/[.04]">
          <LandPlot size={13} className="text-stone-400" /> Ver en el mapa
        </Link>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              className="rounded-xl border border-white/[.05] bg-[#161619] p-5 text-[11px] text-stone-400 flex flex-col justify-between min-h-[180px]">
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
                    <CheckCircle2 size={13} className="shrink-0 text-stone-500" />
                    <span>{details.ok}</span>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
