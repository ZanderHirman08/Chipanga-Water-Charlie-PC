// Real survey data (EPSG:4326 lat/lng) exported from notes.gpkg, field-collected
// with QField near Chipanga, Tanzania on 2026-07-08.
const map = L.map('site-map');

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 22,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Leaflet expects [lat,lng]; GeoJSON stores [lng,lat] — flip on load.
function coordsToLatLng(coord) {
  return L.latLng(coord[1], coord[0]);
}

const KIND_STYLE = {
  womens_garden:  { color: '#4c7a5e', weight: 2, fillOpacity: 0.25 },
  school_garden_built:   { color: '#3d7ea6', weight: 2, fillOpacity: 0.3 },
  school_garden_planned: { color: '#3d7ea6', weight: 2, fillOpacity: 0.1, dashArray: '6 4' },
  well:           { color: '#a9754f', weight: 2, fillOpacity: 0 },
  well_structure: { color: '#a9754f', weight: 2, fillOpacity: 0.35 },
  solar_array:    { color: '#e5b800', weight: 2, fillOpacity: 0.3 },
  solar_fence:    { color: '#c0392b', weight: 2, dashArray: '4 3' },
  pump:           { color: '#c0392b', weight: 2, fillOpacity: 0.9 },
  tank:           { color: '#3d7ea6', weight: 2, fillOpacity: 0.9 },
  tap:            { color: '#8e6b3e', weight: 1, fillOpacity: 0.8 },
  pipe:           { color: '#3d7ea6', weight: 3 }
};

const legendEntries = [
  ['Women’s garden (~3/4 acre, complete)', KIND_STYLE.womens_garden.color],
  ['School garden — built', KIND_STYLE.school_garden_built.color],
  ['School garden — planned expansion', KIND_STYLE.school_garden_planned.color],
  ['Bore hole / well', KIND_STYLE.well.color],
  ['Solar array', KIND_STYLE.solar_array.color],
  ['Solar fence / pump', KIND_STYLE.solar_fence.color],
  ['Tanks', KIND_STYLE.tank.color],
  ['Taps', KIND_STYLE.tap.color],
  ['Piping', KIND_STYLE.pipe.color]
];
document.getElementById('map-legend').innerHTML = legendEntries
  .map(([label, color]) => `<span><i style="background:${color}"></i>${label}</span>`)
  .join('');

function styleFor(feature) {
  const kind = feature.properties.kind || feature.properties.group;
  return KIND_STYLE[kind] || { color: '#4c7a5e', weight: 2 };
}

function popupFor(feature) {
  const p = feature.properties;
  const title = p.name || p.label || 'Feature';
  const desc = p.description ? `<br>${p.description}` : '';
  return `<strong>${title}</strong>${desc}`;
}

function pointRenderer(feature, latlng) {
  const kind = feature.properties.kind;
  const style = KIND_STYLE[kind] || { color: '#4c7a5e' };
  const radius = kind === 'well' ? 9 : kind === 'tap' ? 5 : 7;
  return L.circleMarker(latlng, { radius, color: style.color, fillColor: style.color, fillOpacity: 0.85, weight: 2 });
}

function loadLayer(url) {
  return fetch(url)
    .then(r => r.json())
    .then(data => L.geoJSON(data, {
      coordsToLatLng,
      style: styleFor,
      pointToLayer: pointRenderer,
      onEachFeature: (f, l) => l.bindPopup(popupFor(f))
    }));
}

const layerFiles = ['data/plots.geojson', 'data/well.geojson', 'data/tanks.geojson', 'data/pipes.geojson', 'data/taps.geojson'];
const bounds = L.latLngBounds([]);

Promise.all(layerFiles.map(loadLayer)).then(layers => {
  layers.forEach(layer => {
    layer.addTo(map);
    if (layer.getBounds().isValid()) bounds.extend(layer.getBounds());
  });
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
}).catch(err => {
  console.error('Failed to load map data', err);
  document.getElementById('map-note').innerHTML +=
    '<br><strong>Error loading map data — check the browser console.</strong>';
});
