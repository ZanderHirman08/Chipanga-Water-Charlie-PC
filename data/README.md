# Swapping in the real survey data

The files in this folder (`well.geojson`, `plots.geojson`, `tanks.geojson`, `pipes.geojson`,
`school.geojson`) are **placeholders** — a schematic layout matching the plot arrangement described
verbally (borehole, 10 women's garden plots, school plot, tank/solar area), using made-up local
coordinates, not real GPS positions.

## To replace them with the real data

1. Find the actual survey data. The `.qgz` file references `../../../QField/cloud/Charlie_Chipanga_/notes.gpkg`,
   which is not included in this folder — it likely lives on the phone that ran QField, or in a
   QFieldCloud account. Locate it (or ask Charlie / check the QField app's project sync folder) and
   copy it next to this project, or re-open it in QGIS via **Layer Properties → Data Source → change path**.
2. In QGIS, for each layer you want on the map (well/borehole point, garden plot polygons, pipe
   lines, tank points/polygons, school building), right-click the layer → **Export → Save Features As…**
3. Set format to **GeoJSON**, CRS to **EPSG:4326 (WGS 84)** (real GPS lat/lng, not Web Mercator or a
   local grid), and save it into this `data/` folder, replacing the matching placeholder file
   (keep the same filenames so `js/map.js` picks them up automatically).
4. Once real lat/lng GeoJSON is in place, open `js/map.js` and follow the comment near the top to
   switch the map from the placeholder schematic view (`L.CRS.Simple`) to a real geographic basemap
   (default Leaflet CRS + OpenStreetMap tiles) — it's a two-line change, clearly marked.

If a layer only has a "Notes" geometry type with a text/photo field (common if QField's built-in
Notes layer was used to mark everything in the field rather than custom layers), that's fine —
just export `Notes — Point`, `Notes — Line`, and `Notes — Polygon` and label which real-world
features are which (well, tank, plot boundary, pipe run) using their note text/photos, either in
QGIS before export or directly in the GeoJSON `properties`.
