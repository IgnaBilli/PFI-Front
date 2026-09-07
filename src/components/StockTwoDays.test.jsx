import { describe, expect, it } from 'vitest';
import { stockTwoDays } from './StockTwoDays.jsx';

const stock = { fecha_objetivo: '2026-09-07', stock_final_central_kg_ms_ha: 243,
  crecimiento_utilizable_kg_ms_ha_dia: 3, consumo_diario_kg_ms_ha: 8 };
describe('stock today and tomorrow', () => {
  it('converts both balances to whole-paddock totals using estimated area', () => {
    const now = new Date('2026-09-07T12:00:00Z');
    expect(stockTwoDays({ ...stock, superficie_ha: 10 }, now).map(d => d.total)).toEqual([2430, 2380]);
    for (const superficie_ha of [null, '', 0, -1]) {
      expect(stockTwoDays({ ...stock, superficie_ha }, now).map(d => d.total)).toEqual([null, null]);
    }
  });
  it('subtracts consumption per hectare, without double counting today', () => {
    expect(stockTwoDays(stock, new Date('2026-09-07T12:00:00Z')).map(d => d.value)).toEqual([243, 238]);
  });
  it('rolls the two dates and marks stale balances as projections', () => {
    const days = stockTwoDays(stock, new Date('2026-09-08T12:00:00Z'));
    expect(days.map(d => d.value)).toEqual([238, 233]);
    expect(days.every(d => d.projected)).toBe(true);
    expect(days.map(d => d.date)).toEqual(['2026-09-08', '2026-09-09']);
  });
  it('uses Argentina midnight', () => {
    expect(stockTwoDays(stock, new Date('2026-09-08T01:00:00Z'))[0].date).toBe('2026-09-07');
  });
  it('does not invent missing consumption and never shows negative stock', () => {
    const now = new Date('2026-09-07T12:00:00Z');
    expect(stockTwoDays({ ...stock, consumo_diario_kg_ms_ha: null }, now)[1].value).toBeNull();
    expect(stockTwoDays({ ...stock, consumo_diario_kg_ms_ha: 300 }, now)[1].value).toBe(0);
    expect(stockTwoDays({ ...stock, consumo_diario_kg_ms_ha: 0 }, now)[1].value).toBe(246);
    expect(stockTwoDays({ ...stock, fecha_objetivo: '2026-02-30' }, now)[0].value).toBeNull();
  });
});
