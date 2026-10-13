import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api.js';
import { relocateCattle } from './cattleService.js';

vi.mock('./api.js', () => ({ api: { post: vi.fn() } }));

describe('relocateCattle observations', () => {
  beforeEach(() => vi.clearAllMocks());
  const movement = { id_potrero_destino: 9, id_ganado: [1], fecha_movimiento: '2026-10-13T12:00:00Z' };

  it('sends the note through the API with the recommendation safeguard', () => {
    relocateCattle(7, { ...movement, recommendation: true, observaciones: '  Más pasto.\nRevisar en 20 días.  ' });
    expect(api.post).toHaveBeenCalledWith('/potrero/7/traslado-ganado', {
      ...movement, recommendation: true, observaciones: 'Más pasto.\nRevisar en 20 días.',
    });
  });

  it.each([undefined, '', '   '])('keeps notes optional (%s)', (observaciones) => {
    relocateCattle(7, { ...movement, observaciones });
    expect(api.post).toHaveBeenCalledWith('/potrero/7/traslado-ganado', movement);
  });
});
