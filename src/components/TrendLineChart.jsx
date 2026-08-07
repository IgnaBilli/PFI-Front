import { useState } from 'react';

// Línea de tendencia genérica: recibe puntos {t,value} ya numéricos (tiempo
// en ms o cualquier eje ordenado) y deja el formateo de ejes/tooltip a quien
// la usa, para reusarse con cualquier serie temporal de la app.
export default function TrendLineChart({
  points,
  color,
  formatX,
  formatTooltip,
  emptyMessage = 'Todavía no hay suficiente histórico para graficar la evolución.',
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (points.length < 2) {
    return (
      <p className="mt-3 rounded-lg border border-dashed border-white/[.08] px-4 py-6 text-center text-[11px] text-stone-600">
        {emptyMessage}
      </p>
    );
  }

  const width = 600;
  const height = 200;
  const padding = { top: 12, right: 12, bottom: 22, left: 38 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

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

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="relative mt-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Evolución">
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerH * (1 - f)}
            y2={padding.top + innerH * (1 - f)}
            stroke="rgba(255,255,255,.06)"
          />
        ))}
        <text x={padding.left - 6} y={padding.top + 4} textAnchor="end" className="fill-stone-600" fontSize="9">
          {Math.round(maxValue)}
        </text>
        <text x={padding.left - 6} y={padding.top + innerH} textAnchor="end" className="fill-stone-600" fontSize="9">
          0
        </text>
        <path d={areaPath} fill={color} fillOpacity="0.12" stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(p.t)} cy={y(p.value)} r={hoverIndex === i ? 4 : 2.5} fill={color} stroke="#161619" strokeWidth="1.5" />
            <rect
              x={x(p.t) - 10}
              y={padding.top}
              width="20"
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex((current) => (current === i ? null : current))}
            />
          </g>
        ))}
        <text x={padding.left} y={height - 6} className="fill-stone-600" fontSize="9">
          {formatX(points[0].t)}
        </text>
        <text x={width - padding.right} y={height - 6} textAnchor="end" className="fill-stone-600" fontSize="9">
          {formatX(points[points.length - 1].t)}
        </text>
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-white/10 bg-[#0b0b0c] px-2 py-1 text-[10px] font-semibold text-white shadow-xl"
          style={{ left: `${(x(hovered.t) / width) * 100}%`, top: `${(y(hovered.value) / height) * 100}%` }}>
          {formatTooltip(hovered)}
        </div>
      )}
    </div>
  );
}
