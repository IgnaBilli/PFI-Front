import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import SummaryPage from './SummaryPage';
import useRotation from '../hooks/useRotation';
vi.mock('../hooks/useRotation',()=>({default:vi.fn()}));
vi.mock('../context/AuthContext.jsx',()=>({useAuth:()=>({estanciaId:1,estancia:{nombre:'Campo'}})}));
vi.mock('../hooks/usePaddocks.js',()=>({default:()=>({paddocks:[],loading:false})}));
vi.mock('../hooks/useCattle.js',()=>({default:()=>({cattle:[],loading:false})}));
vi.mock('../hooks/usePaddockAnalytics.js',()=>({default:()=>({dataById:{},loading:false}),buildPaddockStatus:()=>({})}));
vi.mock('../hooks/useEstanciaAnaliticas.js',()=>({default:()=>({loading:false})}));
vi.mock('../components/DonutChart.jsx',()=>({default:()=>null}));
vi.mock('../components/TrendLineChart.jsx',()=>({default:()=>null}));
const view=()=>render(<MemoryRouter><SummaryPage/></MemoryRouter>);
beforeEach(()=>vi.clearAllMocks());
it('shows the same quantities, destinations and pending animals as rotation',()=>{
 useRotation.mockReturnValue({loading:false,data:{recommendations:[{origin:54,name:'Alfa',reason:'FUERA_USO',remove:50,unallocated:10,destinations:[{id:48,name:'Lado Sur',quantity:40}]}]}});
 view();expect(screen.getByText('Redistribuir los 50 animales.')).toBeInTheDocument();
 expect(screen.getByText('40 a Lado Sur')).toBeInTheDocument();expect(screen.getByText(/10 sin destino/)).toBeInTheDocument();
 expect(screen.getByRole('link',{name:/Alfa · Vaciar/})).toHaveAttribute('href','/rotacion#potrero-54');
 expect(screen.queryByText('No hay recomendaciones pendientes con los datos disponibles.')).not.toBeInTheDocument();
});
it('does not claim no pending recommendations when rotation is unavailable',()=>{
 useRotation.mockReturnValue({loading:false,error:'Sin conexión',data:null});view();
 expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron comprobar las rotaciones');
 expect(screen.queryByText('No hay recomendaciones pendientes con los datos disponibles.')).not.toBeInTheDocument();
});
