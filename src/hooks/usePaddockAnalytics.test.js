import { describe, expect, it } from 'vitest';
import { buildPaddockStatus } from './usePaddockAnalytics.js';

// carga = (consumo diario por animal * cantidad de animales) /
//         (forraje estimado por ha * hectáreas)
describe('buildPaddockStatus — carga animal', () => {
  it('computes the load percentage from consumption, animal count, forage and hectares', () => {
    const entry = {
      forage: { kg_materia_seca_ha: 100 },
      nutrition: { kg_materia_seca_dia: 10, cantidad_animales: 5 },
    };
    // (10 * 5) / (100 * 2) = 50/200 = 0.25 -> 25%
    const result = buildPaddockStatus(entry, 2);
    expect(result.load).toBe('25%');
    expect(result.loadBarWidth).toBe('25%');
  });

  it('reports over 100% when the paddock is overstocked, without clamping the displayed number', () => {
    const entry = {
      forage: { kg_materia_seca_ha: 10 },
      nutrition: { kg_materia_seca_dia: 20, cantidad_animales: 10 },
    };
    // (20 * 10) / (10 * 2) = 200/20 = 10 -> 1000%
    const result = buildPaddockStatus(entry, 2);
    expect(result.load).toBe('1000%');
    // the bar width is still clamped so it never overflows its container
    expect(result.loadBarWidth).toBe('100%');
  });

  it('falls back to "Sin datos" when forage and hectares are both zero (0/0)', () => {
    const entry = {
      forage: { kg_materia_seca_ha: 0 },
      nutrition: { kg_materia_seca_dia: 0, cantidad_animales: 0 },
    };
    const result = buildPaddockStatus(entry, 0);
    expect(result.load).toBe('Sin datos');
    expect(result.loadBarWidth).toBe('0%');
  });

  it('falls back to "Sin datos" when there is demand but no forage supply (n/0)', () => {
    const entry = {
      forage: { kg_materia_seca_ha: 0 },
      nutrition: { kg_materia_seca_dia: 15, cantidad_animales: 3 },
    };
    const result = buildPaddockStatus(entry, 5);
    expect(result.load).toBe('Sin datos');
  });

  it('falls back to "Sin datos" when hectares is zero', () => {
    const entry = {
      forage: { kg_materia_seca_ha: 50 },
      nutrition: { kg_materia_seca_dia: 15, cantidad_animales: 3 },
    };
    const result = buildPaddockStatus(entry, 0);
    expect(result.load).toBe('Sin datos');
  });

  it('falls back to "Sin datos" when nutrition or forage data is missing', () => {
    expect(buildPaddockStatus({ forage: null, nutrition: null }, 10).load).toBe('Sin datos');
    expect(buildPaddockStatus({ forage: { kg_materia_seca_ha: 50 }, nutrition: null }, 10).load).toBe(
      'Sin datos'
    );
    expect(buildPaddockStatus(null, 10).load).toBe('Sin datos');
    expect(buildPaddockStatus({ forage: { kg_materia_seca_ha: 50 }, nutrition: { kg_materia_seca_dia: 5, cantidad_animales: 2 } }, undefined).load).toBe(
      'Sin datos'
    );
  });

  it('rejects mathematically impossible (negative) inputs instead of showing a negative load', () => {
    const entry = {
      forage: { kg_materia_seca_ha: 50 },
      nutrition: { kg_materia_seca_dia: -10, cantidad_animales: 3 },
    };
    const result = buildPaddockStatus(entry, 10);
    expect(result.load).toBe('Sin datos');
  });

  it('treats zero demand over positive supply as a real, valid 0% load', () => {
    const entry = {
      forage: { kg_materia_seca_ha: 50 },
      nutrition: { kg_materia_seca_dia: 0, cantidad_animales: 0 },
    };
    const result = buildPaddockStatus(entry, 10);
    expect(result.load).toBe('0%');
  });
});
