import {useState} from 'react';
import {WATER_STATES} from './intrapaddockWaterOptions.js';

const fmt=(value)=>value==null?'Sin datos':Number(value).toLocaleString('es-AR',{maximumFractionDigits:1});
const RELIEF={loma:'Loma',media_loma:'Media loma',bajo:'Bajo',sin_definir:'Sin definir'};

export default function IntrapaddockWater({analysis,summary,pending,stale}) {
  const [days,setDays]=useState(30);
  const water=analysis.agua_relieve;
  const climate=water?.clima;
  const period=climate?.periodos?.find(p=>p.dias===days);
  const zones=analysis.configuracion.zonas.filter(z=>z.tipo==='ambiente');
  return <section className="app-panel intrap-section intrap-water" aria-label="Agua y crecimiento">
    <div className="intrap-editor-heading"><h2>Agua y crecimiento</h2><span className="intrap-badge">Sin ajuste al crecimiento</span></div>
    <p className="intrap-muted">Contexto climático; el suelo se confirma a campo.</p>
    {(pending||stale)&&<p className="intrap-message" role="status">{stale?'Lectura guardada, no actualizada. Revisá las fechas de los datos.':'Esta lectura corresponde a las zonas guardadas. Guardá tus cambios para actualizarla.'}</p>}
    {!climate?.disponible?<p className="intrap-message">{climate?.mensaje??'Lectura hídrica no disponible en este análisis. El crecimiento base se conserva.'}</p>:<>
      <div className="intrap-water-period"><label>Período climático<select value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>7 días completos</option><option value={30}>30 días completos</option></select></label><p className="intrap-muted">{period?.desde} → {period?.hasta} · Datos modelados por Open-Meteo</p></div>
      <div className="intrap-water-metrics">
        <div><span>Precipitación acumulada</span><strong>{fmt(period?.precipitacion_mm)} <small>mm</small></strong></div>
        <div><span>Demanda atmosférica de referencia (ET₀)</span><strong>{fmt(period?.et0_mm)} <small>mm</small></strong></div>
        <div><span>Diferencia: lluvia − ET₀</span><strong>{fmt(period?.balance_mm)} <small>mm</small></strong></div>
      </div>
      <p className="intrap-water-caption">{period?.senal==='negativo'?'Demanda mayor que lluvia.':period?.senal==='positivo'?'Lluvia mayor que demanda.':'Lluvia y demanda similares.'} No mide humedad del suelo ni confirma sequía o inundación.</p>
    </>}
    <div className="intrap-water-zones">{zones.length===0?<p className="intrap-empty">Agregá un ambiente para interpretar su relieve y registrar el estado del suelo.</p>:zones.map(zone=>{
      const reading=water?.zonas?.find(z=>z.id===zone.id);
      const contribution=!stale&&summary?.crecimiento_utilizable_total_kg_ms_dia!=null
        ?summary.crecimiento_utilizable_total_kg_ms_dia*zone.superficie_ha/analysis.superficie_total_ha:null;
      return <article key={zone.id} className="intrap-water-zone">
        <div className="intrap-editor-heading"><h3>{zone.nombre}</h3><span>{RELIEF[zone.posicion]??'Sin definir'} · {fmt(zone.superficie_ha)} ha</span></div>
        <p><b>Estado del suelo:</b> {reading?.estado_suelo??'Sin confirmar'}{reading?.observacion_del_dia?' · declarado por el usuario':''}</p>
        {reading?.observacion&&<p className="intrap-muted">{reading.observacion_del_dia?'Observación del':'Última observación, no confirma el estado actual:'} {reading.observacion.fecha} · {WATER_STATES[reading.observacion.estado]}</p>}
        <div className="intrap-water-result"><span>{contribution!=null?`Aporte base distribuido: ${fmt(contribution)} kg MS/día.`:'Actualizá el balance para consultar el aporte base.'} Estimado por superficie.</span></div>
        <details className="intrap-zone-details"><summary>Interpretación del ambiente</summary><p>{reading?.explicacion_relieve??'Sin interpretación disponible.'}</p>{reading&&<><p className="intrap-muted">{reading.contexto}</p><p><b>Posible efecto:</b> {reading.efecto_posible}</p></>}<p>Sin ajuste validado de crecimiento por relieve. El aporte no es una medición de esta zona.</p></details>
      </article>;
    })}</div>
    <details className="intrap-water-method"><summary>Datos, límites y fuentes</summary>
      <p>Se usan ubicación del potrero, lluvia y ET₀ de los últimos días completos, polígonos y relieve declarados. Una observación del suelo se muestra con su fecha y no se presenta como actual en días posteriores.</p>
      <p>No se infieren textura, reserva útil, drenaje ni napa a partir del nombre del relieve. Faltan esos datos y una respuesta de la vegetación validada localmente para calcular un porcentaje de cambio del crecimiento. Lluvia − ET₀ es un indicador climático, no un balance completo del suelo.</p>
      <p>La lectura por relieve toma evidencia de la Pampa Deprimida como orientación. Las fuentes del NEA aportan ensayos locales y producción por recurso; no validan un coeficiente único para toda la región.</p>
      <p>El stock cargado y el crecimiento vigente se conservan. No se añade otro multiplicador por clima. Agua y sombra siguen siendo recursos de manejo; un sector inaccesible modifica solamente la oferta accesible.</p>
      <ul className="intrap-sources">{water?.fuentes?.map(source=><li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.titulo}</a><p className="intrap-muted">{source.alcance}</p></li>)}</ul>
    </details>
  </section>;
}
