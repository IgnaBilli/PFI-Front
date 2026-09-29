// Qualitative screening rules, not calibrated growth/drought predictions.
// Scientific scope and every rule are documented in docs/agua-relieve.html.
export const ADVISORY_VERSION='agua_relieve_avisos_v1';
export const RELIEF_LABELS={loma:'Loma',media_loma:'Media loma',bajo:'Bajo',sin_definir:'Sin definir'};

export function weatherPeriod(analysis,days,stale=false) {
  if(stale||!analysis.agua_relieve?.clima?.disponible)return null;
  const p=analysis.agua_relieve.clima.periodos?.find(p=>p.dias===days);
  if(!p||![p.precipitacion_mm,p.et0_mm].every(v=>Number.isFinite(v)&&v>=0))return null;
  // The service requires complete series; a cached period must still end yesterday.
  const end=Date.parse(`${analysis.fecha}T00:00:00Z`)-86400000;
  if(!Number.isFinite(end)||p.hasta!==new Date(end).toISOString().slice(0,10))return null;
  const start=end-(days-1)*86400000;
  if(p.desde!==new Date(start).toISOString().slice(0,10))return null;
  return {...p,signal:Math.round((p.precipitacion_mm-p.et0_mm)*10)/10};
}

export function zoneAdvisory(zone,period,date,stale=false) {
  const result={version:ADVISORY_VERSION,rule:'sin_datos',title:'Sin datos suficientes',
    message:'Actualizá el estado del suelo para evaluar posibles limitaciones al crecimiento.',
    sources:['fao56'],observedToday:false};
  if(stale)return {...result,rule:'analisis_desactualizado',title:'Análisis sin actualizar',message:'Recargá el análisis antes de interpretar esta zona.'};
  const observation=zone.observacion_hidrica;
  if(observation?.fecha===date&&['seco','humedo','anegado'].includes(observation.estado)) {
    const states={
      seco:['Posible limitación por falta de agua','El suelo fue observado seco. La falta de agua podría reducir el crecimiento; comprobá el estado del pasto.'],
      humedo:['Humedad observada','Se observó humedad sin agua en superficie. Esto no confirma crecimiento óptimo; también influyen temperatura, suelo y vegetación.'],
      anegado:['Revisar anegamiento y acceso','Se observó agua en superficie. El efecto sobre el crecimiento depende de la vegetación y de cuánto dure. Si impide pastorear, marcá un sector inaccesible.'],
    };
    const [title,message]=states[observation.estado];
    return {...result,rule:`observado_${observation.estado}`,title,message,observedToday:true,
      sources:observation.estado==='anegado'?['loreti1996']:['fao56']};
  }
  const position=zone.posicion;
  if(!['loma','media_loma','bajo'].includes(position))return {...result,rule:'relieve_sin_definir',message:'Definí el relieve y observá el suelo para orientar el aviso.'};
  if(!period)return result;
  if(period.signal===0)return {...result,rule:'sin_senal_climatica',message:'Lluvia y demanda de referencia son similares. Observá el suelo: esto no confirma ausencia de estrés.'};
  const negative={
    loma:['Revisar posible falta de agua','Si drena bien, la loma puede perder humedad antes. Revisá si el suelo está seco y si el pasto crece menos.'],
    media_loma:['Revisar reserva de humedad','Puede conservar humedad más tiempo que una loma, según el suelo. Comprobá si la reserva alcanza para el pasto.'],
    bajo:['Comprobar humedad del bajo','Un bajo puede conservar agua, pero también secarse. Revisá el suelo antes de asumir que el crecimiento está protegido.'],
  };
  const positive={
    loma:['Comprobar drenaje de la loma','Puede evacuar agua con mayor facilidad si el suelo drena bien. La lluvia no garantiza humedad suficiente ni más crecimiento.'],
    media_loma:['Revisar acumulación de agua','Si el drenaje es lento, puede acumular agua. Comprobá su permanencia y el estado del pasto.'],
    bajo:['Revisar posible anegamiento','Puede recibir agua de sectores altos y retenerla. Comprobá si hay agua en superficie; no implica menor crecimiento por sí solo.'],
  };
  const [title,message]=(period.signal<0?negative:positive)[position];
  return {...result,rule:`${position}_${period.signal<0?'lluvia_menor':'lluvia_mayor'}`,title,message,sources:['di_bella2016','fao56','loreti1996']};
}
