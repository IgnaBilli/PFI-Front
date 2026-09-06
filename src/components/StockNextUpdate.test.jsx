import { describe, expect, it } from 'vitest';
import { nextStockUpdateLabel } from './StockNextUpdate.jsx';

describe('nextStockUpdateLabel', () => {
  const now = new Date('2026-09-06T15:00:00Z');
  it('shows remaining calendar days', () => {
    expect(nextStockUpdateLabel('2026-09-11', now)).toBe('en 5 días');
    expect(nextStockUpdateLabel('2026-09-07', now)).toBe('en 1 día');
  });
  it('distinguishes today and overdue dates', () => {
    expect(nextStockUpdateLabel('2026-09-06', now)).toBe('hoy');
    expect(nextStockUpdateLabel('2026-09-05', now)).toBe('pendiente');
  });
  it('uses the Argentina date even after UTC midnight', () => {
    expect(nextStockUpdateLabel('2026-09-07', new Date('2026-09-07T01:00:00Z'))).toBe('en 1 día');
  });
  it('does not invent a date for missing or invalid values', () => {
    for (const date of [undefined, null, '', 'invalid', '2026-02-30']) {
      expect(nextStockUpdateLabel(date, now)).toBe('sin fecha disponible');
    }
  });
});
