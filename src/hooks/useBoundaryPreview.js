import { useEffect, useState } from 'react';
import { previewEstanciaBoundary } from '../services/estanciaService.js';
import { coordsToGeoJsonPolygon } from '../services/mappers.js';

export default function useBoundaryPreview(vertices, valid) {
  const key = JSON.stringify(vertices);
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await previewEstanciaBoundary(coordsToGeoJsonPolygon(JSON.parse(key)));
        if (!cancelled) setResult({ key, data });
      } catch (error) {
        if (!cancelled) setResult({ key, error: error.message || 'No se pudo verificar el límite.' });
      }
    }, 450);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [key, valid]);
  const current = valid && result?.key === key ? result : null;
  return {
    pending: valid && !current,
    data: current?.data,
    error: current?.error,
    // Keep nearby outlines visible while the user adjusts the drawn boundary.
    zones: result?.data?.zonas ?? [],
  };
}
