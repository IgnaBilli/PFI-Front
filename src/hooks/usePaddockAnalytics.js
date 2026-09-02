import { useEffect, useState } from 'react';
import {
  fetchActiveRecommendation,
  fetchLatestForage,
  fetchLatestNutrition,
} from '../services/analyticsService.js';

export default function usePaddockAnalytics(paddocks) {
  const [dataById, setDataById] = useState({});
  const [errorsById, setErrorsById] = useState({});
  const [loading, setLoading] = useState(false);
  const ids = paddocks.map((p) => p.id).join(',');

  useEffect(() => {
    if (!paddocks.length) {
      setDataById({});
      setErrorsById({});
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setErrorsById({});
    Promise.allSettled(
      paddocks.map(async (paddock) => {
        const results = await Promise.allSettled([
          fetchLatestForage(paddock.id),
          fetchLatestNutrition(paddock.id),
          fetchActiveRecommendation(paddock.id),
        ]);
        const keys = ['forage', 'nutrition', 'recommendation'];
        const data = {};
        const errors = {};
        results.forEach((result, index) => {
          const key = keys[index];
          data[key] = result.status === 'fulfilled' ? result.value : null;
          if (result.status === 'rejected') errors[key] = result.reason;
        });
        return [paddock.id, data, errors];
      })
    )
      .then((results) => {
        if (cancelled) return;
        const entries = results
          .filter((result) => result.status === 'fulfilled')
          .map((result) => result.value);
        setDataById(Object.fromEntries(entries.map(([id, data]) => [id, data])));
        setErrorsById(
          Object.fromEntries(
            entries
              .filter(([, , errors]) => Object.keys(errors).length)
              .map(([id, , errors]) => [id, errors])
          )
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const error = Object.values(errorsById).flatMap(Object.values)[0] ?? null;
  return { dataById, loading, error, errorsById };
}

const STATUS_STYLES = {
  alert: { status: 'Atención', statusColor: 'var(--danger)', statusBg: 'rgb(228 119 110 / 0.12)', loadColor: 'var(--danger)' },
  info: { status: 'Recomendación', statusColor: 'var(--warning)', statusBg: 'rgb(216 170 98 / 0.12)', loadColor: 'var(--warning)' },
  ok: { status: 'Datos disponibles', statusColor: 'var(--color-brand-400)', statusBg: 'rgb(74 132 109 / 0.12)', loadColor: 'var(--color-brand-400)' },
  empty: {
    status: 'Sin datos',
    statusColor: 'var(--text-muted)',
    statusBg: 'rgb(221 208 188 / 0.08)',
    loadColor: 'var(--text-muted)',
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
    grassValue !== undefined && grassValue !== null ? `${grassValue} kg MS/ha` : 'Sin datos';

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
  else if (variant === 'ok') result.ok = 'Estimación forrajera disponible';

  return result;
}
