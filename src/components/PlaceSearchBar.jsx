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
  return (
    <div className={className}>
      <form
        onSubmit={searchPlace}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0f0f11]/95 px-3.5 shadow-2xl backdrop-blur">
        <Search size={14} className="shrink-0 text-white" />
        <input
          value={placeQuery}
          onChange={(event) => setPlaceQuery(event.target.value)}
          placeholder="Buscar localidad o dirección..."
          aria-label="Buscar localidad o dirección"
          className="min-w-0 flex-1 bg-transparent py-3 text-[12px] text-stone-250 outline-none placeholder:text-stone-750"
        />
        {searching && <LoaderCircle size={14} className="animate-spin text-stone-500" />}
        {placeQuery && !searching && (
          <button type="button" onClick={clearSearch} aria-label="Limpiar búsqueda" className="text-stone-600 hover:text-stone-300">
            <X size={14} />
          </button>
        )}
      </form>
      {placeResults.length > 1 && (
        <div className="mt-1 overflow-hidden rounded-lg border border-white/10 bg-[#0f0f11] shadow-2xl">
          {placeResults.map((place) => (
            <button
              key={place.place_id}
              onClick={() => goToPlace(place)}
              className="flex w-full items-start gap-2 border-b border-white/[.05] px-3.5 py-2.5 text-left text-[11px] leading-4 text-stone-400 last:border-0 hover:bg-white/[.04] hover:text-stone-200">
              <MapPin size={13} className="mt-0.5 shrink-0 text-white" />
              {place.display_name}
            </button>
          ))}
        </div>
      )}
      {placeError && (
        <p className="mt-1 rounded-md bg-[#0f0f11] px-3.5 py-2.5 text-[11px] text-stone-400 shadow-xl">
          {placeError}
        </p>
      )}
    </div>
  );
}
