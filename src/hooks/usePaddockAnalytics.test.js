import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchActiveRecommendation,
  fetchLatestStock,
  fetchLatestNutrition,
} from '../services/analyticsService.js';
import usePaddockAnalytics, { buildPaddockStatus } from './usePaddockAnalytics.js';

vi.mock('../services/analyticsService.js', () => ({
  fetchActiveRecommendation: vi.fn(),
  fetchLatestStock: vi.fn(),
  fetchLatestNutrition: vi.fn(),
}));

describe('usePaddockAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retains successful card data and exposes errors by paddock and source', async () => {
    const failure = new Error('nutrition failed');
    const stock = { stock_final_central_kg_ms_ha: 100 };
    const recommendation = { prioridad: 'MONITOREAR' };
    fetchLatestStock.mockResolvedValue(stock);
    fetchLatestNutrition.mockRejectedValue(failure);
    fetchActiveRecommendation.mockResolvedValue(recommendation);

    const { result } = renderHook(() => usePaddockAnalytics([{ id: 9 }]));

    await waitFor(() => expect(result.current.dataById[9]).toBeDefined());
    expect(result.current.dataById[9]).toEqual({ stock, nutrition: null, recommendation });
    expect(result.current.errorsById).toEqual({ 9: { nutrition: failure } });
    expect(result.current.error).toBe(failure);
    expect(result.current.loading).toBe(false);
  });
});

// carga = (consumo diario por animal * cantidad de animales) /
//         (forraje estimado por ha * hectáreas)
describe('buildPaddockStatus — carga animal', () => {
  it('does not present an empty paddock balance as current after receiving cattle', () => {
    const entry = { stock: { stock_final_central_kg_ms_ha: 188.8,
      crecimiento_utilizable_kg_ms_ha_dia: 8, consumo_diario_total_kg_ms: 0,
      detalle_json: { seguimiento_diario: { dias: [{ consumo: { animales_dia: 0 } }] } } } };
    expect(buildPaddockStatus(entry, 52.2, 6)).toMatchObject({ status: 'Actualizar datos', load: 'Pendiente' });
    expect(buildPaddockStatus(entry, 52.2, 0).load).toBe('0%');
  });

  it('requires a fresh balance after cattle leave, while retaining historical stock', () => {
    const entry = { stock: { stock_final_central_kg_ms_ha: 100,
      crecimiento_utilizable_kg_ms_ha_dia: 8, consumo_diario_total_kg_ms: 22.14,
      detalle_json: { seguimiento_diario: { dias: [{ consumo: { animales_dia: 6 } }] } } } };
    expect(buildPaddockStatus(entry, 3, 0)).toMatchObject({ grass: '100 kg MS/ha', load: 'Pendiente' });
  });

  it('compara el consumo total diario con el crecimiento utilizable del potrero', () => {
    const result = buildPaddockStatus({
      stock: {
        stock_final_central_kg_ms_ha: 674,
        crecimiento_utilizable_kg_ms_ha_dia: 2,
        consumo_diario_total_kg_ms: 300,
      },
    }, 50);
    expect(result.grass).toBe('674 kg MS/ha');
    expect(result.load).toBe('300%');
    expect(result.alert).toContain('consumo diario supera el crecimiento utilizable');
  });
  it('labels forage as a stock per hectare without claiming a daily rate or forage quality', () => {
    const result = buildPaddockStatus({ forage: { kg_materia_seca_ha: 120 } }, 5);

    expect(result.grass).toBe('120 kg MS/ha');
    expect(result.status).toBe('Datos disponibles');
    expect(result.ok).toBe('Estimación forrajera disponible');
  });

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
