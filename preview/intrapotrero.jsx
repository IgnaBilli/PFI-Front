import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FlaskConical, MapPin } from 'lucide-react';
import DashboardLayout from '../src/components/DashboardLayout.jsx';
import IntrapaddockAnalysis from '../src/components/IntrapaddockAnalysis.jsx';
import { intrapaddockDemo } from './intrapotrero-data.js';
import '../src/styles.css';

export function PreviewPage() {
  return <div className="app-page text-sm">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning-400/25 bg-warning-400/5 px-4 py-3 text-warning-400">
      <p className="flex items-center gap-2 font-bold"><FlaskConical size={17} aria-hidden="true" />Vista local · Análisis intrapotrero</p>
      <span className="text-xs">Datos de ejemplo · Sin conexión a la API</span>
    </div>
    <Link to="/potreros" className="app-button-ghost w-fit"><ArrowLeft size={16} aria-hidden="true" />Potreros</Link>
    <header className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-sand-100/10 pb-6">
      <div><h1 className="text-3xl font-extrabold tracking-tight text-sand-100 sm:text-4xl">Potrero Norte</h1><p className="mt-3 flex items-center gap-2 text-sand-300"><MapPin size={16} aria-hidden="true" />40 ha<span className="text-sand-500">· Campo natural · Ejemplo</span></p></div>
      <span className="rounded-full border border-sand-100/15 px-3 py-2 text-xs text-sand-300">Análisis de vegetación</span>
    </header>
    <IntrapaddockAnalysis data={intrapaddockDemo} />
    <p className="mt-5 max-w-3xl text-sm leading-relaxed text-sand-500">Probá cambiar la fecha, alternar las capas y seleccionar un sector. La fecha del 1 de septiembre muestra cómo se ve una observación sin datos válidos.</p>
  </div>;
}

export function PreviewIndex() {
  return <div className="app-page">
    <p className="text-sm font-bold text-warning-400">Vista local · Datos de ejemplo</p>
    <h1 className="mt-4 text-3xl font-extrabold text-sand-100">Explorá el análisis intrapotrero</h1>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-sand-300">Esta navegación pertenece a la demostración local. El detalle de Potrero Norte contiene la nueva vista interactiva.</p>
    <Link to="/potreros/demo-norte" className="app-panel mt-6 flex max-w-xl items-center justify-between gap-4 p-6 hover:border-brand-400">
      <span><strong className="block text-lg text-sand-100">Potrero Norte</strong><span className="mt-2 block text-sm text-sand-300">40 ha · 4 sectores · Ver variabilidad interna</span></span><ArrowRight size={22} aria-hidden="true" />
    </Link>
  </div>;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MemoryRouter initialEntries={['/potreros/demo-norte']}>
      <Routes><Route element={<DashboardLayout />}><Route path="/potreros/demo-norte" element={<PreviewPage />} /><Route path="*" element={<PreviewIndex />} /></Route></Routes>
    </MemoryRouter>
  </StrictMode>,
);
