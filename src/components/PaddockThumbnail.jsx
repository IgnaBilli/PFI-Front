import { useRef } from 'react';
import PolygonMapCanvas from './PolygonMapCanvas.jsx';
import { paddedBoundsPoints } from '../utils/geo.js';

const OUTLINE_COLOR = '#3987e5';

// Mini-mapa de solo lectura recortado a un único potrero (satélite real +
// su polígono), sin controles de zoom/paneo — pensado para tarjetas chicas.
export default function PaddockThumbnail({ paddock, padding = 0.0008 }) {
  const mapRef = useRef(null);
  const polygon = { id: paddock.id, coordinates: paddock.coordinates, color: OUTLINE_COLOR, label: null };
  const bounds = paddedBoundsPoints(paddock.coordinates, padding);

  return (
    <PolygonMapCanvas
      mapRef={mapRef}
      isDrawing={false}
      vertices={[]}
      existingPolygons={[polygon]}
      restrictTo={bounds}
      interactive={false}
    />
  );
}
