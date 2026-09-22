import { lazy, Suspense, useId, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Info, Layers, Satellite, ScanLine } from 'lucide-react';
import { formatNdvi, formatObservationDate, ndviColor, observationFor, summarizeObservation } from '../utils/intrapaddock.js';
import './IntrapaddockAnalysis.css';

const number = value => value.toLocaleString('es-AR', { maximumFractionDigits: 1 });
const IntrapaddockMap = lazy(() => import('./IntrapaddockMap.jsx'));

export default function IntrapaddockAnalysis({ data }) {
  const id = useId();
  if (!data?.sectors?.length || !data?.dates?.length) return (
    <section className="app-panel mt-6 p-5 sm:p-6" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-xl font-bold text-sand-100">Variabilidad dentro del potrero</h2>
      <div className="mt-4 flex items-start gap-3 text-sand-300">
        <Satellite className="mt-1 shrink-0" size={22} aria-hidden="true" />
        <p className="text-sm leading-relaxed">Todavía no hay observaciones espaciales disponibles. Cuando estén disponibles, podrás comparar sectores y seguir su evolución.</p>
      </div>
    </section>
  );
  // Reset selection when a different paddock/dataset is loaded.
  return <Analysis key={data.id} data={data} />;
}

function Analysis({ data }) {
  const id = useId();
  const dates = [...data.dates].sort();
  const [date, setDate] = useState(() => [...dates].reverse().find(d => summarizeObservation(data.sectors, d).observedArea > 0) ?? dates.at(-1));
  const [selectedId, setSelectedId] = useState(data.sectors[0].id);
  const [layer, setLayer] = useState('vegetation');
  const [showMethod, setShowMethod] = useState(false);
  const selected = data.sectors.find(sector => sector.id === selectedId) ?? data.sectors[0];
  const value = observationFor(selected, date);
  const previousDate = dates[dates.indexOf(date) - 1];
  const previous = previousDate ? observationFor(selected, previousDate) : null;
  const comparison = selected.comparisons?.[date];
  const delta = data.illustrative ? (value !== null && previous !== null ? value - previous : null) : comparison?.delta ?? null;
  const summary = summarizeObservation(data.sectors, date);
  const history = dates.filter(d => d <= date).map(d => ({ date: d, value: observationFor(selected, d) }));
  const selectedIndex = data.sectors.indexOf(selected);
  const palette = ['#599a83', '#859dcc', '#bc9471', '#7f878a'];

  const chooseSector = (event, index) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedId(data.sectors[index].id);
    }
  };

  return (
    <section className="intra app-panel mt-6 overflow-hidden" aria-labelledby={`${id}-title`}>
      <header className="intra-heading">
        <div>
          <p className="intra-eyebrow"><ScanLine size={14} aria-hidden="true" /> ANÁLISIS INTRAPOTRERO</p>
          <h2 id={`${id}-title`} className="mt-2 text-xl font-bold text-sand-100 sm:text-2xl">Un potrero, distintas respuestas</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sand-300">Explorá las diferencias de vegetación dentro del mismo potrero.</p>
        </div>
        <label className="intra-date" htmlFor={`${id}-date`}>
          <span className="app-label">Fecha de observación</span>
          <select id={`${id}-date`} className="app-field" value={date} onChange={event => setDate(event.target.value)}>
            {[...dates].reverse().map(d => <option key={d} value={d}>{formatObservationDate(d)}</option>)}
          </select>
        </label>
      </header>

      {data.illustrative && <div className="intra-demo"><Info size={16} aria-hidden="true" /><p><strong>Datos ilustrativos.</strong> Potrero, sectores y observaciones simulados para evaluar la interfaz.</p></div>}
      {!data.illustrative && <div className="intra-demo"><Satellite size={16} aria-hidden="true" /><p><strong>{data.source}.</strong> Captura: {formatObservationDate(date)}. Los sectores son cuadrantes de comparación, no ambientes agronómicos.{data.warnings?.length > 0 && ' Algunas escenas no se pudieron consultar; se muestran las disponibles.'}</p></div>}
      {!data.illustrative && summary.coverage < 50 && <p className="mx-6 mb-5 text-sm text-warning-400" role="status">Cobertura limitada: el promedio describe solamente la superficie válida, no representa todo el potrero. Probá otra fecha para comparar.</p>}

      <div className="intra-metrics" aria-live="polite" aria-atomic="true">
        <Metric label="NDVI medio observado" value={formatNdvi(summary.mean)} detail="Ponderado por superficie válida" />
        <Metric label="Cobertura válida" value={`${number(summary.coverage)} %`} detail={`${number(summary.observedArea)} de ${number(summary.totalArea)} ha observadas`} />
        <Metric label="Rango entre sectores" value={summary.min === null ? 'Sin datos' : `${formatNdvi(summary.min)} – ${formatNdvi(summary.max)}`} detail="NDVI medio de cada sector" />
        <Metric label="Sin observación válida" value={`${number(summary.missingArea)} ha`} detail="Excluidas del promedio" />
      </div>

      <div className="intra-content">
        <div className="intra-map-column">
          <div className="intra-toolbar">
            <div className="intra-layer-toggle" role="group" aria-label="Capa del mapa">
              <button type="button" aria-pressed={layer === 'vegetation'} onClick={() => setLayer('vegetation')}><Satellite size={16} aria-hidden="true" />Vegetación</button>
              <button type="button" aria-pressed={layer === 'sectors'} onClick={() => setLayer('sectors')}><Layers size={16} aria-hidden="true" />Sectores</button>
            </div>
            <span className="text-xs text-sand-300">Seleccioná un sector</span>
          </div>
          {!data.illustrative && data.geometry ? <Suspense fallback={<div className="intra-real-map p-6" role="status">Cargando mapa…</div>}><IntrapaddockMap data={data} date={date} layer={layer} selectedId={selectedId} onSelect={setSelectedId} /></Suspense> : <div className="intra-map">
            <div className="intra-map-caption">{data.illustrative ? 'ESQUEMA ILUSTRATIVO' : 'VISTA ESQUEMÁTICA'}<span>Sin escala geográfica</span></div>
            <span className="intra-north" aria-hidden="true">↑<small>N</small></span>
            <svg viewBox="0 0 720 460" className="intra-map-svg" role="group" aria-label="Sectores del potrero; seleccioná uno para ver su evolución">
              <defs>
                <pattern id={`${id}-grid`} width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#b8ac96" strokeOpacity=".055" /></pattern>
                <pattern id={`${id}-missing`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="10" height="10" fill="#38433f" /><path d="M0 0V10" stroke="#bac4bb" strokeWidth="3" strokeOpacity=".6" /></pattern>
              </defs>
              <rect width="720" height="460" fill={`url(#${id}-grid)`} />
              <g fill="none" stroke="#cbbda7" strokeOpacity=".07" strokeWidth="2" aria-hidden="true"><path d="M0 88L190 52L420 66L720 30M0 415L205 430L475 411L720 442M50 0L36 200L60 460M680 0L652 215L670 460" /></g>
              {data.sectors.map((sector, index) => {
                const ndvi = observationFor(sector, date);
                const active = selected.id === sector.id;
                return <g key={sector.id} className="intra-sector" role="button" tabIndex={0} aria-pressed={active}
                  aria-label={`${sector.name}, ${number(sector.areaHa)} hectáreas, NDVI ${formatNdvi(ndvi)}`}
                  onClick={() => setSelectedId(sector.id)} onKeyDown={event => chooseSector(event, index)}>
                  <path d={sector.schematicPath} fill={ndvi === null ? `url(#${id}-missing)` : layer === 'vegetation' ? ndviColor(ndvi) : palette[index % palette.length]}
                    stroke={active ? '#fff0cb' : '#d2d5c7'} strokeWidth={active ? 5 : 1.5} strokeLinejoin="round" />
                  <g className="intra-map-label" transform={`translate(${sector.labelAt[0]},${sector.labelAt[1]})`} pointerEvents="none">
                    <rect x="-52" y="-24" width="104" height="48" rx="8" fill="#121b17" fillOpacity=".88" />
                    <text className="intra-map-label-full" textAnchor="middle" y="-4" fill="#f2e8d8" fontSize="14" fontWeight="800">{sector.name}</text>
                    <text className="intra-map-label-full" textAnchor="middle" y="14" fill="#ded2bf" fontSize="12">{ndvi === null ? 'Sin datos' : layer === 'vegetation' ? `NDVI ${formatNdvi(ndvi)}` : `${number(sector.areaHa)} ha`}</text>
                    <text className="intra-map-label-short" textAnchor="middle" y="9" fill="#f2e8d8" fontSize="30" fontWeight="800">{sector.id.toUpperCase()}</text>
                  </g>
                </g>;
              })}
            </svg>
          </div>}
          <div className="intra-legend">
            {layer === 'vegetation' ? <div><span className="text-xs">Menor NDVI</span><span className="intra-gradient" /><span className="text-xs">Mayor NDVI</span><span className="text-xs text-sand-500">0,20 a 0,80 · color saturado fuera del intervalo</span></div> : <span className="text-xs">Los colores identifican sectores; no indican calidad del forraje.</span>}
            <span className="intra-no-data"><i />Sin datos</span>
            {!data.illustrative && <p className="w-full text-xs text-sand-300">NDVI a 10 m · Máscara SCL a 20 m · Celdas de visualización: {data.scenes?.[date]?.displayResolutionM} m. Imagen de fondo de referencia, de otra fecha.</p>}
          </div>
          <div className="intra-sector-list" role="group" aria-label="Seleccionar sector">
            {data.sectors.map((sector, index) => <button key={sector.id} type="button" aria-label={`${sector.name}, ${number(sector.areaHa)} ha`} aria-pressed={selected.id === sector.id} onClick={() => setSelectedId(sector.id)}>
              <span className="intra-dot" style={{ background: palette[index % palette.length] }} /><span>{sector.name}</span><span className="ml-auto text-sand-300">{number(sector.areaHa)} ha</span>
            </button>)}
          </div>
        </div>

        <aside className="intra-detail" aria-label="Detalle del sector" aria-live="polite" aria-atomic="true">
          <p className="intra-eyebrow">SECTOR SELECCIONADO</p>
          <h3 className="mt-2 flex items-center gap-2 text-2xl font-bold text-sand-100"><span className="intra-dot" style={{ background: palette[selectedIndex % palette.length] }} />{selected.name}</h3>
          <p className="mt-1 text-sm text-sand-300">{number(selected.areaHa)} ha · {number(selected.areaHa / summary.totalArea * 100)} % del potrero</p>
          {!data.illustrative && <p className="mt-2 text-sm text-sand-300">Superficie válida: {number(selected.validAreaHa?.[date] ?? 0)} ha</p>}
          <div className="intra-current">
            <p className="text-sm text-sand-300">NDVI medio del sector</p>
            <p className={`mt-2 font-extrabold text-sand-100 ${value === null ? 'text-2xl' : 'text-5xl'}`}>{formatNdvi(value)}</p>
            {delta !== null ? <p className="mt-3 flex items-center gap-1.5 text-sm text-sand-200">
              {delta < 0 ? <ArrowDownRight size={18} aria-hidden="true" /> : <ArrowUpRight size={18} aria-hidden="true" />}
              {delta > 0 ? '+' : ''}{formatNdvi(delta)} frente al {formatObservationDate(previousDate)}
            </p> : <p className="mt-3 text-sm text-sand-300">{value === null ? 'La imagen no permite observar este sector.' : 'Sin observación anterior comparable.'}</p>}
            {comparison && <p className="mt-2 text-xs text-sand-300">Comparación sobre {number(comparison.commonAreaHa)} ha observadas en ambas fechas.</p>}
          </div>
          <h4 className="font-bold text-sand-100">Evolución del sector</h4>
          <HistoryChart history={history} id={id} />
          <div className="intra-reading"><Info size={17} className="shrink-0" aria-hidden="true" /><p>{value === null
            ? 'Sin datos no significa sin pasto. Este sector no participa del promedio de la fecha.'
            : 'El NDVI describe la señal de vegetación. Una caída merece revisión en campo: por sí sola no identifica su causa.'}</p></div>
        </aside>
      </div>

      <footer className="intra-footer">
        <p><strong>¿Cambia el crecimiento o el stock?</strong> Esta vista no modifica kg de materia seca, demanda ni días de autonomía. Para estimar forraje por sector hace falta una calibración validada.</p>
        <button className="app-button-ghost" type="button" aria-expanded={showMethod} aria-controls={`${id}-method`} onClick={() => setShowMethod(!showMethod)}><Info size={16} aria-hidden="true" />Cómo se interpreta</button>
      </footer>
      {showMethod && <div id={`${id}-method`} className="intra-method">
        <p><strong>Promedio y cobertura.</strong> Se pondera el NDVI medio de cada sector observado por sus hectáreas. Las áreas sin datos se excluyen, no se consideran cero. Si cambia la cobertura, el promedio de fechas distintas puede no ser comparable.</p>
        <p><strong>Sectores y ambientes.</strong> {data.illustrative ? 'Los sectores de esta demostración son ilustrativos.' : 'Se divide el límite real en hasta cuatro cuadrantes geográficos fijos; sus áreas se calculan en una proyección métrica local.'} Loma, bajo o tipo de suelo requieren información topográfica, edáfica y validación en campo; no se deducen del color de una imagen.</p>
        {!data.illustrative && <p><strong>Calidad y resolución.</strong> Se admiten píxeles SCL de vegetación y suelo descubierto, excluyendo agua, sombras y nubes. Un sector requiere al menos 400 m² válidos para informar un promedio. Las celdas del mapa agrupan píxeles y se muestran sin datos si tienen menos del 50 % de superficie válida. Los promedios usan el área válida a resolución nativa, no los colores del mapa. Se conservan hasta cuatro capturas de los últimos 90 días.</p>}
        <p><strong>Histórico.</strong> El gráfico muestra únicamente las fechas hasta la seleccionada. Los huecos no se interpolan y las variaciones se expresan en puntos de NDVI, no en crecimiento forrajero. En datos reales, el cambio se calcula sobre los mismos píxeles válidos en ambas capturas; el promedio del gráfico puede usar superficies distintas.</p>
      </div>}
    </section>
  );
}

