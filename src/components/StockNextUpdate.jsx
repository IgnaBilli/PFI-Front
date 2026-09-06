import { useEffect, useState } from 'react';

export function nextStockUpdateLabel(date, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) return 'sin fecha disponible';
  const target = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(target) || new Date(target).toISOString().slice(0, 10) !== date) return 'sin fecha disponible';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = type => parts.find(item => item.type === type).value;
  const today = Date.parse(`${part('year')}-${part('month')}-${part('day')}T00:00:00Z`);
  const days = Math.round((target - today) / 86400000);
  if (days < 0) return 'pendiente';
  if (days === 0) return 'hoy';
  return `en ${days} ${days === 1 ? 'día' : 'días'}`;
}

export default function StockNextUpdate({ date, running = false }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="mt-4 rounded-lg border border-brand-400/20 bg-brand-500/10 px-3 py-2">
      <p className="text-sm font-semibold text-brand-400" role="status">
        {running ? 'Actualización de stock en curso…' : `Próxima actualización ${nextStockUpdateLabel(date, now)}`}
      </p>
      <p className="mt-1 text-xs text-sand-500">Del crecimiento del bloque. El saldo de stock se actualiza diariamente.</p>
    </div>
  );
}
