import {useState} from 'react';
import {api} from '../services/api';
import {bulkUpdateCategory} from '../services/cattleService';
import './rotationManagement.css';

const names={TERNERO:'Terneros',VAQUILLONA:'Vaquillonas',NOVILLO:'Novillos',VACA:'Vacas',TORO:'Toros'};
function useManagement(estanciaId){
  const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const base=`/estancia/${estanciaId}/rotacion/management`;
  async function load(){setError('');try{setData(await api.get(base));}catch(e){setError(e.message);}}
  async function save(management){setBusy(true);setError('');try{await api.put(base,{revision:data.revision,management});await load();return true;}catch(e){setError(e.message);return false;}finally{setBusy(false);}}
  return {data,error,busy,load,save,setError};
}
export function PaddockManagement({estanciaId,paddockId}){
  const {data,error,busy,load,save}=useManagement(estanciaId);
  const [policy,setPolicy]=useState(null),[saved,setSaved]=useState(false);
  const current=policy||data?.management.paddocks[paddockId]||{categories:Object.keys(names),service:false};
  return <details className="rotation-management" onToggle={e=>{if(e.currentTarget.open){setPolicy(null);setSaved(false);load();}}}>
    <summary>Reglas de manejo</summary>
    {error&&<p role="alert" className="app-error">{error}</p>}
    {data&&<div className="management-body"><fieldset disabled={busy}><legend>Categorías que puede recibir</legend><div className="management-options">{Object.entries(names).map(([key,label])=><label key={key}><input type="checkbox" checked={current.categories.includes(key)} onChange={e=>{setSaved(false);setPolicy({...current,categories:e.target.checked?[...current.categories,key]:current.categories.filter(c=>c!==key)});}}/>{label}</label>)}</div>
      <label><input type="checkbox" checked={current.service} onChange={e=>{setSaved(false);setPolicy({...current,service:e.target.checked});}}/>Permitir servicio reproductivo (toros con vacas o vaquillonas)</label></fieldset>
      <button className="app-button-secondary" disabled={busy} onClick={async()=>{if(await save({...data.management,paddocks:{...data.management.paddocks,[paddockId]:current}})){setPolicy(null);setSaved(true);}}}>{busy?'Guardando…':'Guardar reglas'}</button>{saved&&<span role="status">Reglas guardadas</span>}
    </div>}
  </details>;
}

export function CattleManagement({estanciaId,selectedIds=[],onChanged}){
  const {data,error,busy,load,save,setError}=useManagement(estanciaId);
  const [form,setForm]=useState({name:'',motherCalf:false,isolated:false,allowSplit:false}),[editing,setEditing]=useState(null);
  const [condition,setCondition]=useState(''),[working,setWorking]=useState(false),[message,setMessage]=useState('');
  const update=(key,value)=>{setForm({...form,[key]:value,...(key==='motherCalf'&&value?{allowSplit:false}:{})});setMessage('');};
  async function submit(){
    const previous=data.management.groups.find(g=>g.id===editing);
    const animalIds=selectedIds.length?selectedIds.map(Number):previous?.animalIds||[];
    if(!animalIds.length||!form.name.trim()){setError('Seleccioná ganado y escribí un nombre para el grupo.');return;}
    const id=editing||`group:${crypto.randomUUID()}`;
    if(await save({...data.management,groups:[...data.management.groups.filter(g=>g.id!==id),{...form,id,animalIds}]})){
      setForm({name:'',motherCalf:false,isolated:false,allowSplit:false});setEditing(null);setMessage('Grupo guardado.');
    }
  }
  async function applyCondition(){
    if(!selectedIds.length||condition.trim()===''||!Number.isFinite(Number(condition))||Number(condition)<1||Number(condition)>5){setError('Seleccioná ganado e indicá una condición entre 1 y 5.');return;}
    setWorking(true);setError('');setMessage('');
    try{await bulkUpdateCategory(selectedIds.map(id=>({id_ganado:Number(id),condicion_corporal:Number(condition)})));await onChanged?.();await load();setMessage('Condición guardada. Actualizá los datos en Rotación.');}catch(e){setError(e.message);}finally{setWorking(false);}
  }
  return <details className="rotation-management" onToggle={e=>{if(e.currentTarget.open)load();}}><summary>Grupos y condición corporal</summary>
    {error&&<p role="alert" className="app-error">{error}</p>}{message&&<p role="status">{message}</p>}
    {data&&<div className="management-body"><p>{selectedIds.length} animales seleccionados en la tabla.</p>
      <div className="management-options"><label>Condición corporal (1–5)<input type="number" min="1" max="5" step="0.1" value={condition} onChange={e=>setCondition(e.target.value)}/></label><button className="app-button-secondary" disabled={working||busy||!selectedIds.length} onClick={applyCondition}>Aplicar a seleccionados</button></div>
      <fieldset disabled={busy||working}><legend>{editing?'Editar grupo':'Crear grupo con los seleccionados'}</legend>
        <label>Nombre<input maxLength={80} value={form.name} onChange={e=>update('name',e.target.value)}/></label>
        <div className="management-options"><label><input type="checkbox" checked={form.motherCalf} onChange={e=>update('motherCalf',e.target.checked)}/>Madres con sus crías</label><label><input type="checkbox" checked={form.isolated} onChange={e=>update('isolated',e.target.checked)}/>Mantener separado de otros grupos</label><label><input type="checkbox" disabled={form.motherCalf} checked={form.allowSplit} onChange={e=>update('allowSplit',e.target.checked)}/>Permitir dividir el grupo</label></div>
        <button className="app-button-secondary" onClick={submit}>{busy?'Guardando…':'Guardar grupo'}</button>{editing&&<button className="app-button-secondary" onClick={()=>{setEditing(null);setForm({name:'',motherCalf:false,isolated:false,allowSplit:false});}}>Cancelar edición</button>}
      </fieldset>
      <p className="management-note">Sin un grupo definido, se agrupa por categoría dentro de cada potrero. Los grupos se mantienen juntos salvo que habilites dividirlos.</p>
      <div className="management-group-list">{data.groups.map(g=><div className="management-group" key={g.id}><div><strong>{names[g.name]||g.name}</strong><small>{g.animals.length} animales · {g.originName}{g.motherCalf?' · madre-cría':''}{g.isolated?' · separado':''}</small></div>
        <label><input type="checkbox" checked={g.allowSplit} disabled={busy||g.motherCalf} onChange={e=>save(g.manual?{...data.management,groups:data.management.groups.map(x=>x.id===g.configId?{...x,allowSplit:e.target.checked}:x)}:{...data.management,split:{...data.management.split,[g.configId]:e.target.checked}})}/>Permitir dividir</label>
        {g.manual&&<><button className="app-button-secondary" onClick={()=>{const original=data.management.groups.find(x=>x.id===g.configId);setEditing(g.configId);setForm({name:original.name,motherCalf:original.motherCalf,isolated:original.isolated,allowSplit:original.allowSplit});}}>Editar</button><button className="app-button-secondary" disabled={busy} onClick={()=>save({...data.management,groups:data.management.groups.filter(x=>x.id!==g.configId)})}>Desarmar grupo</button></>}
      </div>)}</div>
    </div>}
  </details>;
}

