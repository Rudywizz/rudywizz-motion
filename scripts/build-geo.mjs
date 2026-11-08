// Rebuilds engine/data from Natural Earth (public domain). Run in a scratch folder:
//   npm i topojson-server topojson-simplify world-atlas
//   node build-geo.mjs <engine/data dir> <folder with the geojson files>
// Geojson sources (https://github.com/nvkelso/natural-earth-vector/tree/master/geojson):
//   ne_10m_admin_1_states_provinces.geojson, ne_10m_populated_places.geojson, ne_50m_admin_0_countries.geojson
//
// Output:
//   tr-provinces.json  Turkey's 81 provinces (finer detail)
//   admin1.json        states / provinces / regions of every country (topojson, object "regions")
//   places.json        { places: [[name, lat, lon, rank, iso2, country, region, altNames[]]], countries: { iso2: [names…] } }
//                      cities, regions (rank 9) and countries (rank 3); alt names in ~25 languages for lookup
//   world-50m.json, world-110m.json  world-atlas countries
import fs from 'node:fs';
import path from 'node:path';
import { topology } from 'topojson-server';
import { presimplify, simplify, quantile } from 'topojson-simplify';

const D = process.argv[2];
const SRC = process.argv[3] || '.';
const read = (f) => JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
// Latin-script names for every place; other scripts only for big cities and countries (file size)
const LATIN = ['en', 'tr', 'de', 'es', 'fr', 'it', 'pt', 'nl', 'pl', 'sv', 'hu', 'id', 'vi'];
const OTHER = ['ru', 'uk', 'el', 'ar', 'fa', 'he', 'hi', 'bn', 'ur', 'zh', 'zht', 'ja', 'ko'];
const LANGS = [...LATIN, ...OTHER];
const fold = (s) => String(s).toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').trim();
const alts = (main, list) => {
  const seen = new Set([fold(main)]);
  const out = [];
  for (const v of list.flatMap((x) => String(x || '').split('|'))) {
    const s = v.trim();
    if (!s || seen.has(fold(s))) continue;
    seen.add(fold(s));
    out.push(s);
  }
  return out;
};
const r3 = (v) => +(+v).toFixed(3);

// ── regions ────────────────────────────────────────────────────────────────
const a1 = read('ne_10m_admin_1_states_provinces.geojson').features.filter((f) => f.geometry && f.properties.iso_a2 && f.properties.iso_a2 !== '-1');
const tr = a1.filter((f) => f.properties.iso_a2 === 'TR').map((f) => ({ type: 'Feature', geometry: f.geometry, properties: { name: f.properties.name_tr || f.properties.name, iso: f.properties.iso_3166_2, lat: f.properties.latitude, lon: f.properties.longitude } }));
let topo = topology({ provinces: { type: 'FeatureCollection', features: tr } }, 1e5);
topo = presimplify(topo);
topo = simplify(topo, quantile(topo, 0.12));
fs.writeFileSync(`${D}/tr-provinces.json`, JSON.stringify(topo));

const regions = a1.map((f) => ({ type: 'Feature', geometry: f.geometry, properties: { n: f.properties.iso_a2 === 'TR' ? f.properties.name_tr || f.properties.name : f.properties.name_en || f.properties.name, c: f.properties.iso_a2 } }));
let rt = topology({ regions: { type: 'FeatureCollection', features: regions } }, 2e4);
rt = presimplify(rt);
rt = simplify(rt, quantile(rt, Number(process.env.KEEP || 0.03)));
fs.writeFileSync(`${D}/admin1.json`, JSON.stringify(rt));

// ── countries ──────────────────────────────────────────────────────────────
const countries = {};
const places = [];
for (const f of read('ne_50m_admin_0_countries.geojson').features) {
  const p = f.properties;
  const iso = p.ISO_A2 !== '-99' ? p.ISO_A2 : p.ISO_A2_EH;
  if (!iso || iso === '-99') continue;
  const names = [p.NAME, ...alts(p.NAME, [p.NAME_LONG, p.NAME_ALT, p.NAME_CIAWF, p.NAME_SORT, ...LANGS.map((l) => p[`NAME_${l.toUpperCase()}`])])];
  // dependencies can share their sovereign's code (Ashmore Is. = AU): the country itself owns the code
  const main = !/Dependency|Lease|Indeterminate/.test(p.TYPE || '');
  if (!countries[iso] || (main && !countries[iso].main)) countries[iso] = Object.assign(names, { main });
  places.push([p.NAME, r3(p.LABEL_Y), r3(p.LABEL_X), main ? 3 : 6, iso, main ? p.NAME : p.SOVEREIGNT || p.NAME, '', names.slice(1)]);
}
const countryName = (iso) => (countries[iso] ? countries[iso][0] : '');

// ── cities ─────────────────────────────────────────────────────────────────
for (const f of read('ne_10m_populated_places.geojson').features) {
  const p = f.properties;
  const name = p.ISO_A2 === 'TR' && p.NAME_TR ? p.NAME_TR : p.NAME;
  places.push([name, r3(p.LATITUDE), r3(p.LONGITUDE), p.SCALERANK, p.ISO_A2, countryName(p.ISO_A2) || p.ADM0NAME, p.ADM1NAME || '', alts(name, [p.NAME, p.NAMEASCII, p.NAMEALT, p.NAMEPAR, p.MEGANAME, p.LS_NAME, ...(p.SCALERANK <= 4 ? LANGS : LATIN).map((l) => p[`NAME_${l.toUpperCase()}`])])]);
}
// ── regions as places (centroids) ──────────────────────────────────────────
for (const f of a1) {
  const p = f.properties;
  const name = p.iso_a2 === 'TR' ? p.name_tr || p.name : p.name_en || p.name;
  places.push([name, r3(p.latitude), r3(p.longitude), p.iso_a2 === 'TR' ? 1 : 9, p.iso_a2, countryName(p.iso_a2) || p.admin, name, alts(name, [p.name, p.name_alt, p.name_local, p.gn_name, p.woe_name, ...LATIN.map((l) => p[`name_${l}`])])]);
}
fs.writeFileSync(`${D}/places.json`, JSON.stringify({ places, countries }));

if (process.env.WORLD) for (const n of ['50m', '110m']) fs.copyFileSync(`node_modules/world-atlas/countries-${n}.json`, `${D}/world-${n}.json`);
const kb = (f) => (fs.statSync(`${D}/${f}`).size / 1024).toFixed(0) + ' KB';
console.log(`ok · ${tr.length} TR provinces (${kb('tr-provinces.json')}) · ${regions.length} regions (${kb('admin1.json')}) · ${places.length} places (${kb('places.json')})`);
