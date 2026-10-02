import { useEffect, useState } from 'react';

import { stockTwoDays } from '../utils/stockProjection.js';

export default function StockTwoDays({ stock }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const days = stockTwoDays(stock, now);
  return (
    <div>
      {stock?.detalle_json?.supuesto_uso_ganadero?.activo && (
        <div className="mb-4 rounded-xl border border-warning-400/30 bg-warning-400/10 p-3 text-xs leading-relaxed text-warning-400">
          <p className="font-semibold">Estimación orientativa · uso ganadero asumido</p>
          <p className="mt-1">MapBiomas indica {stock.detalle_json.supuesto_uso_ganadero.cobertura_observada}. El cálculo usa una referencia regional de pasto bajo el supuesto de uso ganadero. Confianza baja; no es una medición de campo.</p>
        </div>
      )}
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
