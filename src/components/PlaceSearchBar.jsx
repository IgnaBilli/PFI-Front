import { LoaderCircle, MapPin, Search, X } from 'lucide-react';

// UI de búsqueda de localidad/dirección; la lógica vive en usePlaceSearch
// para poder reusarse igual en el mapa y en el onboarding de estancia.
export default function PlaceSearchBar({
  placeQuery,
  setPlaceQuery,
  placeResults,
  searching,
  placeError,
  goToPlace,
  searchPlace,
  clearSearch,
  className = '',
}) {
  const resultsId = 'place-search-results';
  const errorId = 'place-search-error';

  return (
    <div className={className}>
      <form
        onSubmit={searchPlace}
        role="search"
        aria-label="Buscar un lugar en el mapa"
        className="app-panel flex items-center gap-1 bg-[var(--surface)] p-1 shadow-[var(--shadow-raised)]">
        <label htmlFor="place-search-input" className="sr-only">Localidad o dirección</label>
        <input
          id="place-search-input"
          value={placeQuery}
          onChange={(event) => setPlaceQuery(event.target.value)}
          placeholder="Buscar localidad o dirección..."
          aria-controls={placeResults.length > 1 ? resultsId : undefined}
          aria-describedby={placeError ? errorId : undefined}
          aria-expanded={placeResults.length > 1}
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-base text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] sm:text-sm"
        />
        {searching && (
          <span role="status" className="grid size-11 shrink-0 place-items-center text-[var(--text-muted)]">
            <LoaderCircle size={17} aria-hidden="true" className="animate-spin" />
            <span className="sr-only">Buscando lugares</span>
          </span>
        )}
        {placeQuery && !searching && (
          <button type="button" onClick={clearSearch} aria-label="Limpiar búsqueda" className="app-icon-button shrink-0 border-0 bg-transparent">
            <X size={17} aria-hidden="true" />
          </button>
        )}
        <button
          type="submit"
          aria-label="Buscar lugar"
          disabled={searching || placeQuery.trim().length < 3}
          className="app-icon-button shrink-0 border-0 bg-[var(--accent)] text-[var(--accent-ink)] disabled:opacity-45">
          <Search size={17} aria-hidden="true" />
        </button>
      </form>
      {placeResults.length > 1 && (
        <div id={resultsId} aria-label="Resultados de lugares" className="app-panel mt-1 max-h-[min(45dvh,18rem)] overflow-y-auto shadow-[var(--shadow-raised)]">
          {placeResults.map((place) => (
            <button
              type="button"
              key={place.place_id}
              onClick={() => goToPlace(place)}
              className="flex min-h-11 w-full items-start gap-2 border-b border-[var(--border)] px-3.5 py-3 text-left text-sm leading-5 text-[var(--text-soft)] last:border-0 hover:bg-white/[.04] hover:text-[var(--text)]">
              <MapPin size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--text)]" />
              <span>{place.display_name}</span>
            </button>
          ))}
        </div>
      )}
      {placeError && (
        <p id={errorId} role="alert" aria-live="assertive" className="app-error mt-1 text-sm shadow-xl">
          {placeError}
        </p>
      )}
    </div>
  );
}
