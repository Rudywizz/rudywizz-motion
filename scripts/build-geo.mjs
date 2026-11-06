// Rebuilds engine/data from Natural Earth. Run in a scratch folder:
//   npm i topojson-server topojson-simplify world-atlas
//   NE_ADMIN1=ne_10m_admin_1_states_provinces.geojson NE_PLACES=ne_10m_populated_places_simple.geojson node build-geo.mjs <engine/data dir>
// (download both geojson files from https://github.com/nvkelso/natural-earth-vector/tree/master/geojson)
import fs from 'node:fs';
import { topology } from 'topojson-server';
import { presimplify, simplify, quantile } from 'topojson-simplify';
const D = process.argv[2];
const a = JSON.parse(fs.readFileSync(process.env.NE_ADMIN1 || 'ne_10m_admin_1_states_provinces.geojson'));
const tr = a.features.filter((f) => f.properties.iso_a2 === 'TR').map((f) => ({ type: 'Feature', geometry: f.geometry, properties: { name: f.properties.name_tr || f.properties.name, iso: f.properties.iso_3166_2, lat: f.properties.latitude, lon: f.properties.longitude } }));
let topo = topology({ provinces: { type: 'FeatureCollection', features: tr } }, 1e5);
topo = presimplify(topo);
topo = simplify(topo, quantile(topo, 0.12));
fs.writeFileSync(`${D}/tr-provinces.json`, JSON.stringify(topo));
// places: [name, lat, lon, rank, iso2, country]
const pl = JSON.parse(fs.readFileSync(process.env.NE_PLACES || 'ne_10m_populated_places_simple.geojson')).features.map((f) => {
  const p = f.properties;
  return [p.name, +p.latitude.toFixed(3), +p.longitude.toFixed(3), p.scalerank, p.iso_a2, p.adm0name];
});
for (const f of tr) pl.push([f.properties.name, +f.properties.lat.toFixed(3), +f.properties.lon.toFixed(3), 1, 'TR', 'Turkey']);
fs.writeFileSync(`${D}/places.json`, JSON.stringify(pl));
fs.copyFileSync('node_modules/world-atlas/countries-50m.json', `${D}/world-50m.json`);
fs.copyFileSync('node_modules/world-atlas/countries-110m.json', `${D}/world-110m.json`);
console.log('ok', tr.length, pl.length);
