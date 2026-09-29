import {render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import Climate from './IntrapaddockClimate.jsx';

const comparison={cobertura:{provincias:['Misiones']},mensaje:'Se conserva el crecimiento actual: falta un modelo climático validado para este potrero.',periodo_climatico:{desde:'2026-08-30',hasta:'2026-09-28',precipitacion_mm:117.6,temperatura_media_c:18.5}};
it('shows actual gross growth without fabricating an alternative or percentage',()=>{
  render(<Climate analysis={{comparacion_climatica:comparison}} summary={{crecimiento_bruto_kg_ms_ha_dia:10}}/>);
  expect(screen.getByText(/Misiones/)).toBeInTheDocument();
  expect(screen.getByText('No disponible')).toBeInTheDocument();
  expect(screen.getByText(/falta un modelo/)).toBeInTheDocument();
  expect(screen.getByText(/117,6 mm/)).toHaveTextContent('18,5 °C');
  expect(screen.queryByText(/0%/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('does not present stale or pending growth as current',()=>{
  const {rerender}=render(<Climate analysis={{comparacion_climatica:comparison}} summary={{crecimiento_bruto_kg_ms_ha_dia:999}} stale/>);
  expect(screen.getByText('Sin datos')).toBeInTheDocument();
  expect(screen.queryByText(/999/)).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('sin actualizar');
  rerender(<Climate analysis={{comparacion_climatica:{...comparison,periodo_climatico:null}}} summary={{crecimiento_bruto_kg_ms_ha_dia:999,pendiente_actualizar:true}}/>);
  expect(screen.queryByText(/999/)).not.toBeInTheDocument();
  expect(screen.queryByText(/117,6/)).not.toBeInTheDocument();
});
it('is compatible with an older saved analysis',()=>{
  const {container}=render(<Climate analysis={{}}/>);
  expect(container).toBeEmptyDOMElement();
});
