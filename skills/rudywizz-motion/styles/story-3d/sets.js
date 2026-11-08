// Procedural 3D sets for story-3d. Everything is primitives + a seeded RNG,
// so a set looks identical on every render.
import * as THREE from '../../engine/vendor/three.bundle.min.js';

const TAU = Math.PI * 2;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const M = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), roughness: o.rough ?? 0.75, metalness: o.metal ?? 0, clearcoat: o.clear ?? 0, emissive: new THREE.Color(o.emissive ?? '#000000'), emissiveIntensity: o.glow ?? 1 });
function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  b.castShadow = b.receiveShadow = true;
  return b;
}
function rbox(w, h, d, r, m, x = 0, y = 0, z = 0) {
  // rounded box from a shape extrude
  const s = new THREE.Shape();
  const hw = w / 2 - r, hh = h / 2 - r;
  s.moveTo(-hw, -h / 2);
  s.lineTo(hw, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -hh);
  s.lineTo(w / 2, hh);
  s.quadraticCurveTo(w / 2, h / 2, hw, h / 2);
  s.lineTo(-hw, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, hh);
  s.lineTo(-w / 2, -hh);
  s.quadraticCurveTo(-w / 2, -h / 2, -hw, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.6, bevelSegments: 4, curveSegments: 8 });
  g.translate(0, 0, -(d - r * 2) / 2);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
function cyl(rt, rb, h, m, x = 0, y = 0, z = 0, seg = 24) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  c.position.set(x, y, z);
  c.castShadow = c.receiveShadow = true;
  return c;
}
function sphere(r, m, x = 0, y = 0, z = 0) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), m);
  s.position.set(x, y, z);
  s.castShadow = s.receiveShadow = true;
  return s;
}

/** Curved cyclorama: floor that bends up into the back wall (no horizon line). */
function cyclorama(color, width = 30) {
  const R = 3;
  const shape = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * (Math.PI / 2);
    shape.push([-6 + 0 + Math.sin(a) * R, R - Math.cos(a) * R]);
  }
  const pts = [[12, 0], [-3, 0], ...shape.map(([z, y]) => [z - 3 + 3, y]), [-6, 14]];
  const geo = new THREE.BufferGeometry();
  const pos = [];
  const idx = [];
  const prof = [[8, 0], [-4, 0]];
  for (let i = 1; i <= 16; i++) {
    const a = (i / 16) * (Math.PI / 2);
    prof.push([-4 - Math.sin(a) * R, R - Math.cos(a) * R]);
  }
  prof.push([-4 - R, 14]);
  for (const [z, y] of prof) {
    pos.push(-width / 2, y, z, width / 2, y, z);
  }
  for (let i = 0; i < prof.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, M(color, { rough: 0.92 }));
  m.receiveShadow = true;
  m.userData.ground = true;
  void pts;
  return m;
}

function plant(m, pot, x, z, s = 1) {
  const g = new THREE.Group();
  g.add(cyl(0.16 * s, 0.12 * s, 0.3 * s, pot, 0, 0.15 * s, 0));
  const leaf = M('#3f9a5b', { rough: 0.6, clear: 0.2 });
  const r = rng(Math.round(x * 100 + z * 7));
  for (let i = 0; i < 9; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 16, 12), leaf);
    l.scale.set(0.5, 1.6, 0.25);
    const a = (i / 9) * TAU;
    l.position.set(Math.cos(a) * 0.08 * s, 0.45 * s + r() * 0.15 * s, Math.sin(a) * 0.08 * s);
    l.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    l.castShadow = true;
    g.add(l);
  }
  g.position.set(x, 0, z);
  return g;
}

function tree(x, z, s, seed, leafColor = '#4caf6a') {
  const g = new THREE.Group();
  g.add(cyl(0.08 * s, 0.11 * s, 1.0 * s, M('#7a5236'), 0, 0.5 * s, 0, 12));
  const r = rng(seed);
  const leaf = M(leafColor, { rough: 0.7, clear: 0.15 });
  for (let i = 0; i < 5; i++) {
    g.add(sphere((0.38 + r() * 0.18) * s, leaf, (r() - 0.5) * 0.5 * s, (1.15 + r() * 0.45) * s, (r() - 0.5) * 0.4 * s));
  }
  g.position.set(x, 0, z);
  return g;
}

