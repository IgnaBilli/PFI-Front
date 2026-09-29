const fmt=value=>Number.isFinite(value)?Number(value).toLocaleString('es-AR',{maximumFractionDigits:1}):'Sin datos';
const date=value=>value?value.split('-').reverse().join('/'):'Sin fecha';

export default function IntrapaddockClimate({analysis,summary,stale}) {
  const coverage=analysis.comparacion_climatica?.cobertura;
  if(!coverage)return null;
  const pending=stale||summary?.pendiente_actualizar;
  const comparison=summary?.comparacion_crecimiento;
  const current=pending?null:summary?.crecimiento_bruto_kg_ms_ha_dia;
  const ready=!pending&&comparison?.estado==='comparacion_disponible';
  const difference=ready?comparison.diferencia_porcentual:null;
  return <section className="app-panel intrap-section intrap-climate" aria-label="Crecimiento estimado">
    <div className="intrap-editor-heading"><h2>Crecimiento estimado</h2><span className="intrap-climate-badge">Experimental</span></div>
    <p className="intrap-muted text-xs">{coverage.provincias.join(' · ')||'Fuera de NEA y Buenos Aires provincia'} · Pastizal natural</p>
    <div className="intrap-climate-values">
      {ready&&<div><span>Referencia regional</span><strong>{fmt(comparison.referencia_kg_ms_ha_dia)} <small>kg MS/ha/día</small></strong></div>}
      <div><span>Crecimiento bruto vigente</span><strong>{fmt(current)} <small>kg MS/ha/día</small></strong></div>
      {Number.isFinite(difference)&&<div><span>Variación respecto a la referencia</span><strong>{difference>0?'+':''}{fmt(difference)} %</strong></div>}
    </div>
    {pending?<p className="intrap-rain-note" role="status">Balance sin actualizar. Actualizalo para ver la comparación.</p>:
      <p className="intrap-rain-note">{ready?'Clima y vegetación ya están incluidos en el crecimiento vigente.':comparison?.mensaje||'Se conserva el crecimiento vigente; falta una referencia trazable para compararlo.'}</p>}
    {ready&&<p className="intrap-muted text-xs">Referencia del {date(comparison.fecha_referencia)} · {comparison.provisional?'Tasa proyectada':'Tasa estimada'} al {date(comparison.fecha)}{comparison.fecha_imagen?` · Imagen del ${date(comparison.fecha_imagen)}`:''}{comparison.factor_limitado?' · Ajuste limitado por el modelo':''}</p>}
    <p className="intrap-muted text-xs">Sin ajuste adicional por relieve. La precisión en este potrero aún no está validada.</p>
  </section>;
}
