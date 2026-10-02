import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Beef, CheckCircle2, GitBranch, Leaf, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import './rotation.css';

const fmt=value=>value==null?'—':Number(value).toLocaleString('es-AR',{maximumFractionDigits:1});
const labels={EXCESO:'Exceso de carga',DISPONIBLE:'Con disponibilidad',EQUILIBRADO:'Sin margen adicional',SIN_DATOS:'Actualizar datos',EXCLUIDO:'Fuera del análisis'};

export default function RotationPage(){
  const {estanciaId}=useAuth();
  const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const base=`/estancia/${estanciaId}/rotacion`;
  useEffect(()=>{
    let active=true,timer;
    setData(null);setError('');
    const load=async()=>{
      try{const next=await api.get(base);if(!active)return;setData(next);timer=setTimeout(load,next.refreshing?3000:30000);}
      catch(e){if(active){setError(e.message);timer=setTimeout(load,10000);}}
    };
    load();return()=>{active=false;clearTimeout(timer);};
  },[base]);
  async function refresh(){setBusy(true);setError('');try{await api.post(`${base}/refresh`,{});setData(await api.get(base));}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function toggle(p){
    setBusy(true);setError('');const excluded=data.paddocks.filter(x=>!x.included&&x.id!==p.id).map(x=>x.id);if(p.included)excluded.push(p.id);
    try{await api.put(`${base}/availability`,{revision:data.revision,excluded});setData(await api.get(base));}
    catch(e){setError(e.message);setData(await api.get(base).catch(()=>data));}finally{setBusy(false);}
  }
  const updating=busy||data?.refreshing;
  return <div className="app-page rot-simple">
    <header className="rot-simple-heading"><div><p className="rot-simple-eyebrow">DISTRIBUCIÓN DEL GANADO</p><h1 className="app-page-title">Rotación</h1><p>Qué potreros necesitan aliviar su carga y dónde hay lugar para recibir ganado.</p></div><button className="app-button-primary" disabled={!data||updating||!data.paddocks.some(p=>p.included)} onClick={refresh}><RefreshCw size={17} className={updating?'rot-simple-spin':''}/>{updating?'Actualizando…':'Actualizar datos'}</button></header>
    {error&&<p className="rot-simple-error" role="alert">{error}</p>}
    {!data?<p role="status">Revisando los potreros…</p>:<>
      <div className="rot-simple-period"><span>Proyección a {data.horizon} días</span><span>Desde {data.start} · consumo promedio por potrero</span></div>
      <div className="rot-simple-metrics"><div><Leaf size={19}/><span>Potreros con exceso</span><strong>{data.totals.excessPaddocks}</strong></div><div><Beef size={19}/><span>Animales a redistribuir · aprox.</span><strong>{data.totals.toMove}</strong></div><div><GitBranch size={19}/><span>Con destino disponible</span><strong>{data.totals.allocated}</strong></div></div>
      <section aria-labelledby="rotation-suggestions"><h2 id="rotation-suggestions">Movimientos recomendados</h2>
        {data.partial&&<p className="rot-simple-notice">Análisis parcial: los potreros sin datos vigentes quedan fuera del cálculo. Usá “Actualizar datos” para completar el análisis.</p>}
        {data.refreshing&&<p className="rot-simple-notice" role="status">Actualizando pasto y consumo. Las recomendaciones se recalculan al terminar.</p>}
        {data.recommendations.length===0&&<div className="rot-simple-empty"><CheckCircle2 size={28}/><div><h3>{!data.paddocks.length?'Todavía no hay potreros':data.paddocks.every(p=>!p.included)?'Todos los potreros están excluidos':data.partial?'Faltan datos para completar la comparación':'No se recomienda retirar ganado'}</h3><p>{data.partial?'Podés ver qué falta en cada potrero.':data.paddocks.every(p=>!p.included)?'Incluí al menos un potrero para analizarlo.':'Con los datos actuales, la carga de los potreros incluidos entra en la disponibilidad estimada para este período.'}</p></div></div>}
        {data.recommendations.map(r=><article className="rot-simple-recommendation" key={r.origin}><div className="rot-simple-source"><span className="rot-simple-badge EXCESO">Exceso de carga</span><h3>{r.name}</h3><p>Retirar aproximadamente <strong>{r.remove} {r.remove===1?'animal':'animales'}</strong>.</p><p className="rot-simple-muted">El consumo supera la capacidad estimada en {fmt(r.excess)} kg MS/día{r.excessPercent!=null?` (${fmt(r.excessPercent)}% de exceso).`:'. No hay capacidad disponible para sostener la carga actual.'}</p></div><div className="rot-simple-destinations">{r.destinations.map(d=><div className="rot-simple-destination" key={d.id}><ArrowRight size={18}/><span>{d.name}</span><strong>{d.quantity} {d.quantity===1?'animal':'animales'}</strong></div>)}{r.unallocated>0&&<p className="rot-simple-notice">{r.unallocated} {r.unallocated===1?'animal queda':'animales quedan'} sin destino con capacidad suficiente. No se fuerza una distribución que sobrecargue otro potrero.</p>}<Link to={`/potreros/${r.origin}`} className="rot-simple-link">Ver potrero de origen <ArrowRight size={14}/></Link></div></article>)}
      </section>
      <section className="rot-simple-paddocks" aria-labelledby="rotation-paddocks"><div className="rot-simple-section-heading"><h2 id="rotation-paddocks">Tus potreros</h2><p>Excluí los que no querés considerar.</p></div><div className="rot-simple-cards">{data.paddocks.map(p=><article key={p.id} className={`rot-simple-card ${!p.included?'is-excluded':''}`}><div className="rot-simple-card-heading"><Link to={`/potreros/${p.id}`}><h3>{p.name}</h3></Link><label><input type="checkbox" aria-label={`Incluir ${p.name}`} checked={p.included} disabled={updating} onChange={()=>toggle(p)}/>Incluir</label></div><span className={`rot-simple-badge ${p.status}`}>{labels[p.status]}</span><dl><div><dt>Ganado actual</dt><dd>{fmt(p.animals)} animales</dd></div><div><dt>Saldo de pasto estimado</dt><dd>{fmt(p.stock)} kg MS</dd></div><div><dt>Consumo del potrero</dt><dd>{fmt(p.demand)} kg MS/día</dd></div><div><dt>Crecimiento utilizable</dt><dd>{fmt(p.growth)} kg MS/día</dd></div></dl>{p.included&&p.issues.length>0&&<p className="rot-simple-muted">{p.issues[0]}</p>}{p.included&&p.job?.error&&<p className="rot-simple-error">No se pudo actualizar: {p.job.error}</p>}{p.included&&p.stock<0&&<p className="rot-simple-notice">El saldo negativo indica un déficit acumulado. No se cuenta como pasto disponible.</p>}{p.included&&p.capacity!=null&&<div className="rot-simple-after"><span>Con la distribución sugerida</span><strong>{p.projectedAnimals} animales</strong><small>{p.remainingExcess>0?`Quedan ${fmt(p.remainingExcess)} kg MS/día de exceso`:'Carga dentro del presupuesto estimado'}</small></div>}</article>)}</div></section>
      <details className="rot-simple-method"><summary>Cómo se calcula</summary><p>Se compara el consumo total de cada potrero con su saldo de pasto utilizable y el crecimiento proyectado durante {data.horizon} días. La cantidad a retirar se estima usando el consumo promedio del potrero de origen. La capacidad de cada destino se comparte entre todas las recomendaciones, sin contar el mismo espacio dos veces.</p><p>Se usa el saldo al cierre de hoy; cuando hay ambientes registrados, se considera la superficie accesible compatible con ese balance. Un saldo negativo representa déficit acumulado: para proyectar disponibilidad inicial se toma cero. El crecimiento se mantiene constante durante la proyección. No se asegura recuperación del pasto ni se evalúan agua, acceso o compatibilidad del ganado; excluí los potreros que no sean aptos.</p></details>
      <p className="rot-simple-footer">Cantidades aproximadas según el consumo promedio. Revisá qué ganado mover antes de actuar. Esta pantalla recomienda; no registra traslados.</p>
    </>}
  </div>;
}
