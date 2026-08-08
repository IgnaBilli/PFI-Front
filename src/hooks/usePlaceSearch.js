import { useState } from 'react';

// Búsqueda de localidades/direcciones en Argentina vía Nominatim (OSM),
// reusada por cualquier pantalla con mapa (Mapa, onboarding de estancia).
export default function usePlaceSearch({ onSelect } = {}) {
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searching, setSearching] = useState(false);
  const [placeError, setPlaceError] = useState('');

  function goToPlace(place) {
    const lat = Number(place.lat);
    const lng = Number(place.lon);
    setSelectedPlace({ lat, lng, name: place.display_name });
    setPlaceQuery(place.display_name.split(',').slice(0, 2).join(','));
    setPlaceResults([]);
    onSelect?.(lat, lng);
  }

  async function searchPlace(event) {
    event.preventDefault();
    if (placeQuery.trim().length < 3) return;
    setSearching(true);
    setPlaceError('');
    try {
      const params = new URLSearchParams({
        q: placeQuery.trim(),
        format: 'json',
        limit: '5',
        countrycodes: 'ar',
        'accept-language': 'es',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      if (!response.ok) throw new Error('Search failed');
      const places = await response.json();
      setPlaceResults(places);
      if (places.length > 0) {
        const first = places[0];
        const lat = Number(first.lat);
        const lng = Number(first.lon);
        setSelectedPlace({ lat, lng, name: first.display_name });
        onSelect?.(lat, lng);
      } else {
        setPlaceError('No encontramos ese lugar en Argentina.');
      }
    } catch {
      setPlaceError('No se pudo realizar la búsqueda.');
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setPlaceQuery('');
    setPlaceResults([]);
    setPlaceError('');
  }

  return {
    placeQuery,
    setPlaceQuery,
    placeResults,
    selectedPlace,
    searching,
    placeError,
    goToPlace,
    searchPlace,
    clearSearch,
  };
}
