import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import StockCalculationNotice from './StockCalculationNotice';
import { createStockEstimate } from '../services/analyticsService';
import { api } from '../services/api';
vi.mock('../services/api', () => ({ api: { get: vi.fn(), post: vi.fn() }, ApiError: class extends Error {} }));

it('resumes an unsupported stock job as an explanatory notice rather than a server error', async () => {
  api.get.mockResolvedValue({ estado: 'ERROR', codigo: 'COBERTURA_NO_COMPATIBLE', error: "MapBiomas: Cultivos temporarios" });
  let error;
  try { await createStockEstimate(59, undefined, true); } catch (e) { error = e; }
  render(<StockCalculationNotice error={error} />);
  expect(screen.getByRole('status')).toHaveTextContent('Cultivos temporarios');
  expect(screen.getByRole('status')).toHaveTextContent('Revisá que el polígono');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('keeps actual technical failures visible as errors', () => {
  render(<StockCalculationNotice error={new Error('Se interrumpió la conexión')} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Se interrumpió la conexión');
  expect(screen.queryByText('Stock no disponible para esta cobertura')).not.toBeInTheDocument();
});
