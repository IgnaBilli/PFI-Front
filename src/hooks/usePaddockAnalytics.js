import { useEffect, useState } from 'react';
import {
  fetchActiveRecommendation,
  fetchLatestForage,
  fetchLatestNutrition,
} from '../services/analyticsService.js';

export default function usePaddockAnalytics(paddocks) {
  const [dataById, setDataById] = useState({});
  const [loading, setLoading] = useState(false);
  const ids = paddocks.map((p) => p.id).join(',');

  useEffect(() => {
    if (!paddocks.length) {
      setDataById({});
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      paddocks.map(async (paddock) => {
        const [forage, nutrition, recommendation] = await Promise.all([
          fetchLatestForage(paddock.id),
          fetchLatestNutrition(paddock.id),
          fetchActiveRecommendation(paddock.id),
        ]);
        return [paddock.id, { forage, nutrition, recommendation }];
      })
    )
      .then((entries) => {
        if (!cancelled) setDataById(Object.fromEntries(entries));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  return { dataById, loading };
}

const STATUS_STYLES = {
  alert: { status: 'Escasa', statusColor: '#ef4444', statusBg: '#ef444415', loadColor: '#ef4444' },
  info: { status: 'Regular', statusColor: '#eab308', statusBg: '#eab30815', loadColor: '#eab308' },
  ok: { status: 'Buena', statusColor: '#22c55e', statusBg: '#22c55e15', loadColor: '#22c55e' },
  empty: {
    status: 'Sin datos',
    statusColor: '#71717a',
    statusBg: '#71717a15',
    loadColor: '#71717a',
  },
};

// Carga animal = consumo diario predicho (por animal * cantidad de animales)
// sobre la oferta total de forraje del potrero (kg MS/ha * hectáreas). Se
// devuelve null ante cualquier dato faltante, negativo o una división por
// cero (0/0 o n/0 son indeterminaciones, no "0% de carga").
function computeLoadPercent(nutrition, forage, hectares) {
  const consumoPorAnimal = Number(nutrition?.kg_materia_seca_dia);
  const cantidadAnimales = Number(nutrition?.cantidad_animales);
  const forrajePorHa = Number(forage?.kg_materia_seca_ha);
  const ha = Number(hectares);

  const valuesArePresent =
    Number.isFinite(consumoPorAnimal) &&
    Number.isFinite(cantidadAnimales) &&
    Number.isFinite(forrajePorHa) &&
    Number.isFinite(ha);
  if (!valuesArePresent) return null;

  // Ningún factor puede ser negativo (kg, cantidad de animales y hectáreas
  // son magnitudes no negativas); un valor negativo indica un dato inválido.
  if (consumoPorAnimal < 0 || cantidadAnimales < 0 || forrajePorHa < 0 || ha < 0) return null;

  const consumoTotal = consumoPorAnimal * cantidadAnimales;
  const forrajeTotal = forrajePorHa * ha;

  if (forrajeTotal === 0) return null; // 0/0 o n/0: indeterminado

  const ratio = consumoTotal / forrajeTotal;
  return Number.isFinite(ratio) ? ratio * 100 : null;
}

export function buildPaddockStatus(entry, hectares) {
  const forage = entry?.forage ?? null;
  const nutrition = entry?.nutrition ?? null;
  const recommendation = entry?.recommendation ?? null;
  const priority = recommendation?.prioridad ?? recommendation?.tipo ?? null;
  const grassValue = forage?.kg_materia_seca_ha;
  const grass =
    grassValue !== undefined && grassValue !== null ? `${grassValue} kg MS/ha/dia` : 'Sin datos';

  const loadPercent = computeLoadPercent(nutrition, forage, hectares);
  const load = loadPercent !== null ? `${Math.round(loadPercent)}%` : 'Sin datos';
  // Ancho seguro para barras de progreso: acotado a [0, 100] aunque el
  // potrero esté sobrecargado (el número real, sin recortar, va en `load`).
  const loadBarWidth = `${loadPercent !== null ? Math.min(Math.max(loadPercent, 0), 100) : 0}%`;

  const recommendationText = recommendation
    ? recommendation.descripcion || recommendation.fundamento || null
    : null;

  let variant = 'empty';
  if (priority === 'REDUCIR_CARGA') variant = 'alert';
  else if (recommendation) variant = 'info';
  else if (forage) variant = 'ok';

  const base = STATUS_STYLES[variant];
  const result = { ...base, grass, load, loadBarWidth };

  if (variant === 'alert')
    result.alert = recommendationText || 'Se recomienda reducir la carga animal.';
  else if (variant === 'info')
    result.recommendation = recommendationText || 'Tiene una recomendación disponible.';
  else if (variant === 'ok') result.ok = 'Todo en orden';

  return result;
}
