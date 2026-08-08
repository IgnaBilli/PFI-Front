import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import usePlaceSearch from './usePlaceSearch.js';

function mockFetchOnce(body, ok = true) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  });
}

describe('usePlaceSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not search below the 3-character minimum', async () => {
    globalThis.fetch = vi.fn();
    const { result } = renderHook(() => usePlaceSearch());

    act(() => result.current.setPlaceQuery('ab'));
    await act(async () => {
      await result.current.searchPlace({ preventDefault: () => {} });
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('populates results and calls onSelect with the first match', async () => {
    const places = [
      { place_id: 1, display_name: 'Córdoba, Argentina', lat: '-31.4', lon: '-64.2' },
      { place_id: 2, display_name: 'Córdoba Capital, Argentina', lat: '-31.41', lon: '-64.18' },
    ];
    mockFetchOnce(places);
    const onSelect = vi.fn();
    const { result } = renderHook(() => usePlaceSearch({ onSelect }));

    act(() => result.current.setPlaceQuery('Córdoba'));
    await act(async () => {
      await result.current.searchPlace({ preventDefault: () => {} });
    });

    await waitFor(() => expect(result.current.placeResults).toHaveLength(2));
    expect(result.current.selectedPlace).toEqual({ lat: -31.4, lng: -64.2, name: places[0].display_name });
    expect(onSelect).toHaveBeenCalledWith(-31.4, -64.2);

    const [, requestUrl] = [undefined, globalThis.fetch.mock.calls[0][0]];
    expect(requestUrl).toContain('nominatim.openstreetmap.org/search');
    expect(requestUrl).toContain('countrycodes=ar');
  });

  it('sets a not-found error when the search returns no results', async () => {
    mockFetchOnce([]);
    const { result } = renderHook(() => usePlaceSearch());

    act(() => result.current.setPlaceQuery('Ciudad inexistente'));
    await act(async () => {
      await result.current.searchPlace({ preventDefault: () => {} });
    });

    expect(result.current.placeError).toBe('No encontramos ese lugar en Argentina.');
    expect(result.current.selectedPlace).toBeNull();
  });

  it('sets a generic error when the request fails', async () => {
    mockFetchOnce({}, false);
    const { result } = renderHook(() => usePlaceSearch());

    act(() => result.current.setPlaceQuery('Buenos Aires'));
    await act(async () => {
      await result.current.searchPlace({ preventDefault: () => {} });
    });

    expect(result.current.placeError).toBe('No se pudo realizar la búsqueda.');
  });

  it('goToPlace selects a place, trims the query to two segments and calls onSelect', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() => usePlaceSearch({ onSelect }));

    act(() => {
      result.current.goToPlace({
        display_name: 'Río Cuarto, Córdoba, Argentina',
        lat: '-33.13',
        lon: '-64.35',
      });
    });

    expect(result.current.placeQuery).toBe('Río Cuarto, Córdoba');
    expect(result.current.placeResults).toEqual([]);
    expect(result.current.selectedPlace).toEqual({
      lat: -33.13,
      lng: -64.35,
      name: 'Río Cuarto, Córdoba, Argentina',
    });
    expect(onSelect).toHaveBeenCalledWith(-33.13, -64.35);
  });

  it('clearSearch resets query, results and error', async () => {
    mockFetchOnce([]);
    const { result } = renderHook(() => usePlaceSearch());

    act(() => result.current.setPlaceQuery('algo'));
    await act(async () => {
      await result.current.searchPlace({ preventDefault: () => {} });
    });
    expect(result.current.placeError).not.toBe('');

    act(() => result.current.clearSearch());

    expect(result.current.placeQuery).toBe('');
    expect(result.current.placeResults).toEqual([]);
    expect(result.current.placeError).toBe('');
  });
});
