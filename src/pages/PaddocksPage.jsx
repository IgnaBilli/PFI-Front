import { useState } from 'react';
import {
  LandPlot,
  AlertTriangle,
  Beef,
  CheckCircle2,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import usePaddocks from '../hooks/usePaddocks.js';
import useCattle from '../hooks/useCattle.js';
import usePaddockAnalytics, { buildPaddockStatus } from '../hooks/usePaddockAnalytics.js';
import { useAuth } from '../context/AuthContext.jsx';
import { withAnimalCounts } from '../services/mappers.js';
import { createCattleForPaddock } from '../services/cattleService.js';
import { polygonToViewBoxPoints } from '../utils/geo.js';
import AddCattleModal from '../components/AddCattleModal.jsx';
import PaddockUseControl from '../components/PaddockUseControl.jsx';

// Silueta real del potrero en SVG (sin depender de tiles de mapa): conserva
// la forma real de sus coordenadas, coloreada según el estado de pasto.
function PaddockShapeIcon({ paddock, color }) {
  const points = polygonToViewBoxPoints(paddock.coordinates);
  return (
    <div className="relative h-28 overflow-hidden bg-forest-950" aria-hidden="true">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, currentColor 0, currentColor 1px, transparent 1px, transparent 9px)',
          color,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-forest-800 via-transparent to-transparent" />
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
  const { estanciaId } = useAuth();
  const { paddocks, loading: paddocksLoading, error: paddocksError, reload: reloadPaddocks } = usePaddocks(estanciaId);
  const {
    cattle,
    loading: cattleLoading,
    error: cattleError,
    reload: reloadCattle,
  } = useCattle(estanciaId);
  const paddocksWithCounts = withAnimalCounts(paddocks, cattle);
  const paddockAnalytics = usePaddockAnalytics(paddocksWithCounts);
  const {
    dataById,
    loading: analyticsLoading,
    error: analyticsError = '',
  } = paddockAnalytics;

  const loading = paddocksLoading || cattleLoading;

  const [addingToPaddock, setAddingToPaddock] = useState(null);
  const [mutating, setMutating] = useState(false);
  const [actionError, setActionError] = useState('');
  const sourceError = paddocksError || cattleError;
  const sourceErrorMessage =
    typeof sourceError === 'string' ? sourceError : sourceError?.message || '';
  const analyticsErrorMessage =
    typeof analyticsError === 'string' ? analyticsError : analyticsError?.message || '';

  async function handleAddCattle({ animals }) {
    if (!addingToPaddock) throw new Error('Seleccioná un potrero antes de agregar ganado.');
    setMutating(true);
    setActionError('');
    let createdCount = 0;
    try {
      for (const payload of animals) {
        await createCattleForPaddock(addingToPaddock.id, payload);
        createdCount += 1;
      }
      await reloadCattle();
      setAddingToPaddock(null);
    } catch (err) {
      if (createdCount > 0) await reloadCattle().catch(() => {});
      const message = createdCount > 0
        ? `Se registraron ${createdCount} ${createdCount === 1 ? 'animal' : 'animales'}, pero el lote quedó incompleto. Revisá el rodeo antes de reintentar.`
        : err.message || 'No se pudo agregar el ganado.';
      setActionError(message);
      throw new Error(message, { cause: err });
    } finally {
      setMutating(false);
    }
  }

  return (
    <div className="app-page text-sm">
      <AddCattleModal
        isOpen={Boolean(addingToPaddock)}
        onClose={() => setAddingToPaddock(null)}
        onAdd={handleAddCattle}
        existingCaravanas={cattle.map((c) => c.caravana)}
        cattle={cattle}
        lockedPaddockId={addingToPaddock?.id}
        lockedPaddockLabel={addingToPaddock?.name}
      />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl font-bold text-white">Potreros</h1>
          <p className="mt-1 text-xs text-sand-500">
            El estado de cada potrero según la última medición de pasto por satélite.
          </p>
        </div>
        <Link
          to="/mapa"
          className="app-button-secondary self-start px-4 text-xs sm:self-auto">
          <LandPlot size={15} aria-hidden="true" /> Ver en el mapa
        </Link>
      </header>

      {(sourceErrorMessage || actionError) && (
        <div className="app-error mt-5" role="alert">
          <strong className="block text-sm">
            {actionError ? 'No se pudo agregar el ganado' : 'No se pudo cargar la lista completa'}
          </strong>
          <span className="mt-0.5 block text-xs">{actionError || sourceErrorMessage}</span>
        </div>
      )}
      {analyticsErrorMessage && (
        <div className="app-error mt-3 text-xs" role="status">
          {analyticsErrorMessage} Los potreros siguen disponibles, pero algunos estados pueden faltar.
        </div>
      )}

      {loading ? (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Cargando potreros">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="app-panel overflow-hidden">
              <div className="app-skeleton h-28" />
              <div className="space-y-3 p-5">
                <div className="app-skeleton h-4 w-2/3 rounded" />
                <div className="app-skeleton h-3 w-1/2 rounded" />
                <div className="app-skeleton mt-5 h-10 rounded-lg" />
              </div>
            </div>
          ))}
        </section>
      ) : sourceErrorMessage && paddocksWithCounts.length === 0 ? (
        <section className="app-panel app-empty mt-6" aria-label="Error al cargar potreros">
          <div>
            <AlertTriangle size={24} className="mx-auto text-danger-400" aria-hidden="true" />
            <p className="mt-3 text-sm text-sand-300">No pudimos mostrar los potreros en este momento.</p>
            <p className="mt-1 text-xs text-sand-500">Volvé a intentar cuando recuperes la conexión.</p>
          </div>
        </section>
      ) : paddocksWithCounts.length === 0 ? (
        <section className="app-panel app-empty mt-6">
          <div>
            <LandPlot size={26} className="mx-auto text-sand-500" aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold text-white">Creá tu primer potrero</h2>
            <p className="mt-1 text-xs text-sand-500">Dibujá sus límites en el mapa para empezar a registrar ganado y mediciones.</p>
            <Link to="/mapa" className="app-button-primary mt-5 px-4 text-xs">
              Abrir el mapa <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : (
        <section className="mt-6" aria-labelledby="paddocks-list-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="paddocks-list-heading" className="text-sm font-bold text-sand-100">
              {paddocksWithCounts.length} {paddocksWithCounts.length === 1 ? 'potrero' : 'potreros'}
            </h2>
            {analyticsLoading && <span className="text-xs text-sand-500">Actualizando estados...</span>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paddocksWithCounts.map((paddock) => {
              const details = buildPaddockStatus(dataById[paddock.id], paddock.hectares, paddock.animals);

              return (
                <article key={paddock.id} className="app-panel group overflow-hidden transition-colors hover:border-sand-100/25">
                  <Link to={`/potreros/${paddock.id}`} className="block">
                    <div className="relative">
                      <PaddockShapeIcon paddock={paddock} color={details.statusColor} />
                      <span
                        className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ color: details.statusColor, backgroundColor: details.statusBg }}>
                        {paddock.enabledForCattle === false ? 'Fuera de uso' : analyticsLoading ? 'Actualizando' : details.status}
                      </span>
                    </div>

                    <div className="p-5 pb-3">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold text-white">{paddock.name}</h3>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-sand-500">
                            <span className="flex items-center gap-1.5">
                              <LandPlot size={13} aria-hidden="true" /> {Number(paddock.hectares).toFixed(0)} ha
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Beef size={13} aria-hidden="true" /> {paddock.animals} cabezas
                            </span>
                          </p>
                        </div>
                        <ArrowRight size={17} className="mt-1 shrink-0 text-sand-500 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </div>

                      <div className={`mt-4 flex min-h-11 items-start gap-2 rounded-lg px-3 py-2.5 text-xs leading-relaxed ${details.alert ? 'bg-danger-400/10 text-danger-400' : details.recommendation ? 'bg-warning-400/10 text-warning-400' : 'bg-sand-100/[.04] text-sand-300'}`}>
                        {details.alert || details.recommendation ? (
                          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <CheckCircle2 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        )}
                        <span className="line-clamp-2">{details.alert || details.recommendation || details.ok || 'Sin mediciones disponibles'}</span>
                      </div>
                    </div>
                  </Link>

                  <div className="px-5 pb-5">
                    <button
                      type="button"
                      onClick={() => setAddingToPaddock(paddock)}
                      disabled={mutating || paddock.enabledForCattle === false}
                      className="app-button-secondary w-full text-xs disabled:opacity-50">
                      <Plus size={14} aria-hidden="true" /> Agregar ganado
                    </button>
                    <PaddockUseControl id={paddock.id} name={paddock.name} enabled={paddock.enabledForCattle} animals={paddock.animals} onChanged={reloadPaddocks}/>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
