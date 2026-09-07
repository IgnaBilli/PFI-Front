const DAY = 86400000;
const numeric = value => value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const dateKey = now => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now);

export function stockTwoDays(stock, now = new Date()) {
  const today = dateKey(now);
  const baseDate = String(stock?.fecha_objetivo ?? '').slice(0, 10);
  const baseTime = Date.parse(baseDate + 'T00:00:00Z');
  const todayTime = Date.parse(today + 'T00:00:00Z');
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(baseDate) && Number.isFinite(baseTime)
    && new Date(baseTime).toISOString().slice(0, 10) === baseDate && baseTime <= todayTime;
  const base = numeric(stock?.stock_final_central_kg_ms_ha);
  const growth = numeric(stock?.crecimiento_utilizable_kg_ms_ha_dia);
  const consumption = numeric(stock?.consumo_diario_kg_ms_ha);
  const area = numeric(stock?.superficie_ha);
  const rate = growth != null && consumption != null && growth >= 0 && consumption >= 0 ? growth - consumption : null;
  return [0, 1].map(offset => {
    const date = new Date(todayTime + offset * DAY).toISOString().slice(0, 10);
    const days = (todayTime - baseTime) / DAY + offset;
    const value = !validDate || base == null || base < 0 ? null : days === 0 ? base
      : rate == null ? null : Math.max(0, base + days * rate);
    return { date, projected: days > 0, value,
      total: value != null && area != null && area > 0 ? value * area : null };
  });
}

