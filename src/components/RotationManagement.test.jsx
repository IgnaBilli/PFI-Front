import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,expect,it,vi} from 'vitest';
import {CattleManagement,PaddockManagement} from './RotationManagement';
import {api} from '../services/api';
import {bulkUpdateCategory} from '../services/cattleService';
vi.mock('../services/api',()=>({api:{get:vi.fn(),put:vi.fn()}}));
vi.mock('../services/cattleService',()=>({bulkUpdateCategory:vi.fn()}));
const state={revision:2,management:{paddocks:{},groups:[],split:{}},groups:[]};
beforeEach(()=>{vi.clearAllMocks();api.get.mockResolvedValue(structuredClone(state));api.put.mockResolvedValue({revision:3});});
async function open(){await userEvent.setup().click(document.querySelector('summary'));await screen.findByRole('button',{name:/Guardar/});}
it('saves category and service policy only after explicit save',async()=>{
 const user=userEvent.setup();render(<PaddockManagement estanciaId={7} paddockId={8}/>);await open();
 await user.click(screen.getByLabelText('Toros'));
 expect(api.put).not.toHaveBeenCalled();await user.click(screen.getByText('Guardar reglas'));
 expect(api.put).toHaveBeenCalledWith('/estancia/7/rotacion/management',expect.objectContaining({revision:2,management:expect.objectContaining({paddocks:{8:{categories:['TERNERO','VAQUILLONA','NOVILLO','VACA'],service:false}}})}));
});
it('uses the selected herd to create a mother-calf group with splitting disabled',async()=>{
 const user=userEvent.setup();render(<CattleManagement estanciaId={7} selectedIds={[1,2]}/>);await open();
 await user.type(screen.getByLabelText('Nombre'),'Madres');await user.click(screen.getByLabelText('Permitir dividir el grupo'));await user.click(screen.getByLabelText('Madres con sus crías'));
 expect(screen.getByLabelText('Permitir dividir el grupo')).toBeDisabled();await user.click(screen.getByText('Guardar grupo'));
 expect(api.put.mock.calls[0][1].management.groups[0]).toEqual(expect.objectContaining({animalIds:[1,2],motherCalf:true,allowSplit:false}));
});
it('updates body condition in bulk without changing categories',async()=>{
 const user=userEvent.setup(),changed=vi.fn();render(<CattleManagement estanciaId={7} selectedIds={[1,2]} onChanged={changed}/>);await open();
 await user.type(screen.getByLabelText('Condición corporal (1–5)'),'2.4');await user.click(screen.getByText('Aplicar a seleccionados'));
 await waitFor(()=>expect(changed).toHaveBeenCalled());expect(bulkUpdateCategory).toHaveBeenCalledWith([{id_ganado:1,condicion_corporal:2.4},{id_ganado:2,condicion_corporal:2.4}]);
});
