import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NutritionAmount from './NutritionAmount.jsx';

const previous = { kg_materia_seca_dia: 68.1, cantidad_animales: 10, fecha_calculo: '2026-09-07' };

describe('nutrition after cattle transfers', () => {
  it.each([previous, null])('shows zero for an empty paddock without reusing past consumption (%j)', (estimate) => {
    const { container } = render(<NutritionAmount estimate={estimate} animalCount={0} />);
    expect(container.firstChild).toHaveTextContent('0kg MS/día');
    expect(screen.getByText(/Sin ganado asignado/)).toBeInTheDocument();
    expect(screen.queryByText(/68,1/)).not.toBeInTheDocument();
  });

  it('marks an estimate whose herd changed and clears the notice after recalculation', () => {
    const { rerender } = render(<NutritionAmount estimate={previous} animalCount={7} />);
    expect(screen.getByRole('status')).toHaveTextContent('ahora tiene 7 animales');
    expect(screen.getByText(/Último cálculo: 10 animales/)).toBeInTheDocument();
    rerender(<NutritionAmount estimate={{ ...previous, cantidad_animales: 7, kg_materia_seca_dia: 53.7 }} animalCount={7} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText(/53,7/)).toBeInTheDocument();
  });
});
