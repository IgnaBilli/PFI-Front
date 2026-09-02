import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CattlePage from './CattlePage.jsx';

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
