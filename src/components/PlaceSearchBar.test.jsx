import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PlaceSearchBar from './PlaceSearchBar.jsx';

function baseProps(overrides = {}) {
  return {
    placeQuery: '',
    setPlaceQuery: vi.fn(),
    placeResults: [],
    searching: false,
    placeError: '',
    goToPlace: vi.fn(),
    searchPlace: vi.fn((event) => event.preventDefault()),
    clearSearch: vi.fn(),
    ...overrides,
  };
}

describe('PlaceSearchBar', () => {
  it('renders the search input with the expected placeholder', () => {
    render(<PlaceSearchBar {...baseProps()} />);
    expect(screen.getByPlaceholderText('Buscar localidad o dirección...')).toBeInTheDocument();
  });

  it('calls searchPlace on submit', async () => {
    const user = userEvent.setup();
    const searchPlace = vi.fn((event) => event.preventDefault());
    render(<PlaceSearchBar {...baseProps({ placeQuery: 'Córdoba', searchPlace })} />);

    await user.click(screen.getByPlaceholderText('Buscar localidad o dirección...'));
    await user.keyboard('{Enter}');

    expect(searchPlace).toHaveBeenCalledTimes(1);
  });

  it('renders result options and selects one via goToPlace', async () => {
    const user = userEvent.setup();
    const goToPlace = vi.fn();
    const placeResults = [
      { place_id: 1, display_name: 'Córdoba, Argentina' },
      { place_id: 2, display_name: 'Córdoba Capital, Argentina' },
    ];
    render(<PlaceSearchBar {...baseProps({ placeResults, goToPlace })} />);

    const option = screen.getByText('Córdoba Capital, Argentina');
    await user.click(option);

    expect(goToPlace).toHaveBeenCalledWith(placeResults[1]);
  });

  it('shows the error message when present', () => {
    render(<PlaceSearchBar {...baseProps({ placeError: 'No encontramos ese lugar en Argentina.' })} />);
    expect(screen.getByText('No encontramos ese lugar en Argentina.')).toBeInTheDocument();
  });

  it('shows a clear button once there is a query and calls clearSearch', async () => {
    const user = userEvent.setup();
    const clearSearch = vi.fn();
    render(<PlaceSearchBar {...baseProps({ placeQuery: 'Córdoba', clearSearch })} />);

    await user.click(screen.getByLabelText('Limpiar búsqueda'));
    expect(clearSearch).toHaveBeenCalledTimes(1);
  });
});
