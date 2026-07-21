// Real survey data (EPSG:4326 lat/lng) exported from notes.gpkg, field-collected
// with QField near Chipanga, Tanzania on 2026-07-08.
const CARTO_LIGHT_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const CARTO_ATTR = '&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const ESRI_SAT_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_ATTR = 'Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics';

const map = L.map('site-map', { zoomControl: true });

const satelliteLayer = L.tileLayer(ESRI_SAT_URL, { maxZoom: 19, attribution: ESRI_ATTR }).addTo(map);
const lightLayer = L.tileLayer(CARTO_LIGHT_URL, { maxZoom: 22, attribution: CARTO_ATTR });

L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map);
map.attributionControl.setPosition('bottomleft');

// --- Fullscreen toggle (native Fullscreen API, no plugin dependency) -------
const FullscreenControl = L.Control.extend({
  options: { position: 'topleft' },
  onAdd: function () {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    const link = L.DomUtil.create('a', 'map-fullscreen-btn', container);
    link.href = '#';
    link.title = 'Toggle fullscreen';
    link.innerHTML = '&#x26F6;';
    L.DomEvent.on(link, 'click', L.DomEvent.stop).on(link, 'click', () => {
      const el = map.getContainer();
      if (!document.fullscreenElement) el.requestFullscreen();
      else document.exitFullscreen();
    });
    return container;
  }
});
map.addControl(new FullscreenControl());
document.addEventListener('fullscreenchange', () => setTimeout(() => map.invalidateSize(), 50));

// --- Locator inset: shows where Chipanga sits within Tanzania --------------
const CHIPANGA_LATLNG = [-6.2359, 35.3459];
const locatorWrap = L.DomUtil.create('div', 'map-locator-wrap');
document.getElementById('site-map').appendChild(locatorWrap);
const locatorDiv = L.DomUtil.create('div', 'map-locator', locatorWrap);
const locatorLabel = L.DomUtil.create('div', 'map-locator-label', locatorWrap);
locatorLabel.textContent = 'Chipanga, Tanzania';

const locatorMap = L.map(locatorDiv, {
  zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
  touchZoom: false, boxZoom: false, keyboard: false, attributionControl: false
}).setView(CHIPANGA_LATLNG, 5.2);
L.tileLayer(CARTO_LIGHT_URL, { maxZoom: 10 }).addTo(locatorMap);

const pulseIcon = L.divIcon({
  html: '<div class="locator-pulse"></div><div class="locator-dot"></div>',
  className: '', iconSize: [16, 16], iconAnchor: [8, 8]
});
L.marker(CHIPANGA_LATLNG, { icon: pulseIcon }).addTo(locatorMap);

// Leaflet expects [lat,lng]; GeoJSON stores [lng,lat] — flip on load.
function coordsToLatLng(coord) {
  return L.latLng(coord[1], coord[0]);
}

const KIND_STYLE = {
  womens_garden:          { color: '#4c7a5e', weight: 2, fillOpacity: 0.25 },
  school_garden:          { color: '#3d7ea6', weight: 2, fillOpacity: 0.3 },
  well_structure:         { color: '#a9754f', weight: 2, fillOpacity: 0.35 },
  solar_array:            { color: '#e5b800', weight: 2, fillOpacity: 0.3 },
  solar_fence:            { color: '#c0392b', weight: 2, dashArray: '4 3' },
  pipe:                   { color: '#3d7ea6', weight: 3 }
};

