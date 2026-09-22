import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PaddockIntrapaddockPanel from './PaddockIntrapaddockPanel.jsx';
import { api } from '../services/api.js';

vi.mock('../services/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('./IntrapaddockAnalysis.jsx', () => ({ default: ({ data }) => <div>{data ? 'Resultado real guardado' : 'Sin observaciones'}</div> }));

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Panel integrado', () => {
  it('abrir el detalle solamente lee; generar inicia el trabajo explícitamente', async () => {
    api.get.mockResolvedValue({ analysis: null, task: { estado: 'SIN_TAREA' } });
    api.post.mockResolvedValue({ task: { estado: 'EJECUTANDO' } });
    render(<PaddockIntrapaddockPanel paddockId={42} />);
    await screen.findByText('Sin observaciones');
    expect(api.post).not.toHaveBeenCalled();
    api.get.mockResolvedValue({ analysis: { generatedAt: 'now' }, task: { estado: 'COMPLETADO' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generar análisis' }));
    await screen.findByText('Resultado real guardado');
    expect(api.post).toHaveBeenCalledWith('/potrero/42/intrapotrero');
    expect(screen.getByRole('button', { name: 'Actualizar análisis' })).toBeEnabled();
  });

  it('conserva el resultado anterior si falla la actualización', async () => {
    api.get.mockResolvedValue({ analysis: { generatedAt: 'before' }, task: { estado: 'SIN_TAREA' } });
    api.post.mockRejectedValue(new Error('Fuente temporalmente no disponible'));
    render(<PaddockIntrapaddockPanel paddockId={42} />);
    await screen.findByText('Resultado real guardado');
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar análisis' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Fuente temporalmente no disponible');
    expect(screen.getByText('Resultado real guardado')).toBeInTheDocument();
  });

  it('recupera un trabajo en curso y deja de consultar al salir', async () => {
    api.get.mockResolvedValue({ analysis: null, task: { estado: 'EJECUTANDO' } });
    const view = render(<PaddockIntrapaddockPanel paddockId={42} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Analizando imágenes…' })).toBeDisabled());
    view.unmount();
    vi.useFakeTimers();
    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
