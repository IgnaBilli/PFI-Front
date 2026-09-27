import {useEffect, useRef, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {MapContainer, TileLayer, GeoJSON, CircleMarker, Polygon, Polyline, Tooltip, useMap, useMapEvents} from 'react-leaflet';
import {ArrowLeft, Layers, Plus, Save, Undo2, Pencil, Trash2, LoaderCircle} from 'lucide-react';
import {api} from '../services/api.js';
import {createStockEstimate} from '../services/analyticsService.js';
import './intrapaddock.css';

const TYPES={ambiente:'Ambiente productivo',aguada:'Aguada',sombra:'Sombra',inaccesible:'Sector inaccesible'};
const POSITIONS={sin_definir:'Sin definir',loma:'Loma',media_loma:'Media loma',bajo:'Bajo',otro:'Otro'};
const COLORS={ambiente:'#d9b66e',aguada:'#64b6e8',sombra:'#75bc8d',inaccesible:'#ec8d74'};
const LEVELS={alta:'#e6b668',media:'#acd2bc',baja:'#789ab4'};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const fmt=(value,digits=1)=>value==null?'Sin datos':Number(value).toLocaleString('es-AR',{maximumFractionDigits:digits});
const blank=()=>({id:null,nombre:'',tipo:'ambiente',ambiente_id:'',posicion:'sin_definir',desde:today(),hasta:''});

function MapControls({geom,drawing,onPoint}) {
  const map=useMap();
  const key=JSON.stringify(geom.coordinates);
  useEffect(()=>{map.fitBounds(JSON.parse(key)[0].map(([lng,lat])=>[lat,lng]),{padding:[30,30]});},[map,key]);
  useMapEvents({click:e=>drawing&&onPoint([e.latlng.lng,e.latlng.lat])});
  return null;
}

export default function IntrapaddockPage() {
  const {paddockId}=useParams();
  const [paddock,setPaddock]=useState(null),[data,setData]=useState(null),[zones,setZones]=useState([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false),[calculating,setCalculating]=useState(false),[dirty,setDirty]=useState(false);
  const [form,setForm]=useState(blank),[vertices,setVertices]=useState([]),[drawing,setDrawing]=useState(false);
  const [layers,setLayers]=useState({ambiente:true,aguada:true,sombra:true,inaccesible:true,preferencia:false});
  const [history,setHistory]=useState(null);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    let cancelled=false;
    Promise.all([api.get(`/potrero/${paddockId}`),api.get(`/potrero/${paddockId}/intrapotrero`)])
      .then(([p,d])=>{if(!cancelled){setPaddock(p);setData(d);setZones(d.configuracion.zonas);}})
      .catch(e=>{if(!cancelled)setError(e.message);}).finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;};
  },[paddockId]);
  useEffect(()=>{
    const guard=e=>{if(dirty||drawing){e.preventDefault();e.returnValue='';}};
    window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);
  },[dirty,drawing]);
  const analysis=data?.analisis,summary=data?.resumen,catalog=analysis?.catalogo??[];
  const month=Number((analysis?.fecha??today()).slice(5,7))-1;
  function begin(zone=null) {
    setError('');setForm(zone?{...blank(),...zone}: {...blank(),ambiente_id:catalog[0]?.id??'',tipo:catalog.length?'ambiente':'aguada'});
    setVertices(zone?zone.geom.coordinates[0].slice(0,-1):[]);setDrawing(true);
  }
  function acceptZone() {
    if(!form.nombre.trim())return setError('Asignale un nombre a la zona.');
    if(vertices.length<3)return setError('Marcá al menos tres puntos en el mapa.');
    if(form.tipo==='ambiente'&&!form.ambiente_id)return setError('Seleccioná un ambiente regional.');
    if(form.tipo==='inaccesible'&&(!form.desde||(form.hasta&&form.hasta<form.desde)))return setError('Revisá las fechas del sector inaccesible.');
    const z={id:form.id??crypto.randomUUID(),nombre:form.nombre.trim(),tipo:form.tipo,
      geom:{type:'Polygon',coordinates:[[...vertices,vertices[0]]]},
      ...(form.tipo==='ambiente'?{ambiente_id:form.ambiente_id,posicion:form.posicion}:{}),
      ...(form.tipo==='inaccesible'?{desde:form.desde,hasta:form.hasta||null}:{})};
    setZones(old=>[...old.filter(item=>item.id!==z.id),z]);setDirty(true);setDrawing(false);setVertices([]);setError('');
  }
  async function refresh() {
    const d=await api.get(`/potrero/${paddockId}/intrapotrero`);
    if(mounted.current){setData(d);setZones(d.configuracion.zonas);}
  }
  async function recalculate() {
    setCalculating(true);setError('');
    try {
      await createStockEstimate(paddockId,today());
      if(mounted.current){await refresh();setNotice('Balance actualizado con los ambientes registrados.');}
    } catch(e) {if(mounted.current)setError(`Las zonas siguen guardadas. No se pudo actualizar el stock: ${e.message}`);}
    finally {if(mounted.current)setCalculating(false);}
  }
  async function save() {
    setBusy(true);setError('');setNotice('');
    try {
      const d=await api.post(`/potrero/${paddockId}/intrapotrero`,{version_base:data.version??0,zonas:zones});
      if(!mounted.current)return;
      setData(d);setZones(d.configuracion.zonas);setDirty(false);setHistory(null);
      setNotice('Zonas guardadas. Actualizando el balance desde hoy…');
      await recalculate();
    } catch(e) {if(mounted.current)setError(e.message);}
    finally {if(mounted.current)setBusy(false);}
  }
  async function showHistory() {
    try {setHistory((await api.get(`/potrero/${paddockId}/intrapotrero/historial`)).versiones.reverse());}
    catch(e){setError(e.message);}
  }
  if(loading)return <div className="app-page" role="status"><LoaderCircle className="animate-spin"/> Cargando análisis del potrero…</div>;
  if(!data||!paddock)return <div className="app-page"><Link to={`/potreros/${paddockId}`}>Volver al potrero</Link><p role="alert" className="app-error mt-4">{error||'No se pudo cargar el análisis.'}</p><button className="app-button-secondary mt-4" onClick={()=>window.location.reload()}>Reintentar</button></div>;
  const pending=dirty||drawing;
  return <div className="app-page intrap-page">
    <Link className="app-button-ghost -ml-3 text-xs" to={`/potreros/${paddockId}`} onClick={e=>{if(pending&&!window.confirm('Hay cambios sin guardar. ¿Querés salir y descartarlos?'))e.preventDefault();}}><ArrowLeft size={16}/> Volver a {paddock.nombre}</Link>
    <header className="intrap-header">
      <div><p className="intrap-eyebrow">LECTURA DEL TERRITORIO · {analysis.region_nombre}</p><h1>Análisis intrapotrero</h1><p className="intrap-muted">Conectá los ambientes, el acceso al pasto y los recursos de {paddock.nombre}.</p></div>
      <span className="intrap-badge">{data.version?`Versión ${data.version}`:'Sin clasificar'}</span>
    </header>
    {error&&<p className="app-error" role="alert">{error}</p>}
    {notice&&<p className="intrap-message" role="status">{notice}</p>}
    {data.sin_actualizar&&<p className="app-error" role="status">{data.advertencia} Fecha del análisis: {analysis.fecha}.</p>}
    {data.limites_modificados&&<p className="app-error">Los límites del potrero cambiaron. Revisá o quitá las zonas anteriores y volvé a guardar. El ajuste ambiental anterior está suspendido.</p>}
    <div className="intrap-metrics" aria-label="Superficie y oferta del potrero">
      <Metric title="Superficie total" value={fmt(analysis.superficie_total_ha)} unit="ha"/>
      <Metric title="Superficie pastoreable" value={fmt(analysis.superficie_pastoreable_ha)} unit="ha"/>
      <Metric title="Crecimiento utilizable" value={fmt(summary?.crecimiento_utilizable_total_kg_ms_dia)} unit="kg MS/día"/>
      <Metric title="Carga en área pastoreable" value={fmt(summary?.carga_cabezas_ha_pastoreable,2)} unit="cabezas/ha"/>
    </div>
    <p className="intrap-muted text-xs mb-4">{pending?'Los indicadores y el mapa de preferencia corresponden a la última versión guardada.':`Análisis al ${analysis.fecha}. Zonas declaradas por el usuario.`}</p>
    <div className="intrap-workspace">
      <section className="intrap-map-panel" aria-label="Mapa intrapotrero">
        <div className="intrap-layer-bar"><Layers size={16}/>{Object.entries({...TYPES,preferencia:'Preferencia estimada'}).map(([k,label])=><label key={k}><input type="checkbox" checked={layers[k]} onChange={e=>setLayers({...layers,[k]:e.target.checked})}/>{label}</label>)}</div>
        <div className={`intrap-map ${drawing?'intrap-drawing':''}`}>
          <MapContainer center={[-35,-59]} zoom={13} maxZoom={21} style={{height:'100%',width:'100%'}} doubleClickZoom={!drawing}>
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" maxNativeZoom={19} maxZoom={21}/>
            <MapControls geom={paddock.geom} drawing={drawing} onPoint={p=>setVertices(v=>[...v,p])}/>
            <GeoJSON data={paddock.geom} style={{color:'#fff4d6',weight:3,fillOpacity:0}} interactive={false}/>
            {zones.filter(z=>layers[z.tipo]&&!(drawing&&z.id===form.id)).map(z=><GeoJSON key={z.id+JSON.stringify(z.geom)} data={z.geom} style={{color:COLORS[z.tipo],fillOpacity:z.tipo==='inaccesible'?(z.desde<=analysis.fecha&&(!z.hasta||analysis.fecha<=z.hasta)?.4:.08):.23,weight:2,dashArray:z.tipo==='inaccesible'?'6 4':null}} interactive={!drawing}><Tooltip sticky>{z.nombre} · {TYPES[z.tipo]}{z.tipo==='inaccesible'?` (${z.desde} a ${z.hasta||'sin fecha de fin'})`:''}</Tooltip></GeoJSON>)}
            {layers.preferencia&&!pending&&!data.requiere_revision&&analysis.preferencia.puntos.map((p,i)=><CircleMarker key={i} center={[p.geom.coordinates[1],p.geom.coordinates[0]]} radius={6} pathOptions={{color:LEVELS[p.nivel],fillOpacity:.7,weight:0}} interactive={!drawing}><Tooltip>Preferencia potencial {p.nivel}<br/>Agua: {fmt(p.agua_m,0)} m · Sombra: {fmt(p.sombra_m,0)} m</Tooltip></CircleMarker>)}
            {drawing&&vertices.length>2&&<Polygon positions={vertices.map(([x,y])=>[y,x])} pathOptions={{color:COLORS[form.tipo],fillOpacity:.25}} interactive={false}/>}
            {drawing&&vertices.length>1&&<Polyline positions={vertices.map(([x,y])=>[y,x])} pathOptions={{color:'#fff',dashArray:'4 4'}} interactive={false}/>}
            {drawing&&vertices.map(([x,y],i)=><CircleMarker key={i} center={[y,x]} radius={4} pathOptions={{color:'#fff',fillOpacity:1}} interactive={false}/>)}
          </MapContainer>
          {drawing&&<div className="intrap-map-hint">Tocá el mapa para marcar los vértices · {vertices.length} puntos</div>}
        </div>
        <div className="intrap-legend">{Object.entries(COLORS).map(([k,c])=><span key={k}><i style={{background:c}}/>{TYPES[k]}</span>)}</div>
        {layers.preferencia&&<p className="intrap-map-note">Preferencia por cercanía: <b style={{color:LEVELS.alta}}>alta</b> · <b style={{color:LEVELS.media}}>media</b> · <b style={{color:LEVELS.baja}}>baja</b>. {analysis.preferencia.advertencia} {analysis.preferencia.puntos.length===0?'Registrá una aguada o sombra para calcularla.':''}</p>}
      </section>
      <aside className="app-panel intrap-editor">
        <div className="intrap-editor-heading"><div><h2>{drawing?'Dibujar zona':'Zonas del potrero'}</h2><p className="intrap-muted text-xs">{zones.length} registradas · {dirty?'Cambios sin guardar':'Configuración guardada'}</p></div>{!drawing&&<button className="app-button-secondary" disabled={busy||calculating} onClick={()=>begin()}><Plus size={16}/> Agregar</button>}</div>
        {drawing?<div className="intrap-form">
          <label>Nombre<input value={form.nombre} maxLength={100} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Ej.: Bajo del norte"/></label>
          <label>Tipo<select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>{Object.entries(TYPES).map(([k,v])=><option key={k} value={k} disabled={k==='ambiente'&&!catalog.length}>{v}</option>)}</select></label>
          {form.tipo==='ambiente'&&<label>Ambiente de la región<select value={form.ambiente_id} onChange={e=>setForm({...form,ambiente_id:e.target.value})}><option value="">Seleccionar ambiente</option>{catalog.map(c=><option value={c.id} key={c.id}>{c.nombre}</option>)}</select></label>}
          {form.tipo==='ambiente'&&<label>Posición del relieve (declarada)<select value={form.posicion} onChange={e=>setForm({...form,posicion:e.target.value})}>{Object.entries(POSITIONS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><small className="intrap-muted">La tasa depende de la curva regional elegida; esta etiqueta no agrega un coeficiente.</small></label>}
          {form.tipo==='inaccesible'&&<><label>Inaccesible desde<input type="date" value={form.desde} onChange={e=>setForm({...form,desde:e.target.value})}/></label><label>Hasta (opcional, inclusive)<input type="date" min={form.desde} value={form.hasta??''} onChange={e=>setForm({...form,hasta:e.target.value})}/></label></>}
          <p className="intrap-muted text-xs">Marcá al menos tres puntos dentro del límite. Los ambientes pueden compartir bordes, pero no superponerse. Las sombras y restricciones sí pueden cruzar ambientes.</p>
          <div className="intrap-form-actions"><button className="app-button-ghost" onClick={()=>setVertices(v=>v.slice(0,-1))}><Undo2 size={14}/> Último punto</button><button className="app-button-ghost" onClick={()=>setVertices(paddock.geom.coordinates[0].slice(0,-1))}>Usar todo el potrero</button></div>
          <div className="intrap-form-actions"><button className="app-button-primary" onClick={acceptZone}>Aceptar zona</button><button className="app-button-secondary" onClick={()=>{setDrawing(false);setVertices([]);setError('');}}>Cancelar</button></div>
        </div>:<>
          <div className="intrap-zone-list">{zones.length===0?<p className="intrap-empty">Empezá por los ambientes que conocés. Lo que no clasifiques conserva la estimación regional.</p>:zones.map(z=><div className="intrap-zone" key={z.id}><i style={{background:COLORS[z.tipo]}}/><div><strong>{z.nombre}</strong><p>{TYPES[z.tipo]}{z.superficie_ha!=null?` · ${fmt(z.superficie_ha)} ha`:' · pendiente de calcular'}</p>{z.tipo==='ambiente'&&<p>{catalog.find(c=>c.id===z.ambiente_id)?.nombre??'Revisar ambiente'} · {POSITIONS[z.posicion]??'Sin definir'}</p>}{z.tipo==='inaccesible'&&<p>{z.desde} → {z.hasta||'hasta nuevo aviso'} · {z.desde<=analysis.fecha&&(!z.hasta||analysis.fecha<=z.hasta)?'Vigente':'Fuera de vigencia'}</p>}</div><button disabled={busy||calculating} aria-label={`Editar ${z.nombre}`} onClick={()=>begin(z)}><Pencil size={15}/></button><button disabled={busy||calculating} aria-label={`Quitar ${z.nombre}`} onClick={()=>{setZones(old=>old.filter(x=>x.id!==z.id));setDirty(true);}}><Trash2 size={15}/></button></div>)}</div>
          <button className="app-button-primary w-full mt-4" disabled={busy||calculating||!dirty||data.sin_actualizar} onClick={save}>{busy||calculating?<LoaderCircle size={16} className="animate-spin"/>:<Save size={16}/>} {busy||calculating?'Actualizando…':'Guardar y actualizar cálculo'}</button>
          <p className="intrap-muted text-xs mt-3">El crecimiento se ajusta desde hoy. Las versiones anteriores y sus resultados se conservan.</p>
          {!dirty&&!data.sin_actualizar&&(!summary||summary.pendiente_actualizar)&&<button className="app-button-secondary w-full mt-3" disabled={busy||calculating} onClick={recalculate}>Actualizar balance</button>}
        </>}
      </aside>
    </div>
    <section className="app-panel intrap-section"><h2>Qué aporta cada ambiente</h2><p className="intrap-muted">Referencia del mes, antes de la anomalía satelital y del porcentaje utilizable.</p><div className="intrap-table-wrap"><table><thead><tr><th>Ambiente</th><th>Superficie</th><th>Del potrero</th><th>Aporte al promedio</th></tr></thead><tbody>{analysis.configuracion.zonas.filter(z=>z.tipo==='ambiente').map(z=><tr key={z.id}><td>{z.nombre}<small>{catalog.find(c=>c.id===z.ambiente_id)?.nombre}</small></td><td>{fmt(z.superficie_ha)} ha</td><td>{fmt(z.porcentaje)} %</td><td>{fmt(z.aporte_mensual_kg_ms_ha_dia[month],2)} kg MS/ha/día</td></tr>)}<tr><td>Sin clasificar<small>Referencia regional</small></td><td>{fmt(analysis.superficie_sin_clasificar_ha)} ha</td><td>{fmt(100*analysis.superficie_sin_clasificar_ha/analysis.superficie_total_ha)} %</td><td>{fmt(analysis.referencia_base_mensual[month]*analysis.superficie_sin_clasificar_ha/analysis.superficie_total_ha,2)} kg MS/ha/día</td></tr></tbody></table></div></section>
    <div className="intrap-bottom-grid">
      <section className="app-panel intrap-section"><h2>Oferta y acceso al pasto</h2><dl className="intrap-facts"><div><dt>Stock forrajero estimado total</dt><dd>{fmt(summary?.stock_estimado_total_kg_ms,0)} kg MS</dd></div><div><dt>Stock accesible aproximado</dt><dd>{fmt(summary?.stock_accesible_proxy_kg_ms,0)} kg MS</dd></div><div><dt>Crecimiento en sectores accesibles</dt><dd>{fmt(summary?.crecimiento_accesible_total_kg_ms_dia)} kg MS/día</dd></div></dl><p className="intrap-muted text-xs">{summary?.nota_stock_accesible??'Guardá las zonas y actualizá el balance para ver las estimaciones.'}</p>{summary?.stock_fecha&&<p className="intrap-muted text-xs mt-2">Saldo guardado al {summary.stock_fecha}. {summary.pendiente_actualizar?'El balance requiere actualización.':''}</p>}</section>
      <section className="app-panel intrap-section"><h2>Lectura para el manejo</h2><ul className="intrap-alerts">{analysis.advertencias.map(t=><li key={t}>{t}</li>)}</ul><p className="intrap-muted text-xs">La cercanía ayuda a identificar posibles concentraciones de uso. No prueba sobrepastoreo ni reemplaza una recorrida.</p></section>
    </div>
    <section className="app-panel intrap-section"><div className="intrap-editor-heading"><div><h2>Fuentes y trazabilidad</h2><p className="intrap-muted">{data.guardado_en?`Último registro: ${new Date(data.guardado_en).toLocaleString('es-AR')}`:'Todavía no hay una configuración registrada.'}</p></div><button className="app-button-secondary" onClick={showHistory}>Ver versiones</button></div>
      <details className="mt-4"><summary>Cómo se obtiene esta estimación</summary><p className="intrap-muted mt-3">Los ambientes y recursos los declara el usuario. Las superficies se calculan sobre los polígonos. Se ponderan las curvas mensuales de la matriz regional existente y se conserva la anomalía DMP del potrero completo. El mapa de preferencia representa cercanía a recursos, no píxeles de NDVI ni seguimiento animal.</p><p className="intrap-muted mt-3">Las referencias heredadas tienen distinto grado de respaldo; las de Pampa Deprimida remiten a la matriz del PFI. Su ponderación no constituye una calibración local. INTA/IGN se documentan como apoyo para una futura clasificación asistida.</p><ul className="intrap-sources"><li><a href="https://www.agro.uba.ar/users/garbulsk/Curso_ut_archivos/clases/09%20-%20Pastizales%20templado%20h%C3%BAmedos.pdf" target="_blank" rel="noreferrer">FAUBA: comunidades y productividad de la Pampa Deprimida</a></li><li><a href="https://repositorio.inta.gob.ar/handle/20.500.12123/9558" target="_blank" rel="noreferrer">INTA: comportamiento y distribución animal en pastoreo extensivo</a></li><li><a href="https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html" target="_blank" rel="noreferrer">Copernicus: alcance de Sentinel-2</a></li></ul>{catalog.map(c=><p className="intrap-muted text-xs mt-2" key={c.id}>{c.nombre}: {c.fuente}</p>)}</details>
      {history&&<div className="intrap-history">{history.length===0?<p>Sin versiones anteriores.</p>:history.map(v=><div key={v.id}><span>Versión {v.id} · desde {v.vigente_desde} · {v.cantidad_zonas} zonas</span><button className="app-button-ghost" disabled={busy||calculating||drawing} onClick={()=>{setZones(v.configuracion.zonas);setDirty(true);setNotice('Versión cargada para revisar. Guardar creará una nueva versión desde hoy.');}}>Cargar para restaurar</button></div>)}</div>}
    </section>
  </div>;
}
function Metric({title,value,unit}) {return <div className="app-panel intrap-metric"><span>{title}</span><strong>{value}</strong><small>{unit}</small></div>;}