// Small circular badge markers with an inline SVG glyph — avoids external icon
// image assets while still reading as "designed" rather than raw data dots.
const ICON_GLYPH = {
  well: '<path d="M8 1 C8 1 3 7.5 3 11 a5 5 0 0 0 10 0 C13 7.5 8 1 8 1 Z" fill="#fff"/>',
  pump: '<path d="M9 1 L3 9 h4 l-1 6 7-9 H9 Z" fill="#fff"/>',
  tank: '<path d="M4 3 a4 1.4 0 0 1 8 0 v9 a4 1.4 0 0 1 -8 0 Z" fill="none" stroke="#fff" stroke-width="1.3"/><ellipse cx="8" cy="3" rx="4" ry="1.4" fill="#fff"/>',
  tap:  '<path d="M3 4 h6 v2 h-2 v2 a3 3 0 0 1 -3 3 h-1 v-2 h1 a1 1 0 0 0 1 -1 v-2 h-2 Z" fill="#fff"/>'
};
const ICON_COLOR = { well: '#a9754f', pump: '#c0392b', tank: '#3d7ea6', tap: '#8e6b3e' };
const ICON_SIZE = { well: 30, pump: 26, tank: 26, tap: 22 };

function iconFor(kind) {
  const size = ICON_SIZE[kind] || 24;
  const color = ICON_COLOR[kind] || '#4c7a5e';
  const glyph = ICON_GLYPH[kind] || '';
  const html = `<div class="map-pin" style="width:${size}px;height:${size}px;background:${color};">
      <svg viewBox="0 0 16 16" width="${size * 0.6}" height="${size * 0.6}">${glyph}</svg>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

function styleFor(feature) {
  const kind = feature.properties.kind || feature.properties.group;
  return KIND_STYLE[kind] || { color: '#4c7a5e', weight: 2 };
}

function popupFor(feature) {
  const p = feature.properties;
  const title = p.name || p.label || 'Feature';
  const desc = p.description ? `<br>${p.description}` : '';
  const photo = p.photo ? `<br><img src="${p.photo}" alt="${title}" style="width:220px;max-width:100%;border-radius:6px;margin-top:6px;">` : '';
  return `<strong>${title}</strong>${desc}${photo}`;
}

function labelFor(feature) {
  const p = feature.properties;
  return p.name || p.label || '';
}

function pointRenderer(feature, latlng) {
  return L.marker(latlng, { icon: iconFor(feature.properties.kind) });
}

function geoLayer(data, filterFn) {
  const fc = filterFn ? { ...data, features: data.features.filter(filterFn) } : data;
  return L.geoJSON(fc, {
    coordsToLatLng,
    style: styleFor,
    pointToLayer: pointRenderer,
    onEachFeature: (f, l) => {
      l.bindPopup(popupFor(f));
      const label = labelFor(f);
      if (label) {
        l.bindTooltip(label, { direction: 'top', className: 'map-tooltip', sticky: true });
      }
    }
  });
}

Promise.all([
  fetch('data/plots.geojson').then(r => r.json()),
  fetch('data/well.geojson').then(r => r.json()),
  fetch('data/tanks.geojson').then(r => r.json()),
  fetch('data/pipes.geojson').then(r => r.json()),
  fetch('data/taps.geojson').then(r => r.json())
]).then(([plots, well, tanks, pipes, taps]) => {
  const overlays = {
    'Garden plots': geoLayer(plots),
    'Bore hole': geoLayer(well),
    'Solar & pump': geoLayer(tanks, f => ['solar_array', 'solar_fence', 'pump'].includes(f.properties.kind)),
    'Water tanks': geoLayer(tanks, f => f.properties.kind === 'tank'),
    'Piping': geoLayer(pipes),
    'Taps': geoLayer(taps)
  };

  const bounds = L.latLngBounds([]);
  Object.values(overlays).forEach(layer => {
    layer.addTo(map);
    if (layer.getBounds().isValid()) bounds.extend(layer.getBounds());
  });
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });

  const baseMaps = { 'Satellite': satelliteLayer, 'Light': lightLayer };
  L.control.layers(baseMaps, overlays, { collapsed: false }).addTo(map);
}).catch(err => {
  console.error('Failed to load map data', err);
  document.getElementById('map-note').innerHTML +=
    '<br><strong>Error loading map data — check the browser console.</strong>';
});
