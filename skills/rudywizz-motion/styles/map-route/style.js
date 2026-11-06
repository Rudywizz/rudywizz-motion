// map-route — fly a camera across a globe, a flat world map or Turkey's 81
// provinces; the route draws itself leg by leg, an icon rides the line, pins
// drop with ripples and labels type in. Themes: dark (travel), atlas (history),
// light (minimal). Places: city/province names (Turkish ok), "lat,lon", or
// { name, lat, lon }.
import * as geo from '../../engine/vendor/geo.min.js';

const ALIASES = {
  kapadokya: [38.643, 34.828], goreme: [38.643, 34.828], cappadocia: [38.643, 34.828], efes: [37.94, 27.341], ephesus: [37.94, 27.341],
  pamukkale: [37.92, 29.12], troya: [39.957, 26.239], truva: [39.957, 26.239], 'nemrut dagi': [37.981, 38.741], sumela: [40.69, 39.658],
  'gobeklitepe': [37.223, 38.922], 'ani': [40.507, 43.573], 'kas': [36.202, 29.637], 'bodrum': [37.035, 27.43], 'karacabey': [40.214, 28.36],
  'mudanya': [40.375, 28.883], 'uludag': [40.07, 29.22], 'safranbolu': [41.25, 32.69], 'alanya': [36.544, 31.999], 'fethiye': [36.622, 29.116],
  'cesme': [38.323, 26.303], 'oludeniz': [36.55, 29.12], 'kusadasi': [37.857, 27.26], 'marmaris': [36.855, 28.274], 'side': [36.767, 31.389],
  londra: 'London', viyana: 'Vienna', roma: 'Rome', atina: 'Athens', kahire: 'Cairo', moskova: 'Moscow', bagdat: 'Baghdad', sam: 'Damascus',
  kudus: 'Jerusalem', mekke: 'Mecca', medine: 'Medina', tahran: 'Tehran', belgrad: 'Belgrade', budapeste: 'Budapest', varsova: 'Warsaw',
  prag: 'Prague', venedik: 'Venice', cenova: 'Genoa', floransa: 'Florence', selanik: 'Thessaloniki', uskup: 'Skopje', saraybosna: 'Sarajevo',
  semerkant: 'Samarkand', buhara: 'Bukhara', isfahan: 'Esfahan', tebriz: 'Tabriz', halep: 'Aleppo', musul: 'Mosul', trablus: 'Tripoli',
  tunus: 'Tunis', cezayir: 'Algiers', lizbon: 'Lisbon', bruksel: 'Brussels', kopenhag: 'Copenhagen', stokholm: 'Stockholm', pekin: 'Beijing',
  'yeni delhi': 'New Delhi', barselona: 'Barcelona', milano: 'Milan', napoli: 'Naples', munih: 'Munich', cenevre: 'Geneva', zurih: 'Zurich',
  marsilya: 'Marseille', kopenhang: 'Copenhagen', dublin: 'Dublin', lahey: 'The Hague', bukres: 'Bucharest', sofya: 'Sofia', tiflis: 'Tbilisi',
  bakü: 'Baku', baku: 'Baku', erivan: 'Yerevan', 'kudus-i serif': 'Jerusalem', beyrut: 'Beirut', amman: 'Amman', dubai: 'Dubai', doha: 'Doha',
  riyad: 'Riyadh', iskenderiye: 'Alexandria', fas: 'Fez', kazablanka: 'Casablanca', kiev: 'Kiev', minsk: 'Minsk', vilnius: 'Vilnius', helsinki: 'Helsinki',
  oslo: 'Oslo', seul: 'Seoul', singapur: 'Singapore', bangkok: 'Bangkok', 'los angeles': 'Los Angeles', 'san francisco': 'San Francisco', 'rio de janeiro': 'Rio de Janeiro', konstantiniyye: 'Istanbul', bizans: 'Istanbul', dimetoka: [41.35, 26.49], sogut: [40.018, 30.181], manzikert: [39.143, 42.539],
  malazgirt: [39.143, 42.539], 'tokyo': 'Tokyo', 'new york': 'New York', 'buenos aires': 'Buenos Aires', 'kirim': [44.95, 34.1],
};
const COUNTRY_ALIASES = { turkiye: 'Turkey', 'türkiye': 'Turkey', yunanistan: 'Greece', iran: 'Iran', misir: 'Egypt', italya: 'Italy', ispanya: 'Spain', almanya: 'Germany', fransa: 'France', ingiltere: 'United Kingdom', rusya: 'Russia', cin: 'China', japonya: 'Japan', abd: 'United States of America' };

