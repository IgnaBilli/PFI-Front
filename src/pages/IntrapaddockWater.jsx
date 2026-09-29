import {useState} from 'react';

const fmt=value=>Number(value).toLocaleString('es-AR',{maximumFractionDigits:1});

export default function IntrapaddockWater({analysis,stale}) {
  const [days,setDays]=useState(30);
  const climate=analysis.agua_relieve?.clima;
  const period=climate?.periodos?.find(p=>p.dias===days);
  const available=climate?.disponible&&Number.isFinite(period?.precipitacion_mm);
  return <section className="app-panel intrap-section intrap-rain" aria-label="Lluvia en el potrero">
    <div className="intrap-editor-heading">
      <h2>Lluvia en el potrero</h2>
      {climate?.disponible&&<label className="intrap-rain-period"><span className="sr-only">Período de lluvia</span><select value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>7 días completos</option><option value={30}>30 días completos</option></select></label>}
    </div>
    {stale&&<p className="intrap-message" role="status">Lectura guardada, no actualizada. Revisá el período.</p>}
    {available?<>
      <div className="intrap-rain-value"><strong>{fmt(period.precipitacion_mm)}</strong><span>mm acumulados</span></div>
      <p className="intrap-muted text-xs">{period.desde} → {period.hasta} · Estimación de Open-Meteo</p>
      <p className="intrap-rain-note">Indica cuánto llovió, no cuánta agua queda en el suelo.</p>
    </>:<p className="intrap-muted intrap-rain-note">Lluvia no disponible para este período.</p>}
  </section>;
}