function Metric({ label, value, detail }) {
  return <div><p className="text-xs font-bold text-sand-300">{label}</p><p className="mt-2 text-2xl font-extrabold tabular-nums text-sand-100">{value}</p><p className="mt-1 text-xs text-sand-500">{detail}</p></div>;
}

function HistoryChart({ history, id }) {
  const x = index => 38 + index * 252 / Math.max(history.length - 1, 1);
  const y = value => 82 - value * 55;
  return <>
    <svg viewBox="0 0 320 180" className="intra-history" role="img" aria-labelledby={`${id}-history-title ${id}-history-desc`}>
      <title id={`${id}-history-title`}>NDVI del sector en el tiempo</title>
      <desc id={`${id}-history-desc`}>{history.map(item => `${formatObservationDate(item.date)}: ${formatNdvi(item.value)}`).join('; ')}</desc>
      {[-1, 0, 1].map(tick => <g key={tick}><line x1="38" x2="300" y1={y(tick)} y2={y(tick)} stroke="#ddd0bc" strokeOpacity=".12" /><text x="1" y={y(tick) + 4} fill="#b8ac96" fontSize="12">{formatNdvi(tick)}</text></g>)}
      {history.map((item, index) => <g key={item.date}>
        {item.value !== null && index > 0 && history[index - 1].value !== null && <line x1={x(index - 1)} y1={y(history[index - 1].value)} x2={x(index)} y2={y(item.value)} stroke="#96c5a9" strokeWidth="2.5" />}
        {item.value !== null && <circle cx={x(index)} cy={y(item.value)} r="4" fill="#96c5a9" />}
        <text x={x(index)} y="166" fill="#b8ac96" fontSize="12" textAnchor="middle">{Number(item.date.slice(-2))}/{Number(item.date.slice(5, 7))}</text>
      </g>)}
    </svg>
    <details className="intra-history-values"><summary>Ver valores por fecha</summary><dl>{history.map(item => <div key={item.date}><dt>{formatObservationDate(item.date)}</dt><dd>{formatNdvi(item.value)}</dd></div>)}</dl></details>
  </>;
}
