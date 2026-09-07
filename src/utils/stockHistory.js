export function dailyStockPoints(history) {
  const dates=new Map();
  const timestamp=value=>{const s=String(value??'');return Date.parse(/Z$|[+-]\d\d:\d\d$/.test(s)?s:s.replace(' ','T')+'Z')||0;};
  for(const item of history) {
    const date=String(item.fecha_objetivo??'').slice(0,10), t=Date.parse(date+'T12:00:00-03:00'), raw=item.stock_final_central_kg_ms_ha;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==date||raw==null||!Number.isFinite(Number(raw))||Number(raw)<0) continue;
    const old=dates.get(date);
    if(!old||timestamp(item.fecha_calculo)>timestamp(old.item.fecha_calculo)||(timestamp(item.fecha_calculo)===timestamp(old.item.fecha_calculo)&&Number(item.id_estimacion_stock)>Number(old.item.id_estimacion_stock))) dates.set(date,{item,t,value:Number(raw)});
  }
  return [...dates.values()].sort((a,b)=>a.t-b.t).map(({t,value})=>({t,value}));
}
