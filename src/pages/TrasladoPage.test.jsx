import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assignCattle, relocateCattle } from '../services/cattleService.js';
import TrasladoPage from './TrasladoPage.jsx';

const hookState = vi.hoisted(() => ({
  cattle: [],
  paddocks: [],
  reloadCattle: vi.fn(),
}));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ estanciaId: 12 }),
}));

vi.mock('../hooks/useCattle.js', () => ({
  default: () => ({ cattle: hookState.cattle, loading: false, error: '', reload: hookState.reloadCattle }),
}));

vi.mock('../hooks/usePaddocks.js', () => ({
  default: () => ({ paddocks: hookState.paddocks, loading: false, error: '' }),
}));

vi.mock('../hooks/usePaddockAnalytics.js', () => ({
  default: () => ({ dataById: {}, loading: false }),
  buildPaddockStatus: () => ({ status: 'Sin datos', statusColor: '#777', statusBg: '#111' }),
}));

vi.mock('../services/cattleService.js', () => ({
  assignCattle: vi.fn(),
  relocateCattle: vi.fn(),
}));

vi.mock('../components/PaddockThumbnail.jsx', () => ({ default: () => <div aria-hidden="true" /> }));

const storageKey = 'terrabovina:traslado:12';

function renderPage(state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/traslado', state }]}>
      <TrasladoPage />
    </MemoryRouter>
  );
}

describe('TrasladoPage selection recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    hookState.cattle = [];
    hookState.paddocks = [];
  });

  it('preserves recommendation capacity checking and destination after reopening',async()=>{
    const user=userEvent.setup();
    hookState.cattle=[{id:1,caravana:'A-1',paddockId:7,paddock:'Norte'}];
    hookState.paddocks=[{id:7,name:'Norte',hectares:10},{id:9,name:'Destino',hectares:15}];
    sessionStorage.setItem(storageKey,JSON.stringify({animalIds:[1],destinationId:9,recommendation:true}));
    relocateCattle.mockRejectedValue(new Error('El destino ya no tiene capacidad.'));
    renderPage(undefined);
    expect(screen.getByRole('radio',{name:/Destino elegido/})).toBeChecked();
    await user.click(screen.getByRole('button',{name:'Confirmar traslado'}));
    await user.click(screen.getByRole('button',{name:'Confirmar'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('El destino ya no tiene capacidad.');
    expect(relocateCattle).toHaveBeenCalledWith(7,expect.objectContaining({recommendation:true,id_ganado:[1],id_potrero_destino:9}));
  });

  it('recovers safely from malformed storage as an empty selection', async () => {
    sessionStorage.setItem(storageKey, '{invalid');

    renderPage(undefined);

    expect(screen.getByText('No hay animales seleccionados para trasladar.')).toBeInTheDocument();
    await waitFor(() => expect(sessionStorage.getItem(storageKey)).toBeNull());
  });

  it('reviews the note before sending and preserves it when a transfer fails', async () => {
    const user = userEvent.setup();
    hookState.cattle = [{ id: 1, caravana: 'A-1', paddockId: 7, paddock: 'Norte' }];
    hookState.paddocks = [{ id: 7, name: 'Norte', hectares: 10 }, { id: 9, name: 'Destino', hectares: 15 }];
    relocateCattle.mockRejectedValue(new Error('El destino ya no tiene capacidad.'));
    renderPage({ animalIds: [1], destinationId: 9 });
    const note = screen.getByRole('textbox', { name: 'Observaciones (opcional)' });
    expect(note).toHaveAttribute('maxlength', '500');
    await user.type(note, '  Más pasto disponible.  ');
    await user.click(screen.getByRole('button', { name: 'Confirmar traslado' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Observaciones: Más pasto disponible.');
    expect(relocateCattle).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El destino ya no tiene capacidad.');
    expect(relocateCattle).toHaveBeenCalledWith(7, expect.objectContaining({ observaciones: 'Más pasto disponible.' }));
    expect(note).toHaveValue('  Más pasto disponible.  ');
  });

  it('does not offer a transfer note for an initial assignment without an origin', () => {
    hookState.cattle = [{ id: 1, caravana: 'A-1', paddockId: null, paddock: '-' }];
    hookState.paddocks = [{ id: 9, name: 'Destino', hectares: 15 }];
    renderPage({ animalIds: [1] });
    expect(screen.queryByRole('textbox', { name: 'Observaciones (opcional)' })).not.toBeInTheDocument();
  });

  it('rejects a stored selection when any selected animal is stale and clears it', async () => {
    hookState.cattle = [
      { id: 1, caravana: 'A-1', paddockId: 7, paddock: 'Norte' },
    ];
    sessionStorage.setItem(storageKey, JSON.stringify([1, 99]));

    renderPage(undefined);

    expect(screen.getByText('La selección ya no está vigente.')).toBeInTheDocument();
    await waitFor(() => expect(sessionStorage.getItem(storageKey)).toBeNull());
  });

  it('reports a partial multi-origin transfer when a later origin fails', async () => {
    const user = userEvent.setup();
    hookState.cattle = [
      { id: 1, caravana: 'A-1', paddockId: null, paddock: '-' },
      { id: 2, caravana: 'A-2', paddockId: 7, paddock: 'Norte' },
    ];
    hookState.paddocks = [
      { id: 7, name: 'Norte', hectares: 10 },
      { id: 9, name: 'Destino', hectares: 15 },
    ];
    assignCattle.mockResolvedValue(undefined);
    relocateCattle.mockRejectedValue(new Error('Falló el segundo origen.'));
    hookState.reloadCattle.mockResolvedValue(undefined);

    renderPage({ animalIds: [1, 2] });
    await user.click(screen.getByRole('radio', { name: /Destino/ }));
    await user.click(screen.getByRole('button', { name: 'Confirmar traslado' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Falló el segundo origen.');
    expect(alert).toHaveTextContent('Un origen ya se completó; el traslado quedó parcial.');
    expect(assignCattle).toHaveBeenCalledWith({ id_potrero: 9, id_ganado: [1] });
    expect(relocateCattle).toHaveBeenCalledWith(7, expect.objectContaining({
      id_potrero_destino: 9,
      id_ganado: [2],
    }));
    expect(hookState.reloadCattle).toHaveBeenCalledOnce();
  });
});
