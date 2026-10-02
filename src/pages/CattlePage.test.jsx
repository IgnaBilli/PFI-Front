import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CattlePage from './CattlePage.jsx';
import * as cattleApi from '../services/cattleService.js';

const hookState = vi.hoisted(() => ({
  cattle: [
    { id: 1, caravana: 'NUM-7', category: 'Vaca', weight: '380 kg', cc: 3, status: 'N', paddockId: 7, paddock: 'Norte' },
    { id: 2, caravana: 'STR-7', category: 'Novillo', weight: '240 kg', cc: '-', status: 'DESCONOCIDO', paddockId: '7', paddock: 'Norte' },
    { id: 3, caravana: 'OTHER-8', category: 'Toro', weight: '500 kg', cc: '-', status: 'DESCONOCIDO', paddockId: 8, paddock: 'Sur' },
  ],
  paddocks: [
    { id: 7, name: 'Norte', hectares: 10 },
    { id: 8, name: 'Sur', hectares: 12 },
  ],
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ estanciaId: 12 }),
}));

vi.mock('../hooks/useCattle.js', () => ({
  default: () => ({ cattle: hookState.cattle, loading: false, error: '', reload: vi.fn() }),
}));

vi.mock('../hooks/usePaddocks.js', () => ({
  default: () => ({ paddocks: hookState.paddocks, loading: false, error: '', reload: vi.fn() }),
}));

vi.mock('../components/AddCattleModal.jsx', () => ({ default: () => null }));
vi.mock('../components/ConfirmDialog.jsx', () => ({ default: () => null }));
vi.mock('../services/cattleService.js', () => ({
  assignCattle:vi.fn(),bulkDeleteCattle:vi.fn(),bulkUpdateCategory:vi.fn(),
  createCattleForEstancia:vi.fn(),createCattleBatch:vi.fn(),deleteCattle:vi.fn(),
  relocateCattle:vi.fn(),updateCattle:vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe('CattlePage paddock filtering', () => {
  it('matches animals whose paddock IDs are numeric or string values', async () => {
    const user = userEvent.setup();
    render(<CattlePage />, { wrapper: MemoryRouter });

    await user.click(screen.getByRole('button', { name: 'Mostrar filtros de ganado' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Potrero' }), '7');

    expect(screen.getByText('NUM-7')).toBeInTheDocument();
    expect(screen.getByText('STR-7')).toBeInTheDocument();
    expect(screen.queryByText('OTHER-8')).not.toBeInTheDocument();
  });
});

describe('CattlePage edit validation', () => {
  it('requires and sends body condition for a bulk change to cows', async () => {
    const user = userEvent.setup();
    render(<CattlePage />, { wrapper: MemoryRouter });
    await user.click(screen.getByRole('checkbox', {name:'Seleccionar animal NUM-7'}));
    await user.selectOptions(screen.getByRole('combobox', {name:'Nueva categoría para la selección'}), 'VACA');
    await user.click(screen.getByRole('button', {name:'Aplicar', exact:true}));
    expect(cattleApi.bulkUpdateCategory).not.toHaveBeenCalled();
    await user.type(screen.getByRole('spinbutton', {name:'Condición corporal para la selección (1 a 5)'}), '3.5');
    await user.click(screen.getByRole('button', {name:'Aplicar', exact:true}));
    expect(cattleApi.bulkUpdateCategory).toHaveBeenCalledWith([{id_ganado:1,categoria:'VACA',condicion_corporal:3.5}]);
  });
  it('rejects zero weight before moving or updating an animal', async () => {
    const user = userEvent.setup();
    render(<CattlePage />, { wrapper:MemoryRouter });
    await user.click(screen.getByRole('button',{name:'Editar animal STR-7'}));
    const row = within(screen.getByRole('row',{name:/STR-7/}));
    await user.clear(row.getByRole('spinbutton'));
    await user.type(row.getByRole('spinbutton'),'0');
    await user.selectOptions(row.getAllByRole('combobox')[1],'8');
    await user.click(screen.getByRole('button',{name:'Guardar cambios de STR-7'}));
    expect(screen.getByRole('alert')).toHaveTextContent('peso vivo válido');
    expect(cattleApi.relocateCattle).not.toHaveBeenCalled();
    expect(cattleApi.assignCattle).not.toHaveBeenCalled();
    expect(cattleApi.updateCattle).not.toHaveBeenCalled();
  });

  it('requires valid body condition before saving a cow', async () => {
    const user = userEvent.setup();
    render(<CattlePage />, { wrapper:MemoryRouter });
    await user.click(screen.getByRole('button',{name:'Editar animal NUM-7'}));
    const row = within(screen.getByRole('row',{name:/NUM-7/}));
    await user.clear(row.getAllByRole('spinbutton')[1]);
    await user.click(screen.getByRole('button',{name:'Guardar cambios de NUM-7'}));
    expect(screen.getByRole('alert')).toHaveTextContent('condición corporal');
    expect(cattleApi.updateCattle).not.toHaveBeenCalled();
  });

  it('saves a valid weight correction', async () => {
    const user = userEvent.setup();
    render(<CattlePage />, { wrapper:MemoryRouter });
    await user.click(screen.getByRole('button',{name:'Editar animal STR-7'}));
    const row = within(screen.getByRole('row',{name:/STR-7/}));
    await user.clear(row.getByRole('spinbutton'));
    await user.type(row.getByRole('spinbutton'),'260');
    await user.click(screen.getByRole('button',{name:'Guardar cambios de STR-7'}));
    expect(cattleApi.updateCattle).toHaveBeenCalledWith(2,expect.objectContaining({peso_kg:260}));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
