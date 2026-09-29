const fmt=value=>Number.isFinite(value)?Number(value).toLocaleString('es-AR',{maximumFractionDigits:1}):'Sin datos';

export default function IntrapaddockClimate({analysis,summary,stale}) {
  const comparison=analysis.comparacion_climatica;
  if(!comparison)return null;
  const period=comparison.periodo_climatico;
  const current=stale||summary?.pendiente_actualizar?null:summary?.crecimiento_bruto_kg_ms_ha_dia;
  return <section className="app-panel intrap-section intrap-climate" aria-label="Comparación climática">
    <div className="intrap-editor-heading"><h2>Comparación climática</h2><span className="intrap-climate-badge">Experimental</span></div>
    <p className="intrap-muted text-xs">{comparison.cobertura.provincias.join(' · ')||'Fuera de NEA y Buenos Aires provincia'} · Pastizal natural</p>
    <div className="intrap-climate-values">
      <div><span>Crecimiento bruto actual</span><strong>{fmt(current)} <small>kg MS/ha/día</small></strong></div>
      <div><span>Estimación climática alternativa</span><strong>No disponible</strong></div>
    </div>
    <p className="intrap-rain-note">{comparison.mensaje}</p>
    {stale?<p className="intrap-muted text-xs" role="status">Comparación guardada, sin actualizar. Revisá la fecha del análisis.</p>:
      period&&<p className="intrap-muted text-xs">{period.desde} → {period.hasta} · {fmt(period.precipitacion_mm)} mm · {fmt(period.temperatura_media_c)} °C de media · Open-Meteo</p>}
    <p className="intrap-muted text-xs">Sin cambios en el stock ni en el crecimiento vigente.</p>
  </section>;
}
