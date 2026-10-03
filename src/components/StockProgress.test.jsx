import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import StockProgress from './StockProgress';
import { createStockEstimate } from '../services/analyticsService';
import { api } from '../services/api';
vi.mock('../services/api', () => ({ api: { get: vi.fn(), post: vi.fn() }, ApiError: class extends Error {} }));
it('does not announce 100 while the calculation is still running',()=>{
 const {rerender}=render(<StockProgress value={100} running />);
 expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow','99');
 rerender(<StockProgress value={100} running={false} />);
 expect(screen.getByText('100%')).toBeInTheDocument();
});
it('resumes progress and delivers subsequent updates through completion',async()=>{
 vi.useFakeTimers();
 try {
  api.get.mockResolvedValueOnce({id:'a',estado:'EJECUTANDO',porcentaje:25})
   .mockResolvedValueOnce({id:'a',estado:'EJECUTANDO',porcentaje:63})
   .mockResolvedValueOnce({id:'a',estado:'COMPLETADO',porcentaje:100,resultado:{stock:12}});
  const progress=vi.fn();const pending=createStockEstimate(1,undefined,true,progress);
  await vi.advanceTimersByTimeAsync(6000);
  expect(await pending).toEqual({stock:12});
  expect(progress.mock.calls.map(([job])=>job.porcentaje)).toEqual([25,63,100]);
 } finally {vi.useRealTimers();}
});
