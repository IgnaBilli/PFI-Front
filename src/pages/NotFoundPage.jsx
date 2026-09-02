import { ArrowLeft, MapPinned } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="app-page grid min-h-full place-items-center">
      <section className="app-panel w-full max-w-lg px-6 py-10 text-center sm:px-10" aria-labelledby="not-found-title">
        <MapPinned size={34} aria-hidden="true" className="mx-auto text-brand-400" />
        <p className="mt-5 text-sm font-bold text-earth-500">Error 404</p>
        <h1 id="not-found-title" className="mt-2 text-2xl font-extrabold tracking-[-.025em] text-sand-100 sm:text-3xl">
          Este lugar no está en el mapa
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-sand-500">
          La dirección no existe o fue movida. Volvé al resumen para seguir trabajando con tu estancia.
        </p>
        <Link to="/resumen" className="app-button-primary mt-7">
          <ArrowLeft size={17} aria-hidden="true" /> Volver al resumen
        </Link>
      </section>
    </div>
  );
}
