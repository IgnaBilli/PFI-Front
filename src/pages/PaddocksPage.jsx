import { useState } from 'react';
import {
  LandPlot,
  AlertTriangle,
  Beef,
  CheckCircle2,
  LoaderCircle,
  Plus,
  Sprout,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import usePaddocks from '../hooks/usePaddocks.js';
import useCattle from '../hooks/useCattle.js';
import usePaddockAnalytics, { buildPaddockStatus } from '../hooks/usePaddockAnalytics.js';
import { useAuth } from '../context/AuthContext.jsx';
import { withAnimalCounts } from '../services/mappers.js';
import { createCattleForPaddock } from '../services/cattleService.js';
import { polygonToViewBoxPoints } from '../utils/geo.js';
import AddCattleModal from '../components/AddCattleModal.jsx';

// Silueta real del potrero en SVG (sin depender de tiles de mapa): conserva
// la forma real de sus coordenadas, coloreada según el estado de pasto.
function PaddockShapeIcon({ paddock, color }) {
  const points = polygonToViewBoxPoints(paddock.coordinates);
  return (
    <div className="relative h-24 overflow-hidden" style={{ backgroundColor: '#0e140f' }}>
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, currentColor 0, currentColor 1px, transparent 1px, transparent 9px)',
          color,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#161619] via-transparent to-transparent" />
      {points && (
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet">
          <polygon
            points={points}
            fill={`${color}33`}
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

export default function PaddocksPage() {
  const navigate = useNavigate();
  const { estanciaId } = useAuth();
  const { paddocks, loading: paddocksLoading, error: paddocksError } = usePaddocks(estanciaId);
  const { cattle, loading: cattleLoading, reload: reloadCattle } = useCattle(estanciaId);
  const paddocksWithCounts = withAnimalCounts(paddocks, cattle);
  const { dataById, loading: analyticsLoading } = usePaddockAnalytics(paddocksWithCounts);

  const loading = paddocksLoading || cattleLoading;

  const [addingToPaddock, setAddingToPaddock] = useState(null);
  const [mutating, setMutating] = useState(false);
  const [actionError, setActionError] = useState('');

  async function handleAddCattle({ animals }) {
    if (!addingToPaddock) return;
    setMutating(true);
    setActionError('');
    try {
      for (const payload of animals) {
        await createCattleForPaddock(addingToPaddock.id, payload);
      }
      await reloadCattle();
      setAddingToPaddock(null);
    } catch (err) {
      setActionError(err.message || 'No se pudo agregar el ganado.');
    } finally {
      setMutating(false);
    }
  }

  return (
    <div className="min-h-full px-4 pb-8 pt-16 sm:px-7 md:pt-7 lg:px-10 text-sm">
      <AddCattleModal
        isOpen={Boolean(addingToPaddock)}
        onClose={() => setAddingToPaddock(null)}
        onAdd={handleAddCattle}
        existingCaravanas={cattle.map((c) => c.caravana)}
        cattle={cattle}
        lockedPaddockId={addingToPaddock?.id}
        lockedPaddockLabel={addingToPaddock?.name}
      />

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

      {(paddocksError || actionError) && (
        <p className="mt-4 rounded-lg bg-red-500/10 px-3.5 py-2.5 text-[11px] font-semibold text-red-400">
          {paddocksError || actionError}
        </p>
      )}

      {loading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-[12px] text-stone-500">
          <LoaderCircle size={16} className="animate-spin" /> Cargando potreros...
        </div>
      ) : paddocksWithCounts.length === 0 ? (
        <p className="mt-10 text-center text-[12px] text-stone-500">
          Todavía no creaste ningún potrero. Andá al mapa para dibujar el primero.
        </p>
      ) : (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paddocksWithCounts.map((paddock) => {
            const details = buildPaddockStatus(dataById[paddock.id], paddock.hectares);

            return (
              <article
                key={paddock.id}
                onClick={() => navigate(`/potreros/${paddock.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/potreros/${paddock.id}`);
                }}
                className="group cursor-pointer overflow-hidden rounded-xl border border-white/[.05] bg-[#161619] text-[11px] text-stone-400 flex flex-col justify-between hover:border-white/[.15] transition-colors">
                <div>
                  <div className="relative">
                    <PaddockShapeIcon paddock={paddock} color={details.statusColor} />
                    <span
                      className="absolute right-2 top-2 rounded-full px-2 py-0.5 font-semibold text-[10px] shadow"
                      style={{ color: details.statusColor, backgroundColor: details.statusBg }}>
                      {analyticsLoading ? '...' : details.status}
                    </span>
                  </div>

                  <div className="px-5 pt-3.5">
                    <h3 className="text-[13px] font-bold text-white leading-tight">
                      {paddock.name}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1 text-stone-500 font-medium">
                      <LandPlot size={11} /> {paddock.hectares.toFixed(0)} ha
                    </p>

                    <div className="mt-4 space-y-2.5">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Sprout size={13} className="text-stone-500" /> Pasto disponible
                          </span>
                          <strong style={{ color: details.statusColor }}>{details.grass}</strong>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/[.04] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: details.loadBarWidth,
                              backgroundColor: details.statusColor,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1.5">
                        <span className="flex items-center gap-1.5">
                          <Beef size={13} className="text-stone-500" />
                          <strong className="text-stone-200">{paddock.animals}</strong> cabezas
                        </span>
                        <span>
                          Carga <strong style={{ color: details.loadColor }}>{details.load}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-4">
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingToPaddock(paddock);
                    }}
                    disabled={mutating}
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50">
                    <Plus size={12} /> Agregar ganado
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
