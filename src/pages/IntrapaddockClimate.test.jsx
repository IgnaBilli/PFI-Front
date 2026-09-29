import {render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import Climate from './IntrapaddockClimate.jsx';
const analysis={comparacion_climatica:{cobertura:{provincias:['Corrientes']}}};
const comparison={estado:'comparacion_disponible',referencia_kg_ms_ha_dia:10,diferencia_porcentual:20,fecha_referencia:'2026-09-30',fecha:'2026-10-02',provisional:true};
it('shows the saved reference and real adjustment without a fictitious alternative',()=>{
 render(<Climate analysis={analysis} summary={{crecimiento_bruto_kg_ms_ha_dia:12,comparacion_crecimiento:comparison}}/>);
 expect(screen.getByText('Referencia regional')).toBeInTheDocument();
 expect(screen.getByText('+20 %')).toBeInTheDocument();
 expect(screen.getByText(/Referencia del 30\/09\/2026/)).toHaveTextContent('Tasa proyectada al 02/10/2026');
 expect(screen.queryByText('No disponible')).not.toBeInTheDocument();
 expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('preserves base without inventing a percentage when trace is missing in any target province',()=>{
 const {rerender}=render(<Climate analysis={analysis} summary={{crecimiento_bruto_kg_ms_ha_dia:10}}/>);
 for(const province of ['Corrientes','Chaco','Formosa','Misiones','Buenos Aires']) {
  rerender(<Climate analysis={{comparacion_climatica:{cobertura:{provincias:[province]}}}} summary={{crecimiento_bruto_kg_ms_ha_dia:10}}/>);
  expect(screen.getByText(/falta una referencia trazable/)).toBeInTheDocument();
  expect(screen.queryByText(/Variación respecto/)).not.toBeInTheDocument();
 }
});
it('does not present stale or pending values as current',()=>{
 const {rerender}=render(<Climate analysis={analysis} summary={{crecimiento_bruto_kg_ms_ha_dia:999,comparacion_crecimiento:comparison}} stale/>);
 expect(screen.getByText('Sin datos')).toBeInTheDocument();
 expect(screen.queryByText(/999/)).not.toBeInTheDocument();
 expect(screen.getByRole('status')).toHaveTextContent('sin actualizar');
 rerender(<Climate analysis={analysis} summary={{crecimiento_bruto_kg_ms_ha_dia:999,comparacion_crecimiento:comparison,pendiente_actualizar:true}}/>);
 expect(screen.queryByText('+20 %')).not.toBeInTheDocument();
});
it('supports older saved analysis and avoids a percentage at zero reference',()=>{
 const {container,rerender}=render(<Climate analysis={{}}/>);
 expect(container).toBeEmptyDOMElement();
 rerender(<Climate analysis={analysis} summary={{crecimiento_bruto_kg_ms_ha_dia:0,comparacion_crecimiento:{...comparison,referencia_kg_ms_ha_dia:0,diferencia_porcentual:null}}}/>);
 expect(screen.queryByText(/Variación respecto/)).not.toBeInTheDocument();
});
