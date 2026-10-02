import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import PaddockUseControl from './PaddockUseControl';
import {api} from '../services/api';
vi.mock('../services/api',()=>({api:{patch:vi.fn()}}));
it('closes an occupied paddock without any livestock operation and offers reactivation',async()=>{
 const user=userEvent.setup(), changed=vi.fn();api.patch.mockResolvedValue({});
 const {rerender}=render(<MemoryRouter><PaddockUseControl id={54} name="Alfa" animals={50} enabled onChanged={changed}/></MemoryRouter>);
 await user.click(screen.getByRole('button',{name:'Desactivar potrero'}));
 expect(screen.getByRole('alertdialog')).toHaveTextContent('Sus 50 animales conservarán su ubicación');
 await user.click(screen.getByRole('button',{name:'Desactivar y reorganizar'}));
 await waitFor(()=>expect(changed).toHaveBeenCalled());expect(api.patch).toHaveBeenCalledWith('/potrero/54/uso',{habilitado:false});
 rerender(<MemoryRouter><PaddockUseControl id={54} name="Alfa" animals={50} enabled={false} onChanged={changed}/></MemoryRouter>);
 expect(screen.getByRole('link',{name:'Reorganizar 50 animales'})).toHaveAttribute('href','/rotacion');
 await user.click(screen.getByRole('button',{name:'Reactivar potrero'}));await user.click(screen.getByRole('button',{name:'Reactivar',exact:true}));
 await waitFor(()=>expect(api.patch).toHaveBeenCalledWith('/potrero/54/uso',{habilitado:true}));
});
