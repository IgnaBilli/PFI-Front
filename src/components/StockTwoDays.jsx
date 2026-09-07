import { useEffect, useState } from 'react';

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

export default function StockTwoDays({ stock }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const days = stockTwoDays(stock, now);
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        {days.map((day, index) => (
          <div key={day.date} className={index ? 'border-l border-sand-100/10 pl-4' : ''}>
            <p className="text-sm font-bold text-sand-400">{index ? 'Mañana' : 'Hoy'} · {day.date.split('-').reverse().join('/')}</p>
            <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-sand-100 sm:text-3xl">
              {day.value == null ? 'Sin datos' : day.value.toLocaleString('es-AR', { maximumFractionDigits: 1 })}
            </p>
            <p className="text-xs text-sand-500">kg MS/ha · {day.projected ? 'Proyección' : 'Saldo estimado'}</p>
            <div className="mt-4 border-t border-sand-100/10 pt-3">
              <p className="text-xs text-sand-500">Total del potrero · {index ? 'Mañana' : 'Hoy'}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-sand-100">
                {day.total == null ? 'Sin datos' : day.total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                {day.total != null && <span className="ml-1 text-xs font-normal text-sand-500">kg MS</span>}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-sand-500">Proyección con el crecimiento y consumo guardados, sin cambios del rodeo aún no calculados.</p>
    </div>
  );
}
