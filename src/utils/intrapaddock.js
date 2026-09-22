export const formatNdvi = value => Number.isFinite(value)
  ? value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  : 'Sin datos';

export const formatObservationDate = date => new Date(`${date}T12:00:00`).toLocaleDateString('es-AR', {
  day: 'numeric', month: 'short', year: 'numeric',
});

export function observationFor(sector, date) {
  const value = sector.observations[date];
  return Number.isFinite(value) && value >= -1 && value <= 1 ? value : null;
}

// Missing observations never count as zero and are never extrapolated over the full paddock.
export function summarizeObservation(sectors, date) {
  const totalArea = sectors.reduce((sum, sector) => sum + sector.areaHa, 0);
  const valid = sectors.filter(sector => observationFor(sector, date) !== null);
  const observedArea = valid.reduce((sum, sector) => sum + sector.areaHa, 0);
  const values = valid.map(sector => observationFor(sector, date));
  return {
    totalArea,
    observedArea,
    missingArea: totalArea - observedArea,
    coverage: totalArea > 0 ? observedArea / totalArea * 100 : 0,
    mean: observedArea > 0
      ? valid.reduce((sum, sector) => sum + sector.areaHa * observationFor(sector, date), 0) / observedArea
      : null,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
  };
}

export function ndviColor(value) {
  if (value === null) return '#45504b';
  const t = Math.max(0, Math.min(1, (value - 0.2) / 0.6));
  const low = [181, 136, 77];
  const high = [51, 130, 93];
  return `rgb(${low.map((v, i) => Math.round(v + (high[i] - v) * t)).join(',')})`;
}
