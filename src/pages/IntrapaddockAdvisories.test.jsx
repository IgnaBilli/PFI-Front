import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
import Advisories from './IntrapaddockAdvisories.jsx';
import {weatherPeriod,zoneAdvisory} from './intrapaddockAdvisories.js';
const day='2026-09-29';
const zone={id:'a',nombre:'Loma norte',tipo:'ambiente',posicion:'loma'};
const analysis={fecha:day,configuracion:{zonas:[zone]},agua_relieve:{clima:{disponible:true,periodos:[
 {dias:30,desde:'2026-08-30',hasta:'2026-09-28',precipitacion_mm:20,et0_mm:100},
 {dias:7,desde:'2026-09-22',hasta:'2026-09-28',precipitacion_mm:40,et0_mm:10}
]}}};
it('uses each selected complete period and opens the correct zone editor without mutation',async()=>{
 const edit=vi.fn(),user=userEvent.setup(),before=JSON.stringify(analysis);
 render(<Advisories analysis={analysis} onEditSoil={edit}/>);
 expect(screen.getByText('Revisar posible falta de agua')).toBeInTheDocument();
 expect(screen.getByText(/Llovió menos/)).toBeInTheDocument();
 expect(screen.queryByText('Crecimiento estimado')).not.toBeInTheDocument();
 await user.selectOptions(screen.getByLabelText('Período de los avisos'),'7');
 expect(screen.getByText('Comprobar drenaje de la loma')).toBeInTheDocument();
 expect(screen.getByText(/Llovió más/)).toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'Actualizar estado del suelo de Loma norte'}));
 expect(edit).toHaveBeenCalledWith(zone);expect(JSON.stringify(analysis)).toBe(before);
});
it('defines all relief × weather combinations without growth coefficients',()=>{
 const expected={loma:['Revisar posible falta de agua','Comprobar drenaje de la loma'],media_loma:['Revisar reserva de humedad','Revisar acumulación de agua'],bajo:['Comprobar humedad del bajo','Revisar posible anegamiento']};
 for(const position of Object.keys(expected)) for(const [i,signal] of [-1,1].entries()) {
  const a=zoneAdvisory({...zone,posicion:position},{signal},day);
  expect(a.title).toBe(expected[position][i]);expect(a.sources).toContain('di_bella2016');
  expect(a).not.toHaveProperty('factor');
 }
 expect(zoneAdvisory({...zone,posicion:'sin_definir'},{signal:1},day).rule).toBe('relieve_sin_definir');
 expect(zoneAdvisory(zone,{signal:0},day).rule).toBe('sin_senal_climatica');
});
it('current observations override climatic suggestions for every relief; previous observations do not',()=>{
 for(const posicion of ['loma','media_loma','bajo','sin_definir']) for(const estado of ['seco','humedo','anegado']) {
  const z={...zone,posicion,observacion_hidrica:{estado,fecha:day}};
  for(const p of [null,{signal:-1},{signal:1}])expect(zoneAdvisory(z,p,day).rule).toBe(`observado_${estado}`);
  expect(zoneAdvisory(z,null,'2026-09-30').observedToday).toBe(false);
  expect(zoneAdvisory(z,null,day,true).rule).toBe('analisis_desactualizado');
 }
});
it('missing or outdated weather is not zero rainfall, and zero rainfall remains valid',()=>{
 const absent=structuredClone(analysis);absent.agua_relieve.clima.periodos[0].et0_mm=null;
 expect(weatherPeriod(absent,30)).toBeNull();
 const old=structuredClone(analysis);old.fecha='2026-09-30';expect(weatherPeriod(old,30)).toBeNull();
 expect(weatherPeriod(analysis,30,true)).toBeNull();
 const zero=structuredClone(analysis);zero.agua_relieve.clima.periodos[0].precipitacion_mm=0;
 expect(weatherPeriod(zero,30).signal).toBe(-100);
 for(const invalid of [NaN,Infinity,-1,'20']){zero.agua_relieve.clima.periodos[0].precipitacion_mm=invalid;expect(weatherPeriod(zero,30)).toBeNull();}
});
it('stale analysis disables action and never presents old observations as current',()=>{
 const a={...analysis,configuracion:{zonas:[{...zone,observacion_hidrica:{estado:'anegado',fecha:day}}]}};
 render(<Advisories analysis={a} stale onEditSoil={()=>{}}/>);
 expect(screen.getByText('Análisis sin actualizar')).toBeInTheDocument();
 expect(screen.getByText(/No confirma el estado actual/)).toBeInTheDocument();
 expect(screen.queryByText('Revisar anegamiento y acceso')).not.toBeInTheDocument();
 expect(screen.getByRole('button')).toBeDisabled();
});
it('shows only productive zones, supports absent climate, empty and legacy analyses',()=>{
 const {rerender}=render(<Advisories analysis={{fecha:day,configuracion:{zonas:[zone,{id:'w',nombre:'Laguna',tipo:'aguada'}]}}}/>);
 expect(screen.getByText('Sin datos suficientes')).toBeInTheDocument();
 expect(screen.queryByText('Laguna')).not.toBeInTheDocument();
 expect(within(screen.getByRole('article')).getByText('Loma')).toBeInTheDocument();
 rerender(<Advisories analysis={{}}/>);
 expect(screen.getByText(/Agregá una zona/)).toBeInTheDocument();
});
