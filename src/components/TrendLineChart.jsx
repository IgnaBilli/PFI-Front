import { useId, useState } from 'react';

// Línea de tendencia genérica: recibe puntos {t,value} ya numéricos (tiempo
// en ms o cualquier eje ordenado) y deja el formateo de ejes/tooltip a quien
// la usa, para reusarse con cualquier serie temporal de la app.
export default function TrendLineChart({
  points,
  color,
  formatX,
  formatTooltip,
  emptyMessage = 'Todavía no hay suficiente histórico para graficar la evolución.',
  ariaLabel = 'Evolución',
}) {
  const titleId = useId();
  const descriptionId = useId();
  const instructionsId = useId();
  const [activeIndex, setActiveIndex] = useState(null);

  if (points.length < 2) {
    return (
      <p className="mt-3 rounded-lg border border-dashed border-sand-100/10 px-4 py-6 text-center text-xs text-sand-500">
        {emptyMessage}
      </p>
    );
  }

  const width = 600;
  const height = 200;
  const padding = { top: 12, right: 12, bottom: 22, left: 38 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const hitWidth = Math.min(64, innerW / points.length);

  const minT = points[0].t;
  const maxT = points[points.length - 1].t;
  const maxValue = Math.max(...points.map((p) => p.value), 1);

  const x = (t) => padding.left + (maxT === minT ? innerW / 2 : ((t - minT) / (maxT - minT)) * innerW);
  const y = (v) => padding.top + innerH - (v / maxValue) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.t).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(' ');
  const areaPath =
    `${linePath} L ${x(points[points.length - 1].t).toFixed(1)} ${(padding.top + innerH).toFixed(1)} ` +
    `L ${x(points[0].t).toFixed(1)} ${(padding.top + innerH).toFixed(1)} Z`;

  const active = activeIndex !== null ? points[activeIndex] : null;

  function handlePointKeyDown(event, index) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setActiveIndex(index);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Escape') {
      setActiveIndex(null);
      return;
    }
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? points.length - 1
          : Math.min(Math.max(index + (event.key === 'ArrowRight' ? 1 : -1), 0), points.length - 1);
    setActiveIndex(nextIndex);
    event.currentTarget.parentElement.parentElement
      ?.querySelector(`[data-point-index="${nextIndex}"]`)
      ?.focus();
  }

  return (
    <div className="relative mt-3">
      <p id={instructionsId} className="sr-only">
        Gráfico interactivo. Usá las flechas izquierda y derecha para recorrer los puntos.
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-manipulation"
        role="group"
        aria-labelledby={`${titleId} ${descriptionId}`}
        aria-describedby={instructionsId}>
        <title id={titleId}>{ariaLabel}</title>
        <desc id={descriptionId}>
          {points.map((point) => formatTooltip(point)).join('. ')}.
        </desc>
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerH * (1 - f)}
            y2={padding.top + innerH * (1 - f)}
            stroke="var(--border)"
          />
        ))}
        <text x={padding.left - 6} y={padding.top + 4} textAnchor="end" className="fill-sand-500" fontSize="12">
          {Math.round(maxValue)}
        </text>
        <text x={padding.left - 6} y={padding.top + innerH} textAnchor="end" className="fill-sand-500" fontSize="12">
          0
        </text>
        <path d={areaPath} fill={color} fillOpacity="0.12" stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={x(p.t)}
              cy={y(p.value)}
              r={activeIndex === i ? 5 : 3}
              fill={color}
              stroke="var(--surface)"
              strokeWidth="1.5"
            />
            <rect
              data-point-index={i}
              x={x(p.t) - hitWidth / 2}
              y={padding.top}
              width={hitWidth}
              height={innerH}
              fill="transparent"
              role="button"
              tabIndex="0"
              aria-label={formatTooltip(p)}
              onFocus={() => setActiveIndex(i)}
              onBlur={() => setActiveIndex(null)}
              onKeyDown={(event) => handlePointKeyDown(event, i)}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={() => setActiveIndex((current) => (current === i ? null : i))}
            />
          </g>
        ))}
        <text x={padding.left} y={height - 6} className="fill-sand-500" fontSize="12">
          {formatX(points[0].t)}
        </text>
        <text x={width - padding.right} y={height - 6} textAnchor="end" className="fill-sand-500" fontSize="12">
          {formatX(points[points.length - 1].t)}
        </text>
      </svg>
      {active && (
        <div
          role="status"
          className="pointer-events-none absolute whitespace-nowrap rounded-md border border-[var(--border)] bg-forest-950 px-2 py-1 text-xs font-semibold text-[var(--text)] shadow-xl"
          style={{
            left: `${(x(active.t) / width) * 100}%`,
            top: `${(y(active.value) / height) * 100}%`,
            transform: `translate(${activeIndex === 0 ? '0' : activeIndex === points.length - 1 ? '-100%' : '-50%'}, -100%)`,
          }}>
          {formatTooltip(active)}
        </div>
      )}
      <ol className="sr-only">
        {points.map((point, index) => (
          <li key={`${point.t}-${index}`}>{formatTooltip(point)}</li>
        ))}
      </ol>
    </div>
  );
}
