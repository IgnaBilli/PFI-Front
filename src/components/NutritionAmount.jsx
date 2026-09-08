import { formatShortDate } from '../utils/format.js';

export default function NutritionAmount({ estimate, animalCount }) {
  const empty = animalCount === 0;
  const demand = empty ? 0 : Number(estimate?.kg_materia_seca_dia);
  const changed = !empty && Number(estimate?.cantidad_animales) !== animalCount;

  return (
    <>
      <p className="font-display text-3xl font-extrabold tabular-nums text-sand-100">
        {Number.isFinite(demand) ? demand.toLocaleString('es-AR', { maximumFractionDigits: 1 }) : '-'}
        <span className="ml-2 text-sm font-bold text-sand-500">kg MS/día</span>
      </p>
      {empty ? (
        <p className="mt-2 text-xs text-sand-500">Sin ganado asignado. La demanda actual es cero.</p>
      ) : (
        <>
          <p className="mt-2 text-xs text-sand-500">
            Último cálculo: {estimate.cantidad_animales} {Number(estimate.cantidad_animales) === 1 ? 'animal' : 'animales'} · {estimate.fecha_calculo ? formatShortDate(estimate.fecha_calculo) : 'sin fecha informada'}
          </p>
          {changed && <p role="status" className="mt-3 text-xs leading-relaxed text-warning-400">
            El potrero ahora tiene {animalCount} {animalCount === 1 ? 'animal' : 'animales'}. Recalculá la demanda y actualizá Stock.
          </p>}
          <p className="mt-2 text-xs text-sand-500">Recalculá después de cambiar animales, pesos o categorías.</p>
        </>
      )}
    </>
  );
}
