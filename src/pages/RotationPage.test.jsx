import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,expect,it,vi} from 'vitest';
import Page from './RotationPage';
import {api} from '../services/api';
vi.mock('../context/AuthContext',()=>({useAuth:()=>({estanciaId:1})}));
vi.mock('../services/api',()=>({api:{get:vi.fn(),post:vi.fn(),put:vi.fn(),patch:vi.fn()}}));
const initial={start:'2026-10-01',revision:1,local:true,fingerprint:'fresh',plans:[],rules:{rules:[]},diagnostic:{issues:[]},animals:[],paddocks:[{id_potrero:1,nombre:'Norte',superficie_ha:10}],config:{horizon:14,conservative:false,groups:[],paddocks:{1:{water:false,rest:5,max_stay:4,reserve_ha:20}}}};
beforeEach(()=>{vi.clearAllMocks();api.get.mockResolvedValue(structuredClone(initial));});
it('new groups keep animals together by default and dirty edits disable generation',async()=>{
 const user=userEvent.setup();render(<Page/>);
 await user.click(await screen.findByRole('button',{name:'Grupos',exact:true}));await user.click(screen.getByRole('button',{name:'Crear grupo'}));
 expect(screen.getByLabelText('Permitir dividir en animales individuales')).not.toBeChecked();
 expect(screen.getByRole('button',{name:'Generar propuesta'})).toBeDisabled();
 await user.click(screen.getByRole('button',{name:'Descartar cambios'}));expect(screen.getByRole('button',{name:'Generar propuesta'})).toBeEnabled();
});
it('unsaved rules cannot be lost by registering forage; save conflicts retain edits',async()=>{
 const user=userEvent.setup();render(<Page/>);await user.click(await screen.findByRole('button',{name:'Reglas y potreros'}));
 await user.clear(screen.getByLabelText('Horizonte (días)'));await user.type(screen.getByLabelText('Horizonte (días)'),'7');
 expect(screen.getByRole('button',{name:'Registrar pasto'})).toBeDisabled();
 api.put.mockRejectedValue(Error('La configuración cambió en otra sesión.'));
 await user.click(screen.getByRole('button',{name:'Guardar reglas y disponibilidad'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('otra sesión');expect(screen.getByLabelText('Horizonte (días)')).toHaveValue(7);
});
it('accepting a stale proposal is disabled while the saved history is readable',async()=>{
 const p={id:5,estado:'PROPUESTO',snapshot_hash:'old',snapshot:{...initial,inference:{input:{units:[]}}},resultado:{status:'OPTIMO',steps:[],projection:[],baseline:[],warnings:['Peso fuera de rango'],model_limitations:[]}};
 api.get.mockImplementation(async path=>path.endsWith('/plans/5')?p:{...initial,plans:[{id:5}]});
 render(<Page/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Aceptar plan'})).toBeDisabled());
 expect(screen.getByText(/Los datos cambiaron/)).toBeInTheDocument();expect(api.patch).not.toHaveBeenCalled();
});
it('excluding a paddock writes a dated exclusion, and re-enabling clears it',async()=>{
 const user=userEvent.setup();render(<Page/>);await user.click(await screen.findByRole('button',{name:'Reglas y potreros'}));
 await user.click(screen.getByLabelText('Excluir este potrero de la rotación'));
 expect(screen.getByLabelText('Excluir desde')).toHaveValue('2026-10-01');
 api.put.mockResolvedValue({});await user.click(screen.getByRole('button',{name:'Guardar reglas y disponibilidad'}));
 await waitFor(()=>expect(api.put).toHaveBeenCalled());expect(api.put.mock.calls[0][1].config.paddocks[1].excluded_from).toBe('2026-10-01');
});