const THEMES = {
  dark: { bg0: '#04060d', bg1: '#0b1330', ocean: '#081022', land: '#1e2a52', coast: '#4b62a8', border: 'rgba(110,140,230,0.35)', grat: 'rgba(120,150,255,0.07)', route: '#46f5c8', todo: 'rgba(255,255,255,0.18)', pin: '#ff3d7f', label: '#ffffff', labelBg: 'rgba(5,8,20,0.75)', hi: '#3a2f8f', atmo: 'rgba(80,140,255,0.45)', font: ['Syne', 800], title: ['Syne', 800] },
  atlas: { bg0: '#cdc3a0', bg1: '#b9ad86', ocean: '#c6bf9b', land: '#ecdcb3', coast: '#6b4b2a', border: 'rgba(107,75,42,0.45)', grat: 'rgba(107,75,42,0.18)', route: '#8b1e1e', todo: 'rgba(139,30,30,0.25)', pin: '#8b1e1e', label: '#3b2614', labelBg: 'rgba(0,0,0,0)', hi: '#c49a5a', atmo: 'rgba(107,75,42,0.25)', font: ['Cormorant Garamond', 700, 'italic'], title: ['Cinzel', 900] },
  light: { bg0: '#f4f2ec', bg1: '#e9e6dd', ocean: '#eef0f2', land: '#d9dcd3', coast: '#b3b8ad', border: '#c4c8bd', grat: 'rgba(0,0,0,0.05)', route: '#ff4b1f', todo: 'rgba(0,0,0,0.15)', pin: '#111111', label: '#111111', labelBg: 'rgba(255,255,255,0.85)', hi: '#ffd2c2', atmo: 'rgba(0,0,0,0.06)', font: ['Bricolage Grotesque', 800], title: ['Bricolage Grotesque', 800] },
};

const fold = (s) => String(s).toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').trim();

