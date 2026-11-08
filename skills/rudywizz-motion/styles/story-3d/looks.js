// Material looks for story-3d: one switch turns the whole scene (cast + set)
// into vinyl toys, hand-made clay (stop motion) or glossy toy bricks.
import * as THREE from '../../engine/vendor/three.bundle.min.js';

export const LOOKS = ['vinyl', 'clay', 'brick'];
export const LOOK_ALIASES = { bricks: 'brick', toy: 'vinyl', plastic: 'vinyl', plasticine: 'clay', 'stop-motion': 'clay', lego: 'brick' };

// value noise in 3D, deterministic
function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
}

let clayBump = null;
function clayTexture() {
  if (clayBump) return clayBump;
  // thumb-pressed, slightly streaky surface
  const N = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const c = cv.getContext('2d');
  const img = c.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const n = vnoise(x / 22, y / 22, 0.5) * 0.55 + vnoise(x / 6, y / 9, 3.1) * 0.3 + vnoise(x / 2.2, y / 2.2, 7.7) * 0.15;
      // fingerprint ridges
      const ridge = Math.sin((Math.hypot(x - 300, y - 210) / 3.2) + vnoise(x / 40, y / 40, 9) * 6) * 0.5 + 0.5;
      const v = Math.round((n * 0.8 + ridge * 0.2) * 255);
      const i = (y * N + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  clayBump = new THREE.CanvasTexture(cv);
  clayBump.wrapS = clayBump.wrapT = THREE.RepeatWrapping;
  clayBump.repeat.set(2, 2);
  return clayBump;
}

/** Push vertices in/out along the direction from the mesh centre: hand-made lumps. */
function lumpify(geo, amp, freq, inward = false) {
  if (geo.userData.lumped) return;
  geo.computeBoundingSphere();
  const c = geo.boundingSphere.center;
  const p = geo.attributes.position;
  const d = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    d.set(p.getX(i), p.getY(i), p.getZ(i));
    let n = vnoise(d.x * freq + 11, d.y * freq + 3, d.z * freq + 7) - 0.5;
    if (inward) n = Math.min(0, n) * 1.4;
    const dir = d.clone().sub(c);
    if (dir.lengthSq() < 1e-8) continue;
    dir.normalize().multiplyScalar(n * amp);
    p.setXYZ(i, d.x + dir.x, d.y + dir.y, d.z + dir.z);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  geo.userData.lumped = true;
}

function convert(m, look) {
  if (!m || !m.color) return m;
  const color = m.color.clone();
  const emissive = m.emissive ? m.emissive.clone() : new THREE.Color(0);
  const emissiveIntensity = m.emissiveIntensity ?? 1;
  if (look === 'clay') {
    const hsl = {};
    color.getHSL(hsl);
    color.setHSL(hsl.h, Math.min(1, hsl.s * 1.05), hsl.l * 0.9); // plasticine: a touch deeper
    const out = new THREE.MeshStandardMaterial({ color, roughness: 0.93, metalness: 0, bumpMap: clayTexture(), bumpScale: 2.2, emissive, emissiveIntensity, map: m.map || null, transparent: m.transparent, opacity: m.opacity ?? 1, side: m.side, depthWrite: m.depthWrite, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor });
    return out;
  }
  if (look === 'brick') {
    const hsl = {};
    color.getHSL(hsl);
    color.setHSL(hsl.h, Math.min(1, hsl.s * 1.15 + 0.05), hsl.l);
    return new THREE.MeshPhysicalMaterial({ color, roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, emissive, emissiveIntensity, map: m.map || null, transparent: m.transparent, opacity: m.opacity ?? 1, side: m.side, depthWrite: m.depthWrite, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor });
  }
  return m;
}

const STUD = { r: 0.045, h: 0.03, gap: 0.16 };

/** Add toy-brick studs on the flat tops of boxes and on the floor. */
function studify(root, scene) {
  const geo = new THREE.CylinderGeometry(STUD.r, STUD.r, STUD.h, 20);
  geo.translate(0, STUD.h / 2, 0);
  const groups = new Map();
  const add = (mat, x, y, z) => {
    if (!groups.has(mat)) groups.set(mat, []);
    groups.get(mat).push([x, y, z]);
  };
  const box = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (o.isMesh && o.userData.ground) {
      // baseplate under the action: studs on the ground plane
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      for (let x = -6 + STUD.gap / 2; x < 6; x += STUD.gap) for (let z = -2.9 + STUD.gap / 2; z < 3.5; z += STUD.gap) add(mat, x, 0, z);
      return;
    }
    if (!o.isMesh || o.geometry.type !== 'BoxGeometry') return;
    box.setFromObject(o);
    const w = box.max.x - box.min.x;
    const d = box.max.z - box.min.z;
    const h = box.max.y - box.min.y;
    if (d < 0.12 || w < 0.12) return; // walls seen edge-on, thin frames
    if (h < 0.2 && w > 6) return; // floors are handled as ground
    const isFloor = false;
    const x0 = isFloor ? -6 : box.min.x;
    const x1 = isFloor ? 6 : box.max.x;
    const z0 = isFloor ? Math.max(box.min.z, -2.9) : box.min.z;
    const z1 = isFloor ? Math.min(box.max.z, 3.5) : box.max.z;
    if ((x1 - x0) * (z1 - z0) / (STUD.gap * STUD.gap) > 4000) return;
    for (let x = x0 + STUD.gap / 2; x < x1; x += STUD.gap) {
      for (let z = z0 + STUD.gap / 2; z < z1; z += STUD.gap) add(o.material, x, box.max.y, z);
    }
  });
  for (const [mat, pts] of groups) {
    const inst = new THREE.InstancedMesh(geo, mat, pts.length);
    const m4 = new THREE.Matrix4();
    pts.forEach(([x, y, z], i) => inst.setMatrixAt(i, m4.makeTranslation(x, y, z)));
    inst.castShadow = inst.receiveShadow = true;
    scene.add(inst);
  }
}

/** Apply a look to the set + characters. */
export function applyLook(look, { scene, set, chars }) {
  if (!LOOKS.includes(look) || look === 'vinyl') return;
  const cache = new Map();
  const swap = (o, lump) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const next = mats.map((m) => {
      if (m.map && m.map.isCanvasTexture && look === 'clay') {
        // the painted face stays crisp, just loses its gloss
        const f = m.clone();
        f.clearcoat = 0;
        f.roughness = 0.9;
        return f;
      }
      if (!cache.has(m)) cache.set(m, convert(m, look));
      return cache.get(m);
    });
    o.material = Array.isArray(o.material) ? next : next[0];
    if (lump && look === 'clay' && !o.material.map) {
      o.geometry = o.geometry.clone();
      lumpify(o.geometry, lump, lump > 0.02 ? 7 : 4.5, !!o.userData.inwardLumps);
    }
  };
  set.group.traverse((o) => swap(o, 0.04));
  for (const c of chars) c.root.traverse((o) => swap(o, 0.018));
  if (look === 'brick') studify(set.group, scene);
}

/** Stop-motion: clay moves on twos (12 fps) with a little hand jitter per frame. */
export function lookTime(look, t) {
  if (look !== 'clay') return t;
  return Math.floor(t * 12) / 12;
}
export function jitter(look, t, seed) {
  if (look !== 'clay') return 0;
  const k = Math.floor(t * 12);
  return (hash3(k, seed, 3.3) - 0.5) * 0.012;
}
