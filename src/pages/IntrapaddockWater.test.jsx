import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it} from 'vitest';
import Water from './IntrapaddockWater.jsx';

const analysis={agua_relieve:{clima:{disponible:true,periodos:[
  {dias:7,desde:'2026-09-20',hasta:'2026-09-26',precipitacion_mm:7},
  {dias:30,desde:'2026-08-28',hasta:'2026-09-26',precipitacion_mm:120}
]}}};

it('shows rainfall for the selected complete period without claiming soil reserves',async()=>{
  const user=userEvent.setup();render(<Water analysis={analysis}/>);
  expect(screen.getByText('120')).toBeInTheDocument();
  expect(screen.getByText(/2026-08-28 → 2026-09-26/)).toBeInTheDocument();
  expect(screen.getByText(/no cuánta agua queda en el suelo/)).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Período de lluvia'),'7');
  expect(screen.getByText('7')).toBeInTheDocument();
  expect(screen.getByText(/2026-09-20 → 2026-09-26/)).toBeInTheDocument();
});

it('does not present missing or stale rainfall as a current zero',()=>{
  const {rerender}=render(<Water analysis={{agua_relieve:{clima:{disponible:false}}}} stale/>);
  expect(screen.getByText('Lluvia no disponible para este período.')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('no actualizada');
  expect(screen.queryByText('0')).not.toBeInTheDocument();
  rerender(<Water analysis={{agua_relieve:{clima:{disponible:true,periodos:[{dias:30,precipitacion_mm:null}]}}}}/>);
  expect(screen.getByText('Lluvia no disponible para este período.')).toBeInTheDocument();
  rerender(<Water analysis={{agua_relieve:{clima:{disponible:true,periodos:[{dias:30,precipitacion_mm:0}]}}}}/>);
  expect(screen.getByText('0')).toBeInTheDocument();
  expect(screen.queryByText('Lluvia no disponible para este período.')).not.toBeInTheDocument();
});
