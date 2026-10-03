import { useEffect, useState } from 'react';

import { nextStockUpdateLabel } from '../utils/nextStockUpdate.js';

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
    </div>
  );
}