export default {
  id: 'map-route',
  title: 'Map Route',
  tagline: 'Fly a route across a globe, world map or Turkey; pins + labels',
  fonts: [['Syne', 800], ['Cormorant Garamond', 700, 'italic'], ['Cinzel', 900], ['Bricolage Grotesque', 800], ['Space Grotesk', 700]],
  defaults: {
    text: '',
    route: ['İstanbul', 'Kapadokya', 'Antalya'],
    duration: 8,
    mode: 'auto',
    theme: 'dark',
    icon: 'auto',
    highlight: [],
    labels: true,
  },
  options: {
    route: 'Array of places: names (Turkish ok), "lat,lon" strings or {name, lat, lon}',
    mode: 'globe | flat | turkey | auto',
    theme: 'dark | atlas | light',
    icon: 'plane | ship | dot | auto',
    highlight: 'Countries (e.g. "Türkiye", "Italy") or provinces to tint',
    text: 'Optional title at the top',
    labels: 'Show place labels (true/false)',
  },

  async setup(api) {
    const { p, W, H } = api;
    const [w50, w110, trp, places] = await Promise.all(
      ['data/world-50m.json', 'data/world-110m.json', 'data/tr-provinces.json', 'data/places.json'].map((f) => fetch(api.asset(f)).then((r) => r.json())),
    );
    const countries50 = geo.feature(w50, w50.objects.countries).features;
    const countries110 = geo.feature(w110, w110.objects.countries).features;
    const provinces = geo.feature(trp, trp.objects.provinces).features;
    const index = new Map();
    for (const [name, lat, lon, rank, iso] of places) {
      const k = fold(name);
      const cur = index.get(k);
      if (!cur || rank < cur.rank || (iso === 'TR' && cur.iso !== 'TR')) index.set(k, { lat, lon, rank, iso });
    }
    const resolve = (q) => {
      if (q && typeof q === 'object') return { name: q.name || q.label || '', lat: +q.lat, lon: +q.lon };
      const s = String(q);
      const m = s.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (m) return { name: '', lat: +m[1], lon: +m[2] };
      let k = fold(s);
      let a = ALIASES[k];
      if (Array.isArray(a)) return { name: s, lat: a[0], lon: a[1] };
      if (typeof a === 'string') k = fold(a);
      const hit = index.get(k);
      if (!hit) throw new Error(`map-route: unknown place "${s}". Use "lat,lon" or {name, lat, lon}.`);
      return { name: s, lat: hit.lat, lon: hit.lon };
    };
    const pts = (Array.isArray(p.route) ? p.route : String(p.route).split(/\s*(?:→|->|>)\s*/)).map(resolve);
    if (!pts.length) throw new Error('map-route: route is empty');
    const allTR = pts.every((q) => q.lat > 35.7 && q.lat < 42.2 && q.lon > 25.6 && q.lon < 44.9);
    const maxD = pts.reduce((m, a) => Math.max(m, ...pts.map((b) => geo.geoDistance([a.lon, a.lat], [b.lon, b.lat]))), 0);
    // whole-country view only when the route spans a good part of Turkey; tight routes zoom in on a flat map
    const mode = p.mode === 'auto' ? (allTR && maxD > 0.1 ? 'turkey' : maxD > 0.6 ? 'globe' : 'flat') : p.mode;
    const theme = THEMES[p.theme] || THEMES.dark;
    const icon = p.icon === 'auto' ? (p.theme === 'atlas' ? 'ship' : 'plane') : p.icon;
    const hiNames = new Set((p.highlight || []).map((h) => fold(COUNTRY_ALIASES[fold(h)] || h)));
    if (mode === 'turkey' && !(p.highlight || []).length) for (const q of pts) hiNames.add(fold(q.name));
    const trFit = geo.geoMercator().fitExtent([[W * 0.06, H * 0.3], [W * 0.94, H * 0.62]], { type: 'FeatureCollection', features: provinces });
    return {
      pts, mode, theme, icon, countries50, countries110, provinces, hiNames, trFit,
      grain: api.makeGrain(W, H, p.seed + 31, 3),
      graticule: geo.geoGraticule10(),
    };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, ease, prog, S, lerp } = api;
    const { pts, theme: T, mode } = s;
    const D = p.duration;
    const n = pts.length;
    const I = D * 0.12; // intro
    const O = D * (n > 1 ? 0.86 : 0.6); // outro start
    const legDur = n > 1 ? (O - I) / (n - 1) : 0;
    const flyFrac = 0.62; // part of each leg spent flying (rest = arrival)
    const cy = H * 0.47;

    // ---------- camera (lon, lat, scale) ----------
    const P = (q) => [q.lon, q.lat];
    const baseScale = mode === 'globe' ? W * 0.42 : mode === 'turkey' ? s.trFit.scale() : W * 0.9;
    const legScale = (a, b) => {
      const d = Math.max(0.02, geo.geoDistance(P(a), P(b)));
      if (mode === 'turkey') return Math.min(baseScale * 1.5, Math.max(baseScale * 1.0, (W * 0.45) / d));
      return Math.min(W * 14, Math.max(baseScale, (W * 0.55) / d));
    };
    const centroid = geo.geoCentroid({ type: 'MultiPoint', coordinates: pts.map(P) });
    const spread = Math.max(0.03, ...pts.map((q) => geo.geoDistance(P(q), centroid)));
    const outroScale = mode === 'turkey' ? baseScale * 1.05 : Math.min(W * 10, Math.max(baseScale, (W * 0.32) / spread));
    const trCenter = s.trFit.invert([W / 2, cy]);

    let center;
    let scale;
    let legI = -1;
    let legE = 0;
    if (t < I) {
      const e = ease.inOutCubic(prog(t, 0, I));
      const start = mode === 'turkey' ? trCenter : [pts[0].lon + 70, pts[0].lat - 15];
      center = geo.geoInterpolate(start, mode === 'turkey' ? trCenter : P(pts[0]))(e);
      const s0 = mode === 'globe' ? W * 0.3 : baseScale * 0.85;
      scale = lerp(s0, n > 1 ? legScale(pts[0], pts[1]) : outroScale, e);
    } else if (t < O && n > 1) {
      legI = Math.min(n - 2, Math.floor((t - I) / legDur));
      const lt = t - I - legI * legDur;
      legE = ease.inOutCubic(prog(lt, 0, legDur * flyFrac));
      const a = pts[legI];
      const b = pts[legI + 1];
      const sA = legScale(a, b);
      const sB = legI + 2 < n ? legScale(b, pts[legI + 2]) : outroScale;
      if (mode === 'turkey') center = geo.geoInterpolate(trCenter, geo.geoInterpolate(P(a), P(b))(legE))(0.3);
      else center = geo.geoInterpolate(P(a), P(b))(legE);
      const settle = ease.inOutCubic(prog(lt, legDur * flyFrac, legDur));
      scale = lerp(sA, sB, settle) * (1 - 0.28 * Math.sin(Math.PI * legE));
    } else {
      const e = ease.inOutCubic(prog(t, O, Math.min(D, O + D * 0.1)));
      const last = mode === 'turkey' ? trCenter : P(pts[n - 1]);
      center = mode === 'turkey' ? trCenter : geo.geoInterpolate(last, centroid)(e);
      scale = lerp(n > 1 ? outroScale * 1.1 : legScale(pts[0], pts[0]), outroScale, e);
      legI = n - 1;
      legE = 1;
    }
    const proj = mode === 'globe'
      ? geo.geoOrthographic().rotate([-center[0], -center[1]]).scale(scale).translate([W / 2, cy]).clipAngle(90).precision(0.6)
      : geo.geoMercator().rotate([-center[0], 0]).center([0, center[1]]).scale(scale).translate([W / 2, cy]).precision(0.6);
    const path = geo.geoPath(proj, ctx);

    // ---------- background ----------
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, T.bg0);
    g.addColorStop(1, T.bg1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (p.theme === 'dark') {
      for (let i = 0; i < 120; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.35 * api.hash(i, 9)})`;
        ctx.fillRect(api.hash(i, 1) * W, api.hash(i, 2) * H, 2 * S, 2 * S);
      }
    }
    if (mode === 'globe') {
      const glow = ctx.createRadialGradient(W / 2, cy, scale * 0.9, W / 2, cy, scale * 1.25);
      glow.addColorStop(0, T.atmo);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      ctx.beginPath();
      path({ type: 'Sphere' });
      const og = ctx.createRadialGradient(W / 2 - scale * 0.3, cy - scale * 0.35, scale * 0.1, W / 2, cy, scale);
      og.addColorStop(0, api.mixHex(T.ocean, '#ffffff', 0.08));
      og.addColorStop(1, T.ocean);
      ctx.fillStyle = og;
      ctx.fill();
    } else {
      ctx.fillStyle = T.ocean;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    path(s.graticule);
    ctx.strokeStyle = T.grat;
    ctx.lineWidth = 1.2 * S;
    ctx.stroke();

    // ---------- land ----------
    const feats = scale < W * 1.3 ? s.countries110 : s.countries50;
    if (p.theme === 'atlas') {
      // engraved coastline ripples
      for (let k = 3; k >= 1; k--) {
        ctx.beginPath();
        for (const f of feats) path(f);
        ctx.strokeStyle = `rgba(107,75,42,${0.07 * (4 - k)})`;
        ctx.lineWidth = k * 9 * S;
        ctx.stroke();
      }
    }
    ctx.beginPath();
    for (const f of feats) path(f);
    ctx.fillStyle = T.land;
    ctx.fill();
    // highlighted countries
    const hiCountries = feats.filter((f) => s.hiNames.has(fold(f.properties.name)));
    if (hiCountries.length) {
      ctx.beginPath();
      for (const f of hiCountries) path(f);
      ctx.fillStyle = T.hi;
      ctx.globalAlpha = ease.outCubic(prog(t, 0.2, 1.2));
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    for (const f of feats) path(f);
    ctx.strokeStyle = T.coast;
    ctx.lineWidth = 1.4 * S;
    ctx.stroke();
    if (mode === 'turkey' || scale > W * 3) {
      ctx.beginPath();
      for (const f of s.provinces) path(f);
      ctx.strokeStyle = T.border;
      ctx.lineWidth = 1.1 * S;
      ctx.stroke();
      const hiProv = s.provinces.filter((f) => s.hiNames.has(fold(f.properties.name)));
      hiProv.forEach((f, k) => {
        const reached = pts.findIndex((q) => fold(q.name) === fold(f.properties.name));
        const at = reached <= 0 ? I * 0.5 : I + (reached - 1) * legDur + legDur * flyFrac;
        const a = ease.outCubic(prog(t, at, at + 0.6));
        if (a <= 0) return;
        ctx.beginPath();
        path(f);
        ctx.fillStyle = api.rgba(T.route, 0.28 * a);
        ctx.fill();
        ctx.strokeStyle = api.rgba(T.route, 0.9 * a);
        ctx.lineWidth = 2.2 * S;
        ctx.stroke();
        void k;
      });
    }

    // ---------- route ----------
    const legLine = (a, b, e) => {
      const ip = geo.geoInterpolate(P(a), P(b));
      const steps = 64;
      const coords = [];
      for (let k = 0; k <= steps * e; k++) coords.push(ip(k / steps));
      coords.push(ip(e));
      return { type: 'LineString', coordinates: coords };
    };
    // upcoming legs (faint)
    ctx.setLineDash([6 * S, 10 * S]);
    ctx.lineWidth = 3 * S;
    ctx.strokeStyle = T.todo;
    for (let i = Math.max(0, legI); i < n - 1; i++) {
      ctx.beginPath();
      path(legLine(pts[i], pts[i + 1], 1));
      ctx.stroke();
    }
    ctx.setLineDash(p.theme === 'atlas' ? [16 * S, 9 * S] : []);
    const routeStroke = () => {
      ctx.lineWidth = (p.theme === 'atlas' ? 5 : 6) * S;
      ctx.strokeStyle = T.route;
      ctx.lineCap = 'round';
      if (p.theme === 'dark') {
        ctx.shadowColor = T.route;
        ctx.shadowBlur = 24 * S;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };
    for (let i = 0; i < Math.max(0, legI); i++) {
      ctx.beginPath();
      path(legLine(pts[i], pts[i + 1], 1));
      routeStroke();
    }
    let head = null;
    if (legI >= 0 && legI < n - 1 && legE > 0) {
      const line = legLine(pts[legI], pts[legI + 1], legE);
      ctx.beginPath();
      path(line);
      routeStroke();
      const ip = geo.geoInterpolate(P(pts[legI]), P(pts[legI + 1]));
      const a = proj(ip(legE));
      const b = proj(ip(Math.min(1, legE + 0.01)));
      if (a && b && legE < 1) head = { x: a[0], y: a[1], ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
    ctx.setLineDash([]);

    // ---------- pins + labels ----------
    pts.forEach((q, i) => {
      const at = i === 0 ? I * 0.6 : I + (i - 1) * legDur + legDur * flyFrac;
      const u = t - at;
      if (u < 0) return;
      const xy = proj(P(q));
      if (!xy) return;
      if (mode === 'globe' && geo.geoDistance(P(q), center) > Math.PI / 2) return;
      const [x, y] = xy;
      // ripple
      for (let r = 0; r < 2; r++) {
        const rp = prog(u, r * 0.25, 1.2 + r * 0.25);
        if (rp <= 0 || rp >= 1) continue;
        ctx.beginPath();
        ctx.arc(x, y, (10 + 70 * ease.outCubic(rp)) * S, 0, Math.PI * 2);
        ctx.strokeStyle = api.rgba(T.pin, 1 - rp);
        ctx.lineWidth = 3 * S;
        ctx.stroke();
      }
      const sp = api.spring(u, { freq: 2.4, damping: 0.42 });
      const drop = (1 - sp) * 60 * S;
      if (p.theme === 'atlas') {
        ctx.save();
        ctx.translate(x, y - drop);
        ctx.fillStyle = T.pin;
        ctx.beginPath();
        ctx.arc(0, 0, 9 * S * Math.min(1, sp + 0.2), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = T.pin;
        ctx.lineWidth = 2 * S;
        ctx.beginPath();
        ctx.arc(0, 0, 16 * S, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(x, y - drop);
        ctx.fillStyle = T.pin;
        ctx.shadowColor = p.theme === 'dark' ? T.pin : 'transparent';
        ctx.shadowBlur = 18 * S;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-18 * S, -22 * S, -18 * S, -46 * S, 0, -46 * S);
        ctx.bezierCurveTo(18 * S, -46 * S, 18 * S, -22 * S, 0, 0);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, -31 * S, 6.5 * S, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (p.labels && q.name) {
        const [fam, wt, st = 'normal'] = T.font;
        const label = p.theme === 'atlas' ? q.name : api.upper(q.name, p.lang || 'tr');
        const chars = api.graphemes(label);
        const shown = chars.slice(0, Math.floor(prog(u, 0.15, 0.7) * chars.length + 0.999)).join('');
        if (!shown) return;
        const fs = (p.theme === 'atlas' ? 54 : 38) * S;
        ctx.font = `${st} ${wt} ${Math.round(fs)}px "${fam}"`;
        ctx.textBaseline = 'middle';
        const lw = ctx.measureText(label).width;
        let lx = x + 34 * S;
        if (lx + lw > W - 40 * S) lx = x - 34 * S - lw;
        const ly = y - (p.theme === 'atlas' ? 26 : 30) * S;
        if (T.labelBg !== 'rgba(0,0,0,0)') {
          ctx.fillStyle = T.labelBg;
          api.roundRect(ctx, lx - 16 * S, ly - fs * 0.75, lw + 32 * S, fs * 1.5, 10 * S);
          ctx.fill();
        }
        ctx.fillStyle = T.label;
        ctx.fillText(shown, lx, ly);
        if (p.theme === 'atlas') {
          ctx.strokeStyle = api.rgba(T.label, 0.6);
          ctx.lineWidth = 1.5 * S;
          ctx.beginPath();
          ctx.moveTo(lx, ly + fs * 0.45);
          ctx.quadraticCurveTo(lx + lw * 0.5, ly + fs * 0.7, lx + lw * prog(u, 0.4, 1), ly + fs * 0.45);
          ctx.stroke();
        }
      }
    });

    // ---------- moving icon ----------
    if (head) drawIcon(api, s.icon, head, T);

    // ---------- title ----------
    if (p.text) {
      const [fam, wt] = T.title;
      const a = ease.outCubic(prog(t, 0.2, 1.0));
      const title = p.theme === 'atlas' ? api.upper(p.text, p.lang || 'tr') : p.text;
      ctx.font = api.font(84 * S, fam, wt);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(title).width;
      const fs = Math.min(84 * S, (84 * S * W * 0.84) / Math.max(1, tw));
      ctx.font = api.font(fs, fam, wt);
      ctx.globalAlpha = a;
      const ty = H * 0.12 + (1 - a) * 30 * S;
      if (p.theme === 'atlas') {
        // cartouche
        const bw = Math.min(W * 0.9, ctx.measureText(title).width + 120 * S);
        ctx.strokeStyle = T.coast;
        ctx.lineWidth = 3 * S;
        ctx.strokeRect(W / 2 - bw / 2, ty - fs, bw, fs * 2);
        ctx.lineWidth = 1.2 * S;
        ctx.strokeRect(W / 2 - bw / 2 + 10 * S, ty - fs + 10 * S, bw - 20 * S, fs * 2 - 20 * S);
      }
      ctx.fillStyle = p.theme === 'atlas' ? T.label : p.theme === 'dark' ? '#ffffff' : '#111111';
      ctx.fillText(title, W / 2, ty);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }
    if (p.theme === 'atlas') {
      compass(ctx, W - 150 * S, H - 230 * S, 95 * S, T, t);
      s.grain(ctx, 0, 0.12, 'multiply');
      api.vignette(ctx, W, H, 0.35, '70,40,10');
    } else if (p.theme === 'dark') api.vignette(ctx, W, H, 0.55);
  },
};

function drawIcon(api, kind, h, T) {
  const { ctx, S } = api;
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(h.ang);
  const k = S * 1.25;
  if (kind === 'plane') {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = T.route;
    ctx.shadowBlur = 20 * S;
    ctx.beginPath();
    const P = [[26, 0], [8, -4], [-6, -26], [-12, -26], [-4, -4], [-18, -4], [-24, -12], [-28, -12], [-24, 0], [-28, 12], [-24, 12], [-18, 4], [-4, 4], [-12, 26], [-6, 26], [8, 4]];
    P.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)));
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'ship') {
    ctx.rotate(-h.ang);
    ctx.fillStyle = '#3b2614';
    ctx.beginPath();
    ctx.moveTo(-26 * k, 0);
    ctx.lineTo(26 * k, 0);
    ctx.lineTo(18 * k, 10 * k);
    ctx.lineTo(-18 * k, 10 * k);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-1.5 * k, -34 * k, 3 * k, 34 * k);
    ctx.fillStyle = '#f3ead2';
    ctx.strokeStyle = '#3b2614';
    ctx.lineWidth = 2 * S;
    ctx.beginPath();
    ctx.moveTo(2 * k, -32 * k);
    ctx.quadraticCurveTo(22 * k, -18 * k, 2 * k, -4 * k);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-2 * k, -28 * k);
    ctx.quadraticCurveTo(-18 * k, -16 * k, -2 * k, -6 * k);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = T.route;
    ctx.shadowBlur = 25 * S;
    ctx.beginPath();
    ctx.arc(0, 0, 11 * S, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function compass(ctx, x, y, r, T, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.4) * 0.03);
  ctx.strokeStyle = T.coast;
  ctx.fillStyle = T.coast;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const len = i % 2 ? r * 0.55 : r * 0.95;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, -len);
    ctx.lineTo(r * 0.09, 0);
    ctx.lineTo(0, r * 0.09);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -len);
    ctx.lineTo(-r * 0.09, 0);
    ctx.lineTo(0, r * 0.09);
    ctx.closePath();
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  ctx.font = `700 ${Math.round(r * 0.32)}px "Cinzel"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', 0, -r * 1.22);
  ctx.restore();
}
