import {useState} from 'react';
import {WATER_STATES} from './intrapaddockWaterOptions.js';
import {RELIEF_LABELS,weatherPeriod,zoneAdvisory} from './intrapaddockAdvisories.js';

const fmt=value=>value.toLocaleString('es-AR',{maximumFractionDigits:1});
const date=value=>value.split('-').reverse().join('/');

export default function IntrapaddockAdvisories({analysis,stale,onEditSoil,disabled}) {
  const [days,setDays]=useState(30);
  const period=weatherPeriod(analysis,days,stale);
  const zones=analysis.configuracion?.zonas?.filter(z=>z.tipo==='ambiente')??[];
  return <section className="app-panel intrap-section intrap-advisories" aria-label="Agua y relieve">
    <div className="intrap-editor-heading"><h2>Agua y relieve</h2><span className="intrap-advisory-badge">Orientativo</span></div>
    <div className="intrap-advisory-weather">
      <label className="intrap-rain-period"><span className="sr-only">Período de los avisos</span><select value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>7 días completos</option><option value={30}>30 días completos</option></select></label>
      {period?<div><p><b>{fmt(period.precipitacion_mm)} mm</b> de lluvia · <b>{fmt(period.et0_mm)} mm</b> de demanda atmosférica de referencia</p><small>{date(period.desde)} → {date(period.hasta)} · Open-Meteo · No mide el agua del suelo.</small></div>:
        <p className="intrap-muted" role="status">{stale?'Análisis guardado, sin actualizar.':'Sin datos climáticos completos para este período.'}</p>}
    </div>
    {period&&<p className="intrap-muted text-xs">{period.signal<0?'Llovió menos que la demanda de referencia.':period.signal>0?'Llovió más que la demanda de referencia.':'Lluvia y demanda de referencia fueron similares.'} Es una señal para revisar el campo.</p>}
    <div className="intrap-advisory-zones">{zones.map(zone=>{
      const advisory=zoneAdvisory(zone,period,analysis.fecha,stale);
      const observation=zone.observacion_hidrica;
      return <article className="intrap-advisory-zone" key={zone.id} aria-label={`Aviso para ${zone.nombre}`}>
        <div className="intrap-editor-heading"><h3>{zone.nombre}</h3><span>{RELIEF_LABELS[zone.posicion]??'Sin definir'}</span></div>
        <strong className="intrap-advisory-title">{advisory.title}</strong><p>{advisory.message}</p>
        <p className="intrap-muted text-xs">{observation?.fecha&&WATER_STATES[observation.estado]?`${WATER_STATES[observation.estado]} · Observado el ${date(observation.fecha)}${advisory.observedToday?'':' · No confirma el estado actual'}`:'Sin observación del suelo cargada.'}</p>
        {onEditSoil&&<button className="app-button-secondary" disabled={disabled||stale} aria-label={`Actualizar estado del suelo de ${zone.nombre}`} onClick={()=>onEditSoil(zone)}>Actualizar estado del suelo</button>}
      </article>;
    })}</div>
  </section>;
}
