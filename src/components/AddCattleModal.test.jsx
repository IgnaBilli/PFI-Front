import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AddCattleModal from './AddCattleModal.jsx';

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ estancia: { nombre: 'La Esperanza' } }),
}));

vi.mock('../services/analyticsService.js', () => ({
  createNutritionEstimate: vi.fn(),
}));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function fillValidForm(user) {
  await user.selectOptions(screen.getByRole('combobox', { name: 'Potrero de destino (opcional)' }), '7');
  await user.clear(screen.getByRole('spinbutton', { name: 'Cantidad (cabezas)' }));
  await user.type(screen.getByRole('spinbutton', { name: 'Cantidad (cabezas)' }), '2');
  await user.type(screen.getByRole('spinbutton', { name: 'Peso vivo (kg)' }), '380');
  await user.type(screen.getByRole('spinbutton', { name: /Condición corporal/ }), '3.5');
}

describe('AddCattleModal submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the dialog and entered values after rejection while preventing duplicate submission', async () => {
    const user = userEvent.setup();
    const request = deferred();
    const onAdd = vi.fn(() => request.promise);

    render(
      <AddCattleModal
        isOpen
        onClose={vi.fn()}
        onAdd={onAdd}
        paddocks={[{ id: 7, name: 'Potrero Norte' }]}
      />
    );
    await fillValidForm(user);

    const submit = screen.getByRole('button', { name: 'Agregar al rodeo' });
    await user.click(submit);

    expect(onAdd).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Agregando...' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Agregando...' }));
    expect(onAdd).toHaveBeenCalledOnce();

    await act(async () => {
      request.reject(new Error('No se pudo registrar el lote.'));
      await request.promise.catch(() => {});
    });

    expect(screen.getByRole('dialog', { name: 'Agregar ganado' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo registrar el lote.');
    expect(screen.getByRole('combobox', { name: 'Potrero de destino (opcional)' })).toHaveValue('7');
    expect(screen.getByRole('spinbutton', { name: 'Cantidad (cabezas)' })).toHaveValue(2);
    expect(screen.getByRole('spinbutton', { name: 'Peso vivo (kg)' })).toHaveValue(380);
    expect(screen.getByRole('spinbutton', { name: /Condición corporal/ })).toHaveValue(3.5);
    expect(screen.getByRole('button', { name: 'Agregar al rodeo' })).toBeEnabled();
  });

  it('closes when a successful parent callback updates the open state', async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <AddCattleModal
          isOpen={open}
          onClose={() => setOpen(false)}
          onAdd={async (payload) => {
            await save(payload);
            setOpen(false);
          }}
          paddocks={[{ id: 7, name: 'Potrero Norte' }]}
        />
      );
    }

    render(<Harness />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Agregar al rodeo' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(save).toHaveBeenCalledOnce();
  });
});
