export default function StockProgress({ value, running }) {
  if (value == null) return null;
  const percentage = Math.min(running ? 99 : 100, Math.max(0, Math.floor(Number(value) || 0)));
  return <div className="mt-3 flex items-center gap-3">
    <div role="progressbar" aria-label="Cálculo de stock" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}
      className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-brand-400 transition-[width] duration-500 motion-reduce:transition-none"
        style={{ width: `${percentage}%` }} />
    </div>
    <span className="w-10 text-right text-xs font-semibold tabular-nums text-brand-400">{percentage}%</span>
  </div>;
}
