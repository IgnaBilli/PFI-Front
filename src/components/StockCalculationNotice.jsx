export default function StockCalculationNotice({ error }) {
  if (!error) return null;
  const unsupported = error.code === 'COBERTURA_NO_COMPATIBLE';
  return <div role={unsupported ? 'status' : 'alert'} className={unsupported
    ? 'mt-4 rounded-xl border border-warning-400/30 bg-warning-400/10 p-4 text-xs leading-relaxed text-warning-400'
    : 'app-error mt-4 text-xs leading-relaxed'}>
    {unsupported && <p className="mb-1 font-semibold">Stock no disponible para esta cobertura</p>}
    <p>{error.message || 'No se pudo calcular el Stock utilizable.'}</p>
    {unsupported && <p className="mt-2">Revisá que el polígono corresponda al potrero. Si está bien ubicado, esta superficie necesita un modelo compatible con su cobertura. El potrero sigue registrado; no se asigna un stock de cero ni se inventa una estimación.</p>}
  </div>;
}
