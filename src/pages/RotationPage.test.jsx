import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,expect,it,vi} from 'vitest';
import Page from './RotationPage';
import {api} from '../services/api';
vi.mock('../context/AuthContext',()=>({useAuth:()=>({estanciaId:1})}));
vi.mock('../services/api',()=>({api:{get:vi.fn(),post:vi.fn(),put:vi.fn()}}));
const initial={revision:2,horizon:7,start:'2026-10-02',partial:false,refreshing:false,totals:{excessPaddocks:1,toMove:10,allocated:6,pending:4},recommendations:[{origin:1,name:'El Molino',remove:10,allocated:6,unallocated:4,excess:100,excessPercent:100,destinations:[{id:2,name:'La Loma',quantity:6}]}],paddocks:[{id:1,name:'El Molino',animals:20,stock:700,demand:200,growth:0,included:true,status:'EXCESO',issues:[],job:{},capacity:100,projectedAnimals:14,remainingExcess:40},{id:2,name:'La Loma',animals:0,stock:420,demand:0,growth:0,included:true,status:'DISPONIBLE',issues:[],job:{},capacity:60,projectedAnimals:6,remainingExcess:0}]};
const view=()=>render(<MemoryRouter><Page/></MemoryRouter>);
beforeEach(()=>{vi.clearAllMocks();api.get.mockResolvedValue(structuredClone(initial));});
it('shows fuzzy priority without presenting its score as accuracy or adding inputs',async()=>{
 const data=structuredClone(initial);data.recommendations[0].priority={level:'ALTA',score:90,explanation:'Reserva corta.'};api.get.mockResolvedValue(data);
 view();expect(await screen.findByText('Prioridad Alta')).toHaveAttribute('title','Reserva corta.');
 expect(screen.queryByText('90%')).not.toBeInTheDocument();expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
});
it('shows quantities, destinations and unmet capacity without group forms or execution',async()=>{
 view();expect(await screen.findByText('10 animales')).toBeInTheDocument();expect(screen.getByText(/4 animales quedan/)).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Crear grupo'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Aceptar plan'})).not.toBeInTheDocument();
 expect(screen.getAllByRole('checkbox')).toHaveLength(2);expect(screen.getByText(/no registra traslados/)).toBeInTheDocument();
});
it('excluding a paddock persists only availability and recalculates the comparison',async()=>{
 const user=userEvent.setup();view();await user.click(await screen.findByRole('checkbox',{name:'Incluir La Loma'}));
 await waitFor(()=>expect(api.put).toHaveBeenCalledWith('/estancia/1/rotacion/availability',{revision:2,excluded:[2]}));
 expect(api.post).not.toHaveBeenCalled();
});
it('refresh starts existing aggregate calculations without asking for manual forage',async()=>{
 const user=userEvent.setup();view();await user.click(await screen.findByRole('button',{name:'Actualizar datos'}));
 expect(api.post).toHaveBeenCalledWith('/estancia/1/rotacion/refresh',{});expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
});
it('incomplete data never claims all paddocks are safe',async()=>{
 api.get.mockResolvedValue({...initial,partial:true,recommendations:[],paddocks:initial.paddocks.map(p=>({...p,status:'SIN_DATOS',issues:['Actualizá el análisis de pasto.']}))});
 view();expect(await screen.findByText(/Faltan datos para completar/)).toBeInTheDocument();expect(screen.queryByText('No se recomienda retirar ganado')).not.toBeInTheDocument();
});
it('shows a preventive warning separately without proposing a transfer',async()=>{
 const w={origin:2,name:'La Loma',dailyDeficit:20,marginDays:100,priority:{level:'BAJA',explanation:'Margen mayor a 14 días.'}};
 api.get.mockResolvedValue({...initial,recommendations:[],warnings:[w]});view();
 expect(await screen.findByRole('heading',{name:'Avisos preventivos'})).toBeInTheDocument();
 expect(screen.getByText('Prioridad Baja')).toBeInTheDocument();
 expect(screen.getByText(/todavía no se recomienda retirar ganado/)).toBeInTheDocument();
 expect(screen.queryByText(/Retirar aproximadamente/)).not.toBeInTheDocument();
});
