import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,expect,it,vi} from 'vitest';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import {api} from '../services/api.js';
import {createStockEstimate} from '../services/analyticsService.js';
import Page from './IntrapaddockPage.jsx';

vi.mock('../services/api.js',()=>({api:{get:vi.fn(),post:vi.fn()}}));
vi.mock('../services/analyticsService.js',()=>({createStockEstimate:vi.fn()}));
vi.mock('react-leaflet',()=>({MapContainer:({children})=><div>{children}</div>,TileLayer:()=>null,
 GeoJSON:()=>null,CircleMarker:()=>null,Polygon:()=>null,Polyline:()=>null,Tooltip:()=>null,
 useMap:()=>({fitBounds:()=>{}}),useMapEvents:()=>{}}));
const geom={type:'Polygon',coordinates:[[[-59,-35],[-58.99,-35],[-58.99,-34.99],[-59,-35]]]};
const initial={version:null,configuracion:{zonas:[]},analisis:{fecha:'2026-09-27',region_nombre:'Pampa',catalogo:[{id:'loma',nombre:'Loma',fuente:'Matriz regional'}],
 configuracion:{zonas:[]},superficie_total_ha:100,superficie_pastoreable_ha:100,superficie_sin_clasificar_ha:100,
 referencia_base_mensual:Array(12).fill(10),preferencia:{puntos:[],advertencia:'Orientativo'},advertencias:[]}};
function renderPage(){render(<MemoryRouter initialEntries={['/potreros/7/intrapotrero']}><Routes><Route path='/potreros/:paddockId/intrapotrero' element={<Page/>}/></Routes></MemoryRouter>);}
beforeEach(()=>{vi.clearAllMocks();api.get.mockImplementation(async path=>path.endsWith('/intrapotrero')?structuredClone(initial):{nombre:'Norte',geom});createStockEstimate.mockResolvedValue({});});
async function addZone(user){await user.click(await screen.findByRole('button',{name:'Agregar'}));await user.type(screen.getByLabelText('Nombre'),'Loma norte');expect(screen.queryByLabelText('Ambiente de la región')).not.toBeInTheDocument();await user.selectOptions(screen.getByLabelText(/Posición del relieve/),'loma');await user.click(screen.getByRole('button',{name:'Usar todo el potrero'}));await user.click(screen.getByRole('button',{name:'Aceptar zona'}));}
it('draws, saves a version, and preserves saved zones when stock refresh fails so it can be retried',async()=>{
 const user=userEvent.setup();renderPage();await addZone(user);
 api.post.mockImplementation(async(_path,body)=>({...initial,version:4,configuracion:{zonas:body.zonas}}));
 createStockEstimate.mockRejectedValueOnce(Error('modelo no disponible'));
 await user.click(screen.getByRole('button',{name:'Guardar y actualizar cálculo'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Las zonas siguen guardadas');
 expect(screen.getByText('Loma norte')).toBeInTheDocument();
 expect(api.post.mock.calls[0][1].version_base).toBe(0);
 expect(api.post.mock.calls[0][1].zonas[0].geom).toEqual(geom);
 expect(api.post.mock.calls[0][1].zonas[0].posicion).toBe('loma');
 expect(api.post.mock.calls[0][1].zonas[0]).not.toHaveProperty('ambiente_id');
 await user.click(screen.getByRole('button',{name:'Actualizar balance'}));
 await waitFor(()=>expect(createStockEstimate).toHaveBeenCalledTimes(2));
 expect(api.post).toHaveBeenCalledTimes(1);
});
it('a conflicting save retains pending edits and never starts a stock job',async()=>{
 const user=userEvent.setup();renderPage();await addZone(user);
 api.post.mockRejectedValue(Error('El potrero cambió en otra sesión. Recargá antes de guardar.'));
 await user.click(screen.getByRole('button',{name:'Guardar y actualizar cálculo'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('otra sesión');
 expect(screen.getByText('Loma norte')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Guardar y actualizar cálculo'})).toBeEnabled();
 expect(createStockEstimate).not.toHaveBeenCalled();
});

it('restoring a historical version preserves relief and geometry without resubmitting retired curves',async()=>{
 const user=userEvent.setup();
 const legacy={id:'old',nombre:'Bajo sur',tipo:'ambiente',posicion:'bajo',ambiente_id:'malezal',curva_mensual:Array(12).fill(99),geom};
 api.get.mockImplementation(async path=>path.endsWith('/historial')?{versiones:[{id:1,vigente_desde:'2026-09-26',cantidad_zonas:1,configuracion:{zonas:[legacy]}}]}:path.endsWith('/intrapotrero')?{...structuredClone(initial),analisis:{...initial.analisis,catalogo:[]}}:{nombre:'Norte',geom});
 api.post.mockImplementation(async(_path,body)=>({...initial,version:4,configuracion:{zonas:body.zonas}}));
 renderPage();
 await user.click(await screen.findByRole('button',{name:'Agregar'}));
 expect(screen.getByLabelText('Tipo')).toHaveValue('ambiente');
 expect(screen.queryByLabelText('Ambiente de la región')).not.toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'Cancelar'}));
 await user.click(screen.getByRole('button',{name:'Ver versiones'}));
 await user.click(await screen.findByRole('button',{name:'Cargar para restaurar'}));
 await user.click(screen.getByRole('button',{name:'Editar Bajo sur'}));
 expect(screen.getByLabelText(/Posición del relieve/)).toHaveValue('bajo');
 expect(screen.queryByLabelText('Ambiente de la región')).not.toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'Aceptar zona'}));
 await user.click(screen.getByRole('button',{name:'Guardar y actualizar cálculo'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledOnce());
 expect(api.post.mock.calls[0][1].zonas).toEqual([{id:'old',nombre:'Bajo sur',tipo:'ambiente',posicion:'bajo',geom}]);
});
