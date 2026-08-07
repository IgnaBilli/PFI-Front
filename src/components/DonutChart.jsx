import { useState } from 'react';

function polarToCartesian(cx, cy, r, angle) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function donutArcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const startOuter = polarToCartesian(cx, cy, rOuter, startAngle);
  const endOuter = polarToCartesian(cx, cy, rOuter, endAngle);
  const startInner = polarToCartesian(cx, cy, rInner, endAngle);
  const endInner = polarToCartesian(cx, cy, rInner, startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

// Donut genérico: recibe segmentos ya resueltos ({key,label,value,color}) y
// no asume de qué dominio vienen (rodeo por categoría, carga animal de la
// estancia, etc.), para reusarse en cualquier pantalla que necesite una
// distribución categórica.
export default function DonutChart({ segments, size = 180, emptyMessage = 'Sin datos todavía.', ariaLabel = 'Distribución' }) {
  const [hoverKey, setHoverKey] = useState(null);
  const visible = segments.filter((s) => s.value > 0);
  const total = visible.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <p className="mt-3 rounded-lg border border-dashed border-white/[.08] px-4 py-8 text-center text-[11px] text-stone-600">
        {emptyMessage}
      </p>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.444;
  const rInner = size * 0.289;
  let cursor = -Math.PI / 2;
  const arcs = visible.map((s) => {
    const fraction = s.value / total;
    const startAngle = cursor;
    const endAngle = cursor + fraction * Math.PI * 2;
    cursor = endAngle;
    return { ...s, fraction, startAngle, endAngle };
  });

  const hovered = arcs.find((a) => a.key === hoverKey) || null;

  return (
    <div className="mt-3">
      <div className="relative mx-auto w-fit">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
          {arcs.map((a) => (
            <path
              key={a.key}
              d={donutArcPath(cx, cy, rOuter, rInner, a.startAngle, a.endAngle)}
              fill={a.color}
              stroke="#161619"
              strokeWidth={2}
              opacity={hoverKey && hoverKey !== a.key ? 0.35 : 1}
              style={{ cursor: 'pointer', transition: 'opacity .15s' }}
              onMouseEnter={() => setHoverKey(a.key)}
              onMouseLeave={() => setHoverKey((k) => (k === a.key ? null : k))}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[22px] font-bold text-white">{hovered ? hovered.value : total}</span>
          <span className="max-w-[80px] truncate text-[9px] font-semibold uppercase tracking-wider text-stone-500">
            {hovered ? hovered.label : 'Total'}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        {arcs.map((a) => (
          <div
            key={a.key}
            className="flex items-center justify-between text-[11px] cursor-pointer"
            onMouseEnter={() => setHoverKey(a.key)}
            onMouseLeave={() => setHoverKey((k) => (k === a.key ? null : k))}>
            <span className="flex items-center gap-1.5 text-stone-400">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
              {a.label}
            </span>
            <strong className="text-stone-200">
              {a.value} · {Math.round(a.fraction * 100)}%
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
