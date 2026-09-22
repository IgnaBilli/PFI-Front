import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IntrapaddockAnalysis from './IntrapaddockAnalysis.jsx';
import { intrapaddockDemo } from '../../preview/intrapotrero-data.js';
import { preferredObservationDate, summarizeObservation } from '../utils/intrapaddock.js';

afterEach(cleanup);

describe('Análisis intrapotrero', () => {
  it('abre la captura reciente suficientemente cubierta y conserva fechas nubladas seleccionables', () => {
    const data = { dates: ['2026-09-09', '2026-09-14', '2026-09-19'], sectors: [{
      areaHa: 10, observations: { '2026-09-09': 0.5, '2026-09-14': 0.6, '2026-09-19': 0.7 },
      validAreaHa: { '2026-09-09': 10, '2026-09-14': 8.5, '2026-09-19': 0.1 },
    }] };
    expect(preferredObservationDate(data)).toBe('2026-09-14');
    data.sectors[0].validAreaHa['2026-09-09'] = 4;
    data.sectors[0].validAreaHa['2026-09-14'] = 6;
    expect(preferredObservationDate(data)).toBe('2026-09-14');
    for (const date of data.dates) data.sectors[0].validAreaHa[date] = 0;
    expect(preferredObservationDate(data)).toBe('2026-09-19');
  });
  it('pondera cobertura parcial real y conserva el área sin observar', () => {
    const sectors = [
      { areaHa: 10, observations: { today: 0.8 }, validAreaHa: { today: 2 } },
      { areaHa: 10, observations: { today: 0.4 }, validAreaHa: { today: 8 } },
    ];
    const result = summarizeObservation(sectors, 'today');
    expect(result.mean).toBeCloseTo(0.48);
    expect(result.coverage).toBe(50);
    expect(result.missingArea).toBe(10);
  });
  it('pondera solamente la superficie observada, sin convertir faltantes en cero', () => {
    const result = summarizeObservation(intrapaddockDemo.sectors, '2026-09-20');
    expect(result.mean).toBeCloseTo((18 * 0.68 + 12 * 0.55 + 8 * 0.38) / 38);
    expect(result.coverage).toBe(95);
    expect(result.missingArea).toBe(2);
    expect(summarizeObservation(intrapaddockDemo.sectors, '2026-09-01').mean).toBeNull();
    expect(summarizeObservation(intrapaddockDemo.sectors, '2026-09-05').coverage).toBe(100);
  });

  it('muestra un estado honesto cuando el potrero no tiene datos espaciales', () => {
    render(<IntrapaddockAnalysis />);
    expect(screen.getByText(/Todavía no hay observaciones/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('sincroniza selección, capa y fecha sin mostrar observaciones futuras', async () => {
    const user = userEvent.setup();
    render(<IntrapaddockAnalysis data={intrapaddockDemo} />);
    await user.click(screen.getByRole('button', { name: 'Sector C, 8 ha' }));
    const detail = screen.getByRole('complementary', { name: 'Detalle del sector' });
    expect(within(detail).getByRole('heading', { name: 'Sector C' })).toBeInTheDocument();
    expect(within(detail).getByText('0,38', { selector: 'p' })).toBeInTheDocument();
    expect(within(detail).getByText(/-0,02 frente/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sectores', exact: true }));
    expect(screen.getByRole('button', { name: 'Sectores', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await user.selectOptions(screen.getByRole('combobox'), '2026-09-10');
    expect(within(detail).getByText('0,42', { selector: 'p' })).toBeInTheDocument();
    expect(within(detail).getByRole('img').textContent).not.toContain('0,38');
    expect(within(detail).queryByText('0,38')).not.toBeInTheDocument();
  });

  it('permite seleccionar el mapa por teclado y distingue ausencia de datos', async () => {
    const user = userEvent.setup();
    render(<IntrapaddockAnalysis data={intrapaddockDemo} />);
    const region = screen.getByRole('button', { name: 'Sector D, 2 hectáreas, NDVI Sin datos' });
    region.focus();
    await user.keyboard('{Enter}');
    expect(region).toHaveAttribute('aria-pressed', 'true');
    const detail = screen.getByRole('complementary', { name: 'Detalle del sector' });
    expect(within(detail).getByText(/Sin datos no significa sin pasto/)).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox'), '2026-09-01');
    expect(screen.getByText('0 %')).toBeInTheDocument();
    expect(screen.getByText('0 de 40 ha observadas')).toBeInTheDocument();
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
  });
});
