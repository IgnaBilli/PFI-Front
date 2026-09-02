import { useId, useState } from 'react';

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
export default function DonutChart({
  segments,
  size = 180,
  emptyMessage = 'Sin datos todavía.',
  ariaLabel = 'Distribución',
}) {
  const titleId = useId();
  const descriptionId = useId();
  const [activeKey, setActiveKey] = useState(null);
  const visible = segments.filter((segment) => Number(segment.value) > 0);
  const total = visible.reduce((sum, segment) => sum + Number(segment.value), 0);

  if (total === 0) {
    return (
      <p className="mt-3 rounded-lg border border-dashed border-sand-100/10 px-4 py-8 text-center text-xs text-sand-500">
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

  const active = arcs.find((arc) => arc.key === activeKey) || null;

  function selectSegment(key) {
    setActiveKey(key);
  }

  return (
    <div className="mt-3">
      <div className="relative mx-auto w-fit">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-labelledby={`${titleId} ${descriptionId}`}>
          <title id={titleId}>{ariaLabel}</title>
          <desc id={descriptionId}>
            Total {total}. {arcs.map((arc) => `${arc.label}: ${arc.value}, ${Math.round(arc.fraction * 100)}%`).join('. ')}.
          </desc>
          {arcs.map((a) => (
            <path
              key={a.key}
              d={donutArcPath(cx, cy, rOuter, rInner, a.startAngle, a.endAngle)}
              fill={a.color}
              stroke="var(--surface)"
              strokeWidth={2}
              opacity={activeKey && activeKey !== a.key ? 0.35 : 1}
              style={{ cursor: 'pointer', transition: 'opacity .15s' }}
              onMouseEnter={() => setActiveKey(a.key)}
              onMouseLeave={() => setActiveKey(null)}
              onClick={() => selectSegment(a.key)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[22px] font-bold text-[var(--text)]" aria-live="polite">
            {active ? active.value : total}
          </span>
          <span className="max-w-[80px] truncate text-xs font-semibold uppercase tracking-wider text-sand-500">
            {active ? active.label : 'Total'}
          </span>
        </div>
      </div>

      <ul className="mt-4 space-y-1">
        {arcs.map((a) => (
          <li key={a.key}>
            <button
              type="button"
              aria-pressed={activeKey === a.key}
              className="flex min-h-11 w-full items-center justify-between rounded-md px-2 text-left text-xs transition-colors hover:bg-sand-100/[.04]"
              onFocus={() => setActiveKey(a.key)}
              onBlur={() => setActiveKey(null)}
              onMouseEnter={() => setActiveKey(a.key)}
              onMouseLeave={() => setActiveKey(null)}
              onClick={() => selectSegment(a.key)}>
              <span className="flex min-w-0 items-center gap-2 text-sand-300">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: a.color }}
                  aria-hidden="true"
                />
                <span className="truncate">{a.label}</span>
              </span>
              <strong className="ml-3 shrink-0 text-sand-100">
                {a.value} · {Math.round(a.fraction * 100)}%
              </strong>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
