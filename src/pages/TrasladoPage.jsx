import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Beef, LandPlot, LoaderCircle, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import usePaddocks from '../hooks/usePaddocks.js';
import useCattle from '../hooks/useCattle.js';
import usePaddockAnalytics, { buildPaddockStatus } from '../hooks/usePaddockAnalytics.js';
import { withAnimalCounts } from '../services/mappers.js';
import { assignCattle, relocateCattle } from '../services/cattleService.js';
import { ApiError } from '../services/api.js';
import PaddockThumbnail from '../components/PaddockThumbnail.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

export default function TrasladoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { estanciaId } = useAuth();
  const { paddocks, loading: paddocksLoading } = usePaddocks(estanciaId);
  const { cattle, loading: cattleLoading, reload: reloadCattle } = useCattle(estanciaId);
  const paddocksWithCounts = withAnimalCounts(paddocks, cattle);
  const { dataById, loading: analyticsLoading } = usePaddockAnalytics(paddocksWithCounts);

  const animalIds = location.state?.animalIds ?? [];
  const selectedAnimals = cattle.filter((a) => animalIds.includes(a.id));

  const [selectedPaddockId, setSelectedPaddockId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loading = paddocksLoading || cattleLoading;
  const candidate = paddocksWithCounts.find((p) => p.id === selectedPaddockId) ?? null;

  async function handleConfirm() {
    if (!candidate) return;
    setSubmitting(true);
    setError('');
    try {
      const groups = new Map();
      for (const animal of selectedAnimals) {
        const key = animal.paddockId ?? 'new';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(animal.id);
      }

      let movedAny = false;
      for (const [origin, ids] of groups.entries()) {
        if (origin === candidate.id) continue;
        movedAny = true;
        if (origin === 'new') {
          await assignCattle({ id_potrero: candidate.id, id_ganado: ids });
        } else {
          await relocateCattle(origin, {
            id_potrero_destino: candidate.id,
            id_ganado: ids,
            fecha_movimiento: new Date().toISOString(),
          });
        }
      }

      if (!movedAny) {
        setError('Todos los animales seleccionados ya están en ese potrero.');
        setConfirmOpen(false);
        return;
      }

      await reloadCattle();
      setConfirmOpen(false);
      navigate(`/potreros/${candidate.id}`, {
        state: {
          toast: {
            title: 'Traslado realizado',
            message: `${selectedAnimals.length} ${
              selectedAnimals.length === 1 ? 'animal fue trasladado' : 'animales fueron trasladados'
            } a ${candidate.name}.`,
          },
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError(
          'No se pudo completar el traslado: algún animal no existe o no tiene asignación activa en su potrero de origen.'
        );
      } else {
        setError(err.message || 'No se pudo completar el traslado.');
      }
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (animalIds.length === 0) {
    return (
      <div className="px-4 pb-8 pt-16 sm:px-7 md:pt-7 lg:px-10 text-sm">
        <Link
          to="/ganado"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-white">
          <ArrowLeft size={13} /> Todo el ganado
        </Link>
        <p className="mt-6 text-center text-[12px] text-stone-500">
          No hay animales seleccionados para trasladar. Volvé a &quot;Todo el ganado&quot; y seleccioná al menos uno.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 pb-10 pt-16 sm:px-7 md:pt-7 lg:px-10 text-sm">
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Confirmar traslado"
        message={
          candidate
            ? `¿Seguro que querés realizar este cambio? Se ${
                selectedAnimals.length === 1 ? 'moverá 1 animal' : `moverán ${selectedAnimals.length} animales`
              } al potrero "${candidate.name}".`
            : '¿Seguro que querés realizar este cambio?'
        }
        confirmLabel="Confirmar"
        loading={submitting}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />

      <Link
        to="/ganado"
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-white">
        <ArrowLeft size={13} /> Todo el ganado
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-white">Traslado</h1>
          <p className="mt-0.5 text-[11px] text-stone-500">
            Elegí el potrero de destino. {selectedAnimals.length}{' '}
            {selectedAnimals.length === 1 ? 'animal seleccionado' : 'animales seleccionados'}.
          </p>
        </div>
        {candidate && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={submitting}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-[12px] font-bold text-black hover:bg-emerald-400 disabled:opacity-50">
            Confirmar traslado a {candidate.name}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3.5 py-2.5 text-[11px] font-semibold text-red-400">
          <AlertTriangle size={13} className="shrink-0" /> {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {selectedAnimals.map((a) => (
          <span
            key={a.id}
            className="flex items-center gap-1 rounded-full bg-white/[.05] px-2.5 py-1 text-[10px] font-semibold text-stone-300">
            <Beef size={11} className="text-stone-500" /> {a.caravana}
            <span className="text-stone-600">· {a.paddock}</span>
          </span>
        ))}
      </div>

      {loading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-[12px] text-stone-500">
          <LoaderCircle size={16} className="animate-spin" /> Cargando potreros...
        </div>
      ) : paddocksWithCounts.length === 0 ? (
        <p className="mt-10 text-center text-[12px] text-stone-500">Todavía no creaste ningún potrero.</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paddocksWithCounts.map((paddock) => {
            const isSelected = paddock.id === selectedPaddockId;
            const status = buildPaddockStatus(dataById[paddock.id]);
            const isOrigin = selectedAnimals.some((a) => a.paddockId === paddock.id);

            return (
              <article
                key={paddock.id}
                onClick={() => setSelectedPaddockId(paddock.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSelectedPaddockId(paddock.id);
                }}
                className={`cursor-pointer overflow-hidden rounded-xl border bg-[#161619] transition-colors ${
                  isSelected ? 'border-[#3987e5]' : 'border-white/[.06] hover:border-white/[.15]'
                } ${isSelected ? 'sm:col-span-2' : ''}`}>
                <div className={`relative ${isSelected ? 'h-64' : 'h-36'}`}>
                  <PaddockThumbnail paddock={paddock} padding={isSelected ? 0.0045 : 0.0008} />
                  {isSelected && (
                    <span className="absolute left-3 top-3 z-[500] flex items-center gap-1 rounded-full bg-[#3987e5] px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
                      <Star size={11} fill="currentColor" /> Seleccionado
                    </span>
                  )}
                  {isOrigin && (
                    <span className="absolute right-3 top-3 z-[500] rounded-full bg-[#0b0b0c]/90 px-2.5 py-1 text-[10px] font-semibold text-stone-300 shadow-lg">
                      Origen actual
                    </span>
                  )}
                </div>

                <div className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="truncate text-[13px] text-white">{paddock.name}</strong>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ color: status.statusColor, backgroundColor: status.statusBg }}>
                      {analyticsLoading ? '...' : status.status}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-[11px] text-stone-500">
                    <span className="flex items-center gap-1">
                      <LandPlot size={12} /> {paddock.hectares.toFixed(1)} ha
                    </span>
                    <span className="flex items-center gap-1">
                      <Beef size={12} /> {paddock.animals} cab.
                    </span>
                  </div>

                  {isSelected && (
                    <div className="mt-3.5 grid grid-cols-2 gap-2.5 border-t border-white/[.06] pt-3.5 text-[11px]">
                      <div>
                        <p className="text-stone-500">Superficie</p>
                        <strong className="text-white">{paddock.hectares.toFixed(1)} ha</strong>
                      </div>
                      <div>
                        <p className="text-stone-500">Cabezas actuales</p>
                        <strong className="text-white">{paddock.animals}</strong>
                      </div>
                      <div>
                        <p className="text-stone-500">Pasto disponible</p>
                        <strong style={{ color: status.statusColor }}>{status.grass}</strong>
                      </div>
                      <div>
                        <p className="text-stone-500">Observaciones</p>
                        <strong className="text-white">{paddock.description || 'Sin datos'}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
