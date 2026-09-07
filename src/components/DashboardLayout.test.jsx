import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import DashboardLayout from './DashboardLayout.jsx';

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ estancia: { nombre: 'Estancia de prueba' }, logout: vi.fn() }),
}));
afterEach(() => vi.unstubAllGlobals());

it('restores access to the page when the mobile menu becomes a desktop sidebar', async () => {
  let onChange;
  const removeEventListener = vi.fn();
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    addEventListener: (_event, callback) => { onChange = callback; },
    removeEventListener,
  })));
  const user = userEvent.setup();
  const { unmount } = render(<MemoryRouter><DashboardLayout /></MemoryRouter>);
  await user.click(screen.getByRole('button', { name: 'Abrir menú' }));
  const main = document.getElementById('app-main');
  expect(main).toHaveAttribute('inert');
  act(() => onChange({ matches: true }));
  expect(main).not.toHaveAttribute('inert');
  expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false');
  unmount();
  expect(removeEventListener).toHaveBeenCalledWith('change', onChange);
});