export const SETS = ['studio', 'room', 'office', 'street', 'park', 'night', 'space'];

/** Build a set. Returns { group, sky (bg colour or null), lights tweak }. */
export function buildSet(name, opts = {}) {
  const g = new THREE.Group();
  const accent = opts.accent || '#ff6b4a';
  let bg = opts.bg || null;
  let mood = { key: 1.0, fill: 0.55, warm: '#fff1dc', env: 0.7, fog: null };

  if (name === 'room' || name === 'office') {
    const wall = name === 'office' ? '#dfe6ee' : opts.wall || '#f1d9c4';
    const floor = name === 'office' ? '#b9c2cc' : '#c99a6e';
    const fl = box(20, 0.1, 12, M(floor, { rough: 0.6, clear: 0.2 }), 0, -0.05, 0);
    fl.userData.ground = true;
    g.add(fl);
    g.add(box(20, 8, 0.2, M(wall, { rough: 0.95 }), 0, 4, -3));
    // skirting
    g.add(box(20, 0.14, 0.06, M('#ffffff', { rough: 0.5 }), 0, 0.07, -2.88));
    // window with a glowing sky
    const win = new THREE.Group();
    win.add(box(1.9, 1.5, 0.08, M('#bfe4ff', { emissive: '#bfe4ff', glow: 0.9 }), 0, 0, 0));
    const frame = M('#ffffff', { rough: 0.4, clear: 0.3 });
    win.add(box(2.06, 0.08, 0.14, frame, 0, 0.78, 0.03), box(2.06, 0.08, 0.14, frame, 0, -0.78, 0.03), box(0.08, 1.6, 0.14, frame, -1.0, 0, 0.03), box(0.08, 1.6, 0.14, frame, 1.0, 0, 0.03), box(0.05, 1.5, 0.1, frame, 0, 0, 0.03));
    win.position.set(-1.9, 1.95, -2.85);
    g.add(win);
    // picture frame
    g.add(box(0.9, 0.65, 0.05, M('#2b2b2b'), 1.9, 2.0, -2.86));
    g.add(box(0.78, 0.53, 0.02, M(accent, { emissive: accent, glow: 0.12 }), 1.9, 2.0, -2.83));
    if (name === 'room') {
      // sofa
      const sofa = M(opts.sofa || '#5b6bd5', { rough: 0.85 });
      g.add(rbox(2.4, 0.45, 0.9, 0.12, sofa, 1.6, 0.3, -2.3));
      g.add(rbox(2.4, 0.75, 0.25, 0.1, sofa, 1.6, 0.75, -2.7));
      g.add(rbox(0.25, 0.6, 0.9, 0.1, sofa, 0.45, 0.45, -2.3), rbox(0.25, 0.6, 0.9, 0.1, sofa, 2.75, 0.45, -2.3));
      g.add(plant(M('#fafafa'), M('#e07a5f'), -3.2, -2.4, 1.6));
      // floor lamp
      const lampM = M('#222222', { rough: 0.4, metal: 0.3 });
      g.add(cyl(0.02, 0.02, 1.6, lampM, -0.6, 0.8, -2.5, 8), cyl(0.18, 0.02, 0.05, lampM, -0.6, 0.02, -2.5));
      g.add(cyl(0.12, 0.24, 0.3, M('#fff3d6', { emissive: '#ffd89a', glow: 0.8 }), -0.6, 1.65, -2.5));
      // rug
      const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.01, 48), M(accent, { rough: 1 }));
      rug.scale.z = 0.55;
      rug.position.set(0, 0.006, 0.2);
      rug.receiveShadow = true;
      g.add(rug);
    } else {
      // desk + monitor + shelf
      const wood = M('#d8b48a', { rough: 0.55, clear: 0.2 });
      g.add(rbox(2.2, 0.08, 0.9, 0.03, wood, 1.7, 0.78, -2.2));
      for (const dx of [-1, 1]) g.add(box(0.06, 0.78, 0.8, M('#2d2d2d'), 1.7 + dx * 1.0, 0.39, -2.2));
      g.add(rbox(1.0, 0.6, 0.05, 0.02, M('#1b1b1b', { rough: 0.3, clear: 0.6 }), 1.7, 1.25, -2.5));
      g.add(box(0.92, 0.52, 0.01, M('#3da5ff', { emissive: '#3da5ff', glow: 0.7 }), 1.7, 1.25, -2.47));
      g.add(box(0.08, 0.3, 0.08, M('#1b1b1b'), 1.7, 0.95, -2.52));
      g.add(box(1.6, 0.05, 0.35, wood, -1.9, 2.9, -2.8), box(1.6, 0.05, 0.35, wood, -1.9, 3.4, -2.8));
      const r = rng(5);
      for (let i = 0; i < 9; i++) g.add(box(0.1, 0.32 + r() * 0.1, 0.25, M(['#ff6b4a', '#3da5ff', '#ffd23f', '#3ddc97'][i % 4]), -2.55 + i * 0.15, 3.1, -2.8));
      g.add(plant(M('#fafafa'), M('#ffffff'), -3.4, -2.3, 1.5));
    }
    mood = { key: 1.05, fill: 0.6, warm: '#fff0dd', env: 0.75 };
  } else if (name === 'street' || name === 'night') {
    const night = name === 'night';
    bg = bg || (night ? '#0b1030' : '#9fd6ff');
    const walk = box(30, 0.1, 6, M(night ? '#3a3f55' : '#c9c3ba', { rough: 0.9 }), 0, -0.05, 0.5);
    walk.userData.ground = true;
    g.add(walk);
    g.add(box(30, 0.12, 0.25, M(night ? '#555a70' : '#e8e2d8'), 0, 0.01, 3.4));
    g.add(box(30, 0.08, 6, M(night ? '#1d2133' : '#5d6470', { rough: 0.95 }), 0, -0.1, 6.5));
    const r = rng(night ? 11 : 7);
    const cols = night ? ['#2a2f4a', '#33395a', '#262b45', '#3a3260'] : ['#ffb4a2', '#ffd6a5', '#bde0fe', '#cdb4db', '#fdffb6', '#caffbf'];
    let x = -14;
    while (x < 14) {
      const w = 2 + r() * 1.8;
      const h = 3.5 + r() * 4.5;
      const d = 2.5;
      const c = cols[Math.floor(r() * cols.length)];
      g.add(box(w - 0.08, h, d, M(c, { rough: 0.85 }), x + w / 2, h / 2, -3.2 - d / 2));
      // windows
      const winM = night ? M('#ffd88a', { emissive: '#ffcf6b', glow: 1.2 }) : M('#6fa8d6', { rough: 0.2, clear: 0.8 });
      const darkM = M(night ? '#151933' : '#4a7fa8', { rough: 0.3 });
      for (let wy = 1.1; wy < h - 0.6; wy += 1.0) {
        for (let wx = x + 0.45; wx < x + w - 0.45; wx += 0.7) {
          const lit = !night || r() > 0.45;
          g.add(box(0.36, 0.5, 0.04, lit ? winM : darkM, wx + 0.18, wy, -3.18));
        }
      }
      x += w;
    }
    // street lamps
    for (const lx of [-5, 0.2, 5.5]) {
      const pole = M('#2b2f3a', { rough: 0.4, metal: 0.4 });
      g.add(cyl(0.04, 0.05, 2.8, pole, lx, 1.4, -1.8, 10));
      g.add(sphere(0.14, M('#fff4d6', { emissive: '#ffdf9e', glow: night ? 3 : 0.6 }), lx, 2.85, -1.8));
    }
    if (!night) g.add(tree(-2.6, -2.1, 1.1, 3), tree(3.2, -2.1, 1.0, 9));
    if (night) {
      // stars + moon
      const starM = M('#ffffff', { emissive: '#ffffff', glow: 2 });
      for (let i = 0; i < 140; i++) g.add(sphere(0.02 + r() * 0.03, starM, (r() - 0.5) * 40, 6 + r() * 10, -12 - r() * 4));
      g.add(sphere(0.9, M('#fff6d8', { emissive: '#fff1c2', glow: 1.4 }), 6, 10, -14));
    }
    mood = night ? { key: 0.45, fill: 0.35, warm: '#9fb4ff', env: 0.35, rim: '#ff7ad9' } : { key: 1.15, fill: 0.6, warm: '#fff4e0', env: 0.8 };
  } else if (name === 'park') {
    bg = bg || '#a8dcff';
    const grass = new THREE.Mesh(new THREE.CircleGeometry(30, 64), M('#7cc86b', { rough: 0.95 }));
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    grass.userData.ground = true;
    g.add(grass);
    // path
    const path = new THREE.Mesh(new THREE.PlaneGeometry(40, 1.6), M('#e9d8b4', { rough: 1 }));
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.005, 0.4);
    path.receiveShadow = true;
    g.add(path);
    const r = rng(21);
    for (let i = 0; i < 14; i++) {
      const tx = (i - 7) * 2.1 + (r() - 0.5) * 0.8;
      g.add(tree(tx, -3 - r() * 4, 0.9 + r() * 0.8, 30 + i, ['#4caf6a', '#5dbb63', '#3f9a5b', '#7bc96f'][i % 4]));
    }
    // hills
    for (const [hx, hz, hr, hc] of [[-8, -16, 7, '#8fd17e'], [6, -18, 9, '#9ad98a'], [16, -14, 6, '#86c975']]) {
      const hill = sphere(hr, M(hc, { rough: 1 }), hx, -hr * 0.55, hz);
      g.add(hill);
    }
    // bench
    const wood = M('#b5793e', { rough: 0.6 });
    g.add(box(1.6, 0.06, 0.45, wood, 2.6, 0.45, -1.4), box(1.6, 0.35, 0.06, wood, 2.6, 0.72, -1.62));
    for (const dx of [-0.7, 0.7]) g.add(box(0.06, 0.45, 0.4, M('#333'), 2.6 + dx, 0.22, -1.4));
    mood = { key: 1.2, fill: 0.6, warm: '#fff5e0', env: 0.85 };
  } else if (name === 'space') {
    bg = bg || '#05060f';
    const r = rng(42);
    const starM = M('#ffffff', { emissive: '#ffffff', glow: 2.5 });
    for (let i = 0; i < 400; i++) {
      const a = r() * TAU;
      const e = (r() - 0.3) * 1.4;
      const d = 25 + r() * 10;
      g.add(sphere(0.03 + r() * 0.06, starM, Math.cos(a) * Math.cos(e) * d, Math.sin(e) * d + 2, Math.sin(a) * Math.cos(e) * d - 6));
    }
    const planet = sphere(4, M('#ff7a59', { rough: 0.8, emissive: '#ff3d2e', glow: 0.15 }), 7, 5, -18);
    g.add(planet);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.25, 8, 80), M('#ffd6a5', { rough: 0.6, emissive: '#ffb36b', glow: 0.2 }));
    ring.position.copy(planet.position);
    ring.rotation.set(1.2, 0.3, 0);
    g.add(ring);
    // moon surface
    const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 64), M('#9a9cab', { rough: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.ground = true;
    g.add(ground);
    for (let i = 0; i < 18; i++) {
      const c = new THREE.Mesh(new THREE.TorusGeometry(0.3 + r() * 0.8, 0.08, 8, 32), M('#8a8c9b', { rough: 1 }));
      c.rotation.x = -Math.PI / 2;
      c.scale.z = 0.4;
      c.position.set((r() - 0.5) * 16, 0.0, -1 - r() * 8);
      c.receiveShadow = true;
      g.add(c);
    }
    mood = { key: 1.3, fill: 0.25, warm: '#ffffff', env: 0.3, rim: '#6bb8ff' };
  } else {
    // studio
    const c = opts.bg || '#ffd8c2';
    g.add(cyclorama(c));
    bg = c;
    mood = { key: 1.05, fill: 0.65, warm: '#fff4e8', env: 0.8 };
  }
  return { group: g, bg, mood };
}
