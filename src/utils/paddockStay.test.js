import {it,expect} from 'vitest';
import {paddockStay} from './paddockStay.js';
import {mapCattleFromApi} from '../services/mappers.js';
const now = new Date('2026-09-07T15:00:00Z');
it('muestra días calendario desde la asignación actual',()=>{
  expect(paddockStay('2026-09-07',now)).toBe('Hoy');
  expect(paddockStay('2026-09-06',now)).toBe('Hace 1 día');
  expect(paddockStay('2026-09-04',now)).toBe('Hace 3 días');
});
it('usa la fecha argentina y no inventa entradas faltantes',()=>{
  expect(paddockStay('2026-09-06',new Date('2026-09-07T01:00:00Z'))).toBe('Hoy');
  for(const value of [null,undefined,'','2026-02-30']) expect(paddockStay(value,now)).toBe('Sin fecha');
  expect(paddockStay('2026-09-08',now)).toBe('Entrada futura');
});
it('conserva la fecha de asignación y no usa la creación del animal',()=>{
  expect(mapCattleFromApi({fecha_ingreso_potrero:'2026-09-04',created_at:'2020-01-01'}).paddockEntryDate).toBe('2026-09-04');
});
