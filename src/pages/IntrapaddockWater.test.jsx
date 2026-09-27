import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it} from 'vitest';
import Water from './IntrapaddockWater.jsx';

const analysis={superficie_total_ha:10,configuracion:{zonas:[{id:'a',nombre:'Loma norte',tipo:'ambiente',posicion:'loma',superficie_ha:4}]},
 agua_relieve:{clima:{disponible:true,periodos:[{dias:7,desde:'2026-09-20',hasta:'2026-09-26',precipitacion_mm:7,et0_mm:21,balance_mm:-14,senal:'negativo'},
 {dias:30,desde:'2026-08-28',hasta:'2026-09-26',precipitacion_mm:120,et0_mm:90,balance_mm:30,senal:'positivo'}]},
 zonas:[{id:'a',estado_suelo:'Sin confirmar',explicacion_relieve:'Puede perder humedad antes.',contexto:'Lectura de 30 días.',efecto_posible:'No hay medición actual.',observacion:{estado:'seco',fecha:'2026-09-10'},observacion_del_dia:false}],
 fuentes:[{id:'fao56',titulo:'FAO-56',url:'https://www.fao.org/4/x0490e/x0490e0e.htm',alcance:'Transpiración, no crecimiento.'}]}};
it('switches climate windows without claiming soil moisture and distributes only the existing growth',async()=>{
 const user=userEvent.setup();render(<Water analysis={analysis} summary={{crecimiento_utilizable_total_kg_ms_dia:100}}/>);
 expect(screen.getByText(/Aporte base distribuido: 40 kg MS\/día/)).toBeInTheDocument();
 expect(screen.getByText(/Última observación, no confirma el estado actual/)).toHaveTextContent('2026-09-10');
 expect(screen.getByText(/La lluvia superó la demanda/)).toBeInTheDocument();
 await user.selectOptions(screen.getByLabelText('Período climático'),'7');
 expect(screen.getByText(/La demanda atmosférica superó la lluvia/)).toBeInTheDocument();
 await user.click(screen.getByText('Qué datos se usan, qué falta y documentos de respaldo'));
 expect(screen.getByRole('link',{name:'FAO-56'})).toHaveAttribute('href','https://www.fao.org/4/x0490e/x0490e0e.htm');
});
it('keeps missing weather distinct from zero and hides stale stock allocation',()=>{
 render(<Water analysis={{...analysis,agua_relieve:{...analysis.agua_relieve,clima:{disponible:false,mensaje:'Clima no disponible.'}}}} stale summary={{crecimiento_utilizable_total_kg_ms_dia:100}}/>);
 expect(screen.getByText('Clima no disponible.')).toBeInTheDocument();
 expect(screen.queryByLabelText('Período climático')).not.toBeInTheDocument();
 expect(screen.queryByText(/Aporte base distribuido/)).not.toBeInTheDocument();
 expect(screen.getByRole('status')).toHaveTextContent('no actualizada');
});
