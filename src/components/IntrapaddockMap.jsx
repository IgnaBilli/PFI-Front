import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ndviColor } from '../utils/intrapaddock.js';

const colors = ['#599a83', '#859dcc', '#bc9471', '#7f878a'];

function FitGeometry({ bounds }) {
  const map = useMap();
  useEffect(() => {
    const resize = () => { map.invalidateSize(); map.fitBounds(bounds, { padding: [30, 30], maxZoom: 18 }); };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, bounds]);
  return null;
}

export default function IntrapaddockMap({ data, date, layer, selectedId, onSelect }) {
  const bounds = useMemo(() => L.geoJSON(data.geometry).getBounds(), [data.geometry]);
  const scene = data.scenes?.[date];
  return <div className="intra-real-map" aria-label="Mapa geográfico de variabilidad intrapotrero">
    <MapContainer bounds={bounds} scrollWheelZoom={false} className="h-full w-full" attributionControl>
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles © Esri · NDVI: Copernicus Sentinel-2 / Earth Search" />
      <FitGeometry bounds={bounds} />
      {layer === 'vegetation' && scene?.cells && <GeoJSON key={`cells-${date}`} data={scene.cells} interactive={false} style={feature => ({
        fillColor: ndviColor(feature.properties.ndvi), fillOpacity: feature.properties.ndvi === null ? 0.7 : 0.82,
        color: '#bbc3bb', weight: feature.properties.ndvi === null ? 0.8 : 0, dashArray: feature.properties.ndvi === null ? '3 3' : undefined,
      })} />}
      {data.sectors.map((sector, index) => <GeoJSON key={`${sector.id}-${layer}-${selectedId}`} data={sector.geometry}
        style={{ color: selectedId === sector.id ? '#fff0cb' : '#ded2bf', weight: selectedId === sector.id ? 4 : 1.5,
          fillColor: colors[index % colors.length], fillOpacity: layer === 'sectors' ? 0.55 : 0 }}
        onEachFeature={(_feature, featureLayer) => {
          featureLayer.on('click', () => onSelect(sector.id));
          featureLayer.bindTooltip(sector.name, { permanent: true, direction: 'center', className: 'intra-leaflet-label' });
        }} />)}
    </MapContainer>
  </div>;
}
