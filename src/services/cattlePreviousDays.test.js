import { describe, it, expect, vi } from 'vitest';
vi.mock('./api.js', () => ({ api:{post:vi.fn()} }));
import { api } from './api.js';
import { createCattleForPaddock } from './cattleService.js';
describe('alta con fecha de ingreso',()=> {
  it('envía los días, incluso cero, por una ruta compatible explícita',async()=>{
    api.post.mockResolvedValue({id:1});
    await createCattleForPaddock(4,{dias_previos_potrero:0});
    expect(api.post).toHaveBeenLastCalledWith('/potrero/4/ganado-con-ingreso',{dias_previos_potrero:0});
  });
  it('no reintenta un alta incompatible ignorando los días',async()=>{
    api.post.mockReset().mockRejectedValue({status:404});
    await expect(createCattleForPaddock(4,{dias_previos_potrero:3})).rejects.toThrow('No se registró');
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});
