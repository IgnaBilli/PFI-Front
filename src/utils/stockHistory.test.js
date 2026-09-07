import {it,expect} from 'vitest';
import {dailyStockPoints} from './stockHistory.js';
it('elige última revisión por día y desempata por ID sin borrar el historial',()=>{
  const rows=[{fecha_objetivo:'2026-09-07',fecha_calculo:'2026-09-07T12:00:00Z',id_estimacion_stock:3,stock_final_central_kg_ms_ha:113},
    {fecha_objetivo:'2026-09-07',fecha_calculo:'2026-09-07T12:00:00Z',id_estimacion_stock:2,stock_final_central_kg_ms_ha:200},
    {fecha_objetivo:'2026-09-06',fecha_calculo:'2026-09-06T12:00:00Z',id_estimacion_stock:1,stock_final_central_kg_ms_ha:224}];
  expect(dailyStockPoints(rows).map(p=>p.value)).toEqual([224,113]);
  expect(rows).toHaveLength(3);
});
it('ignora valores ausentes pero conserva cero',()=>{
  expect(dailyStockPoints([{fecha_objetivo:'2026-09-07',stock_final_central_kg_ms_ha:null}])).toEqual([]);
  expect(dailyStockPoints([{fecha_objetivo:'2026-09-07',stock_final_central_kg_ms_ha:0}])[0].value).toBe(0);
});
