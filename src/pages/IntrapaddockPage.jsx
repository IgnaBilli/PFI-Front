import {useEffect, useRef, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {MapContainer, TileLayer, GeoJSON, CircleMarker, Polygon, Polyline, Tooltip, useMap, useMapEvents} from 'react-leaflet';
import {ArrowLeft, Layers, Plus, Save, Undo2, Pencil, Trash2, LoaderCircle} from 'lucide-react';
import {api} from '../services/api.js';
import {createStockEstimate} from '../services/analyticsService.js';
import IntrapaddockAdvisories from './IntrapaddockAdvisories.jsx';
import {WATER_STATES} from './intrapaddockWaterOptions.js';
import './intrapaddock.css';

const TYPES={ambiente:'Ambiente productivo',aguada:'Agua (sin pasto)',sombra:'Sombra',inaccesible:'Sector inaccesible'};
const POSITIONS={sin_definir:'Sin definir',loma:'Loma',media_loma:'Media loma',bajo:'Bajo'};
const COLORS={ambiente:'#d9b66e',aguada:'#64b6e8',sombra:'#75bc8d',inaccesible:'#ec8d74'};
const LEVELS={alta:'#e6b668',media:'#acd2bc',baja:'#789ab4'};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const fmt=(value,digits=1)=>value==null?'Sin datos':Number(value).toLocaleString('es-AR',{maximumFractionDigits:digits});
const zoneInput=z=>({id:z.id,nombre:z.nombre,tipo:z.tipo,geom:z.geom,...(z.tipo==='ambiente'?{posicion:Object.hasOwn(POSITIONS,z.posicion)?z.posicion:'sin_definir',...(z.observacion_hidrica?{observacion_hidrica:z.observacion_hidrica}:{})}:{}),...(z.tipo==='inaccesible'?{desde:z.desde,hasta:z.hasta??null}:{})});
const blank=()=>({id:null,nombre:'',tipo:'ambiente',posicion:'sin_definir',desde:today(),hasta:''});

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
  const mounted=useRef(true);
  const soilInput=useRef(null),focusSoil=useRef(false);
  useEffect(()=>{
    if(drawing&&focusSoil.current&&soilInput.current){
      soilInput.current.scrollIntoView?.({behavior:'smooth',block:'center'});
      soilInput.current.focus({preventScroll:true});focusSoil.current=false;
    }
  },[drawing]);
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
  const analysis=data?.analisis,summary=data?.resumen;
  const month=Number((analysis?.fecha??today()).slice(5,7))-1;
  function begin(zone=null) {
    setError('');setForm(zone?{...blank(),...zoneInput(zone)}:blank());
    setVertices(zone?zone.geom.coordinates[0].slice(0,-1):[]);setDrawing(true);
  }
  function acceptZone() {
    if(!form.nombre.trim())return setError('Asignale un nombre a la zona.');
    if(vertices.length<3)return setError('Marcá al menos tres puntos en el mapa.');
    if(form.tipo==='inaccesible'&&(!form.desde||(form.hasta&&form.hasta<form.desde)))return setError('Revisá las fechas del sector inaccesible.');
    if(form.tipo==='ambiente'&&form.observacion_hidrica&&(!form.observacion_hidrica.fecha||form.observacion_hidrica.fecha>today()))return setError('La observación necesita una fecha de hoy o anterior.');
    const z={id:form.id??crypto.randomUUID(),nombre:form.nombre.trim(),tipo:form.tipo,
      geom:{type:'Polygon',coordinates:[[...vertices,vertices[0]]]},
      ...(form.tipo==='ambiente'?{posicion:form.posicion,...(form.observacion_hidrica?{observacion_hidrica:form.observacion_hidrica}:{})}:{}),
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
      const d=await api.post(`/potrero/${paddockId}/intrapotrero`,{version_base:data.version??0,zonas:zones.map(zoneInput)});
      if(!mounted.current)return;
      setData(d);setZones(d.configuracion.zonas);setDirty(false);
      setNotice('Zonas guardadas. Actualizando el balance desde hoy…');
      await recalculate();
    } catch(e) {if(mounted.current)setError(e.message);}
    finally {if(mounted.current)setBusy(false);}
  }
  if(loading)return <div className="intrap-loading" role="status"><LoaderCircle size={28} className="animate-spin" aria-hidden="true"/><span>Cargando análisis del potrero…</span></div>;
  if(!data||!paddock)return <div className="app-page"><Link to={`/potreros/${paddockId}`}>Volver al potrero</Link><p role="alert" className="app-error mt-4">{error||'No se pudo cargar el análisis.'}</p><button className="app-button-secondary mt-4" onClick={()=>window.location.reload()}>Reintentar</button></div>;
  const pending=dirty||drawing;
  return <div className="app-page intrap-page">
    <Link className="app-button-ghost -ml-3 text-xs" to={`/potreros/${paddockId}`} onClick={e=>{if(pending&&!window.confirm('Hay cambios sin guardar. ¿Querés salir y descartarlos?'))e.preventDefault();}}><ArrowLeft size={16}/> Volver a {paddock.nombre}</Link>
    <header className="intrap-header">
      <div><h1>Análisis intrapotrero</h1><p className="intrap-muted">Pasto disponible, ambientes y recursos.</p></div>
    </header>
    {error&&<p className="app-error" role="alert">{error}</p>}
    {notice&&<p className="intrap-message" role="status">{notice}</p>}
    {data.sin_actualizar&&<p className="app-error" role="status">{data.advertencia} Fecha del análisis: {analysis.fecha}.</p>}
    {data.limites_modificados&&<p className="app-error">Los límites del potrero cambiaron. Revisá o quitá las zonas anteriores y volvé a guardar. El ajuste ambiental anterior está suspendido.</p>}
    <section className="intrap-overview" aria-label="Oferta y acceso al pasto">
      <div className="intrap-primary-metrics">
        <Metric title="Stock forrajero total" value={fmt(summary?.stock_estimado_total_kg_ms,0)} unit="kg MS" note="Estimado en todo el potrero"/>
        <Metric title="Stock accesible" value={fmt(summary?.stock_accesible_proxy_kg_ms,0)} unit="kg MS" note="Aproximado por superficie accesible" accent/>
        <Metric title="Crecimiento accesible" value={fmt(summary?.crecimiento_accesible_total_kg_ms_dia)} unit="kg MS/día" note="En sectores accesibles" accent/>
      </div>
      <div className="intrap-overview-meta">
        <p>{summary?.stock_fecha?`Stock al ${summary.stock_fecha}.`:'Sin saldo disponible.'} {summary?.pendiente_actualizar?'Balance pendiente de actualizar.':''}</p>
      </div>
    </section>
    <div className="intrap-metrics intrap-secondary-metrics" aria-label="Superficie y oferta del potrero">
      <Metric title="Superficie total" value={fmt(analysis.superficie_total_ha)} unit="ha"/>
      <Metric title="Superficie pastoreable" value={fmt(analysis.superficie_pastoreable_ha)} unit="ha"/>
      <Metric title="Crecimiento utilizable total" value={fmt(summary?.crecimiento_utilizable_total_kg_ms_dia)} unit="kg MS/día"/>
      <Metric title="Carga sobre área pastoreable" value={fmt(summary?.carga_cabezas_ha_pastoreable,2)} unit="cabezas/ha"/>
    </div>
    {pending&&<p className="intrap-muted text-xs mb-4">Cambios pendientes: los indicadores corresponden a lo guardado.</p>}
    <IntrapaddockAdvisories analysis={analysis} stale={data.sin_actualizar||data.requiere_revision} disabled={pending||busy||calculating} onEditSoil={zone=>{focusSoil.current=true;begin(zone);}}/>
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
          <label>Tipo<select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>{Object.entries(TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          {form.tipo==='ambiente'&&<label>Posición del relieve (declarada)<select value={form.posicion} onChange={e=>setForm({...form,posicion:e.target.value})}>{Object.entries(POSITIONS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>}
          {form.tipo==='ambiente'&&<><label>Estado del suelo observado (opcional)<select ref={soilInput} value={form.observacion_hidrica?.estado??''} onChange={e=>setForm({...form,observacion_hidrica:e.target.value?{estado:e.target.value,fecha:today()}:undefined})}><option value="">Sin observación</option>{Object.entries(WATER_STATES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>{form.observacion_hidrica&&<label>Fecha de observación<input type="date" max={today()} value={form.observacion_hidrica.fecha} onChange={e=>setForm({...form,observacion_hidrica:{...form.observacion_hidrica,fecha:e.target.value}})}/></label>}</>}
          {form.tipo==='inaccesible'&&<><label>Inaccesible desde<input type="date" value={form.desde} onChange={e=>setForm({...form,desde:e.target.value})}/></label><label>Hasta (opcional, inclusive)<input type="date" min={form.desde} value={form.hasta??''} onChange={e=>setForm({...form,hasta:e.target.value})}/></label></>}
          <div className="intrap-form-actions"><button className="app-button-ghost" onClick={()=>setVertices(v=>v.slice(0,-1))}><Undo2 size={14}/> Último punto</button><button className="app-button-ghost" onClick={()=>setVertices(paddock.geom.coordinates[0].slice(0,-1))}>Usar todo el potrero</button></div>
          <div className="intrap-form-actions"><button className="app-button-primary" onClick={acceptZone}>Aceptar zona</button><button className="app-button-secondary" onClick={()=>{setDrawing(false);setVertices([]);setError('');}}>Cancelar</button></div>
        </div>:<>
          <div className="intrap-zone-list">{zones.length===0?<p className="intrap-empty">Empezá por los ambientes que conocés. Lo que no clasifiques conserva la estimación regional.</p>:zones.map(z=><div className="intrap-zone" key={z.id}><i style={{background:COLORS[z.tipo]}}/><div><strong>{z.nombre}</strong><p>{TYPES[z.tipo]}{z.superficie_ha!=null?` · ${fmt(z.superficie_ha)} ha`:' · pendiente de calcular'}</p>{z.tipo==='ambiente'&&<p>{POSITIONS[z.posicion]??'Sin definir'}</p>}{z.tipo==='inaccesible'&&<p>{z.desde} → {z.hasta||'hasta nuevo aviso'} · {z.desde<=analysis.fecha&&(!z.hasta||analysis.fecha<=z.hasta)?'Vigente':'Fuera de vigencia'}</p>}</div><button disabled={busy||calculating} aria-label={`Editar ${z.nombre}`} onClick={()=>begin(z)}><Pencil size={15}/></button><button disabled={busy||calculating} aria-label={`Quitar ${z.nombre}`} onClick={()=>{setZones(old=>old.filter(x=>x.id!==z.id));setDirty(true);}}><Trash2 size={15}/></button></div>)}</div>
          <button className="app-button-primary w-full mt-4" disabled={busy||calculating||!dirty||data.sin_actualizar} onClick={save}>{busy||calculating?<LoaderCircle size={16} className="animate-spin"/>:<Save size={16}/>} {busy||calculating?'Actualizando…':'Guardar y actualizar cálculo'}</button>
          <p className="intrap-muted text-xs mt-3">El relieve no cambia el crecimiento base.</p>
          {!dirty&&!data.sin_actualizar&&(!summary||summary.pendiente_actualizar)&&<button className="app-button-secondary w-full mt-3" disabled={busy||calculating} onClick={recalculate}>Actualizar balance</button>}
        </>}
      </aside>
    </div>
    <section className="app-panel intrap-section"><h2>Distribución por zonas</h2><p className="intrap-muted">Distribución de la referencia base según la superficie. El relieve no aplica un coeficiente de crecimiento.</p><div className="intrap-table-wrap"><table><thead><tr><th>Ambiente</th><th>Superficie</th><th>Del potrero</th><th>Aporte al promedio</th></tr></thead><tbody>{analysis.configuracion.zonas.filter(z=>z.tipo==='ambiente').map(z=><tr key={z.id}><td>{z.nombre}<small>{POSITIONS[z.posicion]??'Sin definir'}</small></td><td>{fmt(z.superficie_ha)} ha</td><td>{fmt(z.porcentaje)} %</td><td>{fmt(z.aporte_mensual_kg_ms_ha_dia[month],2)} kg MS/ha/día</td></tr>)}<tr><td>Sin clasificar<small>Referencia regional</small></td><td>{fmt(analysis.superficie_sin_clasificar_ha)} ha</td><td>{fmt(100*analysis.superficie_sin_clasificar_ha/analysis.superficie_total_ha)} %</td><td>{fmt(analysis.referencia_base_mensual[month]==null?null:analysis.referencia_base_mensual[month]*analysis.superficie_sin_clasificar_ha/analysis.superficie_total_ha,2)} kg MS/ha/día</td></tr></tbody></table></div></section>

  </div>;
}
function Metric({title,value,unit,note,accent=false}) {return <div className={`app-panel intrap-metric${accent?' intrap-metric-accent':''}`}><span>{title}</span><div className="intrap-metric-value"><strong>{value}</strong><small>{unit}</small></div>{note&&<p>{note}</p>}</div>;}
