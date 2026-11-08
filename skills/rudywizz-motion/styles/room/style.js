// room — a cut-away 3D studio loft floating in the dark: desk + monitor, sofa under a neon sign, a big TV
// between speakers, a gallery wall of screens, a map poster, shelves and a night window. Your pixel hosts
// (presenter rigs or Bit) stand in it, lit by its lamps, and only appear while they have something to say.
// A shot list drives a cinematic camera (push, pull, orbit, crane, truck) and can dive into any screen,
// so the next scene seems to come out of it. Screens show your images (e.g. stills of other styles) or a
// terminal that types itself.
//
// Furniture: procedural by default. Pass `models` (a folder with Poly Haven-style <name>/<name>.gltf
// sub-folders: sofa_02, wooden_table_02, modern_arm_chair_01, desk_lamp_arm_01, wooden_display_shelves_01,
// potted_plant_01, potted_plant_04, throw_pillows_01, book_encyclopedia_set_01) for photoreal furniture.
import * as THREE from '../../engine/vendor/three.bundle.min.js';
import { loadCast, drawRig, drawBit, BIT } from '../presenter/style.js';

// Room size (m). Back wall at z = -D/2, left wall at x = -Wd/2, right wall at x = +Wd/2, front is open.
const Wd = 7.2;
const D = 4.4;
const Hh = 2.9;
const BACK = -D / 2;
const LEFT = -Wd / 2;
const RIGHT = Wd / 2;

const PAL = { void: '#04080a', wall: '#24393d', wall2: '#1d4448', floor: '#2a1d16', trim: '#0b1416', teal: '#14b8a6', coral: '#ff6b5a', warm: '#ffb06a', amber: '#ffc777' };

// Places in the room
const DESK = { x: -2.35, z: BACK + 0.42, top: 0.78 };
const MON = { x: -2.35, y: 1.16, z: BACK + 0.2, w: 0.98, h: 0.56 };
const SOFA = { x: 0.35, z: BACK + 0.48 };
const NEON = { x: 0.35, y: 2.12, z: BACK + 0.02 };
const TV = { x: 2.55, y: 1.42, z: BACK + 0.05, w: 1.62, h: 0.92 };
const MAP = { x: -1.05, y: 1.62, z: BACK + 0.02, w: 0.82, h: 0.58 };
const WIN = { z: 0.15, y: 1.55, w: 1.3, h: 1.1 };
const GAL = { x: RIGHT - 0.02, z0: -1.55, z1: 1.75, y0: 0.95, y1: 2.45, cols: 4, rows: 3 };
const TABLE = { x: 0.35, z: -0.55 };

// Where a host can stand (feet) — Bit floats beside
export const SPOTS = {
  desk: [-1.75, -1.05],
  sofa: [-0.55, -1.0],
  tv: [1.55, -1.0],
  center: [-0.1, 0.45],
  gallery: [2.55, 0.55],
  window: [-2.75, 0.55],
  front: [0.35, 1.25],
};

// Camera presets: look-at target, direction to the camera, visible width (m), vertical fov
const CAMS = {
  establish: { at: [0, 1.15, -0.2], dir: [0.12, 0.42, 1], w: 8.6, fov: 30, pat: [0.2, 0.6, -0.3], pdir: [0.38, 0.95, 1], pw: 5.6 },
  wide: { at: [0, 1.1, -0.4], dir: [-0.1, 0.22, 1], w: 6.4, fov: 32, pdir: [-0.2, 0.55, 1], pw: 4.4 },
  top: { at: [0, 0, -0.1], dir: [0.02, 1, 0.32], w: 8.2, fov: 30, pdir: [0.02, 1, 0.34], pw: 5.0 },
  desk: { at: [-2.2, 1.0, BACK + 0.6], dir: [0.42, 0.22, 1], w: 2.1, fov: 32 },
  monitor: { at: [MON.x, MON.y, MON.z], dir: [0.18, 0.06, 1], w: 1.35, fov: 30 },
  sofa: { at: [SOFA.x - 0.2, 1.0, BACK + 0.9], dir: [-0.18, 0.16, 1], w: 2.9, fov: 32, pat: [SOFA.x - 0.3, 0.85, -1.0], pdir: [-0.1, 0.3, 1], pw: 2.6 },
  neon: { at: [NEON.x, NEON.y - 0.1, NEON.z], dir: [-0.08, -0.12, 1], w: 1.9, fov: 30 },
  tv: { at: [TV.x, TV.y - 0.12, TV.z], dir: [-0.3, 0.05, 1], w: 2.6, fov: 32 },
  gallery: { at: [GAL.x, 1.7, 0.1], dir: [-1, 0.12, 0.42], w: 3.6, fov: 32 },
  map: { at: [MAP.x, MAP.y, MAP.z], dir: [0.12, 0.02, 1], w: 1.15, fov: 30 },
  window: { at: [LEFT, WIN.y, WIN.z], dir: [1, 0.06, 0.55], w: 2.0, fov: 32 },
  table: { at: [TABLE.x, 0.5, TABLE.z], dir: [0.1, 0.62, 1], w: 1.2, fov: 32 },
  shelf: { at: [LEFT + 0.25, 1.2, 1.3], dir: [1, 0.15, 0.35], w: 1.7, fov: 32 },
};
// Screens a shot can dive into: target + the width that fills the frame
const SCREENS = { monitor: MON, tv: TV, map: MAP };

const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeIn = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * k);
const clamp01 = (x) => Math.max(0, Math.min(1, x));

export default {
  id: 'room',
  title: 'Room',
  tagline: 'A cut-away 3D studio loft with cinematic camera moves; your pixel hosts live in it and screens show your work',
  fonts: [['JetBrains Mono', 700], ['Big Shoulders Display', 900], ['Instrument Serif', 400], ['Caveat', 600]],
  defaults: {
    text: 'rudywizz',
    duration: 8,
    cast: [{ name: 'Bit', rig: 'bit' }],
    lines: [],
    show: [],
    shots: [
      { at: 0, cam: 'establish', move: 'push' },
      { at: 3, cam: 'sofa', move: 'orbit' },
      { at: 5.5, cam: 'tv', move: 'dive' },
    ],
    images: [],
    monitor: [],
    tv: [],
    gallery: [],
    poster: null,
    neon: 'rudywizz',
    models: null,
    bpm: 112,
    mixVoices: true,
    accent: '#ff6b5a',
  },
  options: {
    shots: 'Camera: [{ at, cam, move, blend }]. cam: establish wide top desk monitor sofa neon tv gallery map window table shelf host. move: drift push pull orbit crane truck dive (into the monitor / tv / map, so the next scene comes out of the screen). blend: seconds to travel from the previous shot (0 = cut)',
    cast: 'Hosts: [{ name, rig: "path/to/rig.json" | "bit" }] (see presenter)',
    lines: 'Voice lines: [{ who, at, text, voice, pose, mood, spot }] — a host appears for its lines at `spot` (desk sofa tv center gallery window front). The mouth follows the voice',
    show: 'Extra appearances without a line: [{ who, from, to, spot, pose }]',
    images: 'Local image files for the screens (index into this list from monitor / tv / gallery / poster)',
    monitor: 'Desk monitor: [{ at, text }] types the text in a terminal, or [{ at, image }]',
    tv: 'TV: [{ at, image }] or [{ at, text }]',
    gallery: 'Image indexes framed on the right wall',
    poster: 'Image index for the map poster on the back wall',
    neon: 'Neon sign text above the sofa',
    models: 'Folder of glTF furniture (optional; procedural furniture otherwise)',
    bpm: 'Speaker cones and the LED strip pulse on this tempo',
    mixVoices: 'false when an overlay already plays the same voice lines (avoids playing them twice)',
    accent: 'Accent colour (neon, highlights)',
  },

  async setup(api) {
    const { W, H, p } = api;
    const portrait = H > W * 1.1;
    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PAL.void);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.32;
    scene.fog = new THREE.Fog(PAL.void, 14, 30);

    // ── images ──
    const tex = await Promise.all((p.images || []).map(async (src) => {
      if (!src) return null;
      const im = await api.loadImage(src);
      const t = new THREE.Texture(im);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
      return t;
    }));

    // ── room shell ──
    const room = new THREE.Group();
    scene.add(room);
    const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...o });
    const box = (w, h, d, mat, x, y, z, { cast = true, recv = true } = {}) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = cast;
      m.receiveShadow = recv;
      room.add(m);
      return m;
    };
    const T = 0.14;
    box(Wd + T * 2, 0.22, D + T, std('#120c09'), 0, -0.11, -T / 2); // slab
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(Wd, D), std('#ffffff', { map: woodTexture(), roughness: 0.55 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.002;
    floor.receiveShadow = true;
    room.add(floor);
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.7), std('#ffffff', { map: rugTexture(p.accent), roughness: 1 }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(SOFA.x, 0.006, -0.75);
    rug.receiveShadow = true;
    room.add(rug);
    const wallMat = std(PAL.wall, { map: plasterTexture(), roughness: 0.95 });
    box(Wd + T * 2, Hh, T, wallMat, 0, Hh / 2, BACK - T / 2);
    // left wall with a window hole
    const lz0 = BACK - T, lz1 = D / 2, wz0 = WIN.z - WIN.w / 2, wz1 = WIN.z + WIN.w / 2, wy0 = WIN.y - WIN.h / 2, wy1 = WIN.y + WIN.h / 2;
    box(T, Hh, wz0 - lz0, wallMat, LEFT - T / 2, Hh / 2, (lz0 + wz0) / 2);
    box(T, Hh, lz1 - wz1, wallMat, LEFT - T / 2, Hh / 2, (wz1 + lz1) / 2);
    box(T, wy0, WIN.w, wallMat, LEFT - T / 2, wy0 / 2, WIN.z);
    box(T, Hh - wy1, WIN.w, wallMat, LEFT - T / 2, (wy1 + Hh) / 2, WIN.z);
    // right wall (gallery), a little darker
    box(T, Hh, D + T, std(PAL.wall2, { map: plasterTexture(), roughness: 0.95 }), RIGHT + T / 2, Hh / 2, -T / 2);
    // skirting + cut-away edge lines (the "model kit" look)
    const trim = std(PAL.trim);
    box(Wd, 0.1, 0.02, trim, 0, 0.05, BACK + 0.01, { cast: false });
    box(0.02, 0.1, D, trim, LEFT + 0.01, 0.05, 0, { cast: false });
    box(0.02, 0.1, D, trim, RIGHT - 0.01, 0.05, 0, { cast: false });
    const edge = new THREE.MeshBasicMaterial({ color: PAL.teal, toneMapped: false });
    for (const [w, h, d, x, y, z] of [
      [Wd + T * 2, 0.01, T, 0, Hh + 0.005, BACK - T / 2],
      [T, 0.01, D + T, LEFT - T / 2, Hh + 0.005, -T / 2],
      [T, 0.01, D + T, RIGHT + T / 2, Hh + 0.005, -T / 2],
      [Wd + T * 2, 0.012, 0.008, 0, 0, D / 2 + 0.004],
    ]) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), edge);
      e.position.set(x, y, z);
      room.add(e);
    }
    // invisible ceiling: keeps the moonlight to the window
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(Wd + 1, 0.05, D + 1), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    ceil.position.set(0, Hh + 0.04, 0);
    ceil.castShadow = true;
    room.add(ceil);

    // window: night city outside
    const night = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w, WIN.h), new THREE.MeshBasicMaterial({ map: nightTexture(), toneMapped: false }));
    night.position.set(LEFT - T + 0.01, WIN.y, WIN.z);
    night.rotation.y = Math.PI / 2;
    room.add(night);
    const frameMat = std('#2a1c14', { roughness: 0.7 });
    box(0.06, 0.05, WIN.w + 0.1, frameMat, LEFT + 0.02, wy0, WIN.z);
    box(0.06, 0.05, WIN.w + 0.1, frameMat, LEFT + 0.02, wy1, WIN.z);
    box(0.06, WIN.h, 0.04, frameMat, LEFT + 0.02, WIN.y, WIN.z);

    // ── furniture ──
    const models = p.models ? await loadModels(p.models) : null;
    const place = (obj, [x, y, z], { rot = 0, width = null, height = null } = {}) => {
      const o = obj.clone(true);
      o.rotation.y = rot;
      o.traverse((m) => {
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
      o.updateMatrixWorld(true);
      let b = new THREE.Box3().setFromObject(o);
      const size = b.getSize(new THREE.Vector3());
      const s = width ? width / Math.max(size.x, size.z) : height ? height / size.y : 1;
      o.scale.multiplyScalar(s);
      o.updateMatrixWorld(true);
      b = new THREE.Box3().setFromObject(o);
      const c = b.getCenter(new THREE.Vector3());
      o.position.x += x - c.x;
      o.position.z += z - c.z;
      o.position.y += y - b.min.y;
      room.add(o);
      return o;
    };
    const wood = std('#5a3a24', { roughness: 0.6 });
    const fabric = std('#2f5d62', { roughness: 1 });
    // desk
    if (models?.wooden_table_02) place(models.wooden_table_02, [DESK.x, 0, DESK.z], { width: 1.5 });
    else {
      box(1.5, 0.05, 0.7, wood, DESK.x, DESK.top - 0.025, DESK.z);
      for (const sx of [-0.7, 0.7]) for (const sz of [-0.3, 0.3]) box(0.05, DESK.top - 0.05, 0.05, wood, DESK.x + sx, (DESK.top - 0.05) / 2, DESK.z + sz);
    }
    const deskTop = models?.wooden_table_02 ? new THREE.Box3().setFromObject(room.children[room.children.length - 1]).max.y : DESK.top;
    if (models?.modern_arm_chair_01) place(models.modern_arm_chair_01, [DESK.x + 0.15, 0, DESK.z + 0.85], { rot: Math.PI + 0.35, width: 0.75 });
    if (models?.desk_lamp_arm_01) place(models.desk_lamp_arm_01, [DESK.x - 0.6, deskTop, DESK.z - 0.18], { rot: -0.4, height: 0.55 });
    // monitor on a stand + keyboard + mug + PC tower
    const dark = std('#0d1114', { roughness: 0.4, metalness: 0.3 });
    box(MON.w + 0.05, MON.h + 0.05, 0.035, dark, MON.x, MON.y, MON.z - 0.02);
    box(0.06, MON.y - MON.h / 2 - deskTop, 0.05, dark, MON.x, deskTop + (MON.y - MON.h / 2 - deskTop) / 2, MON.z - 0.04);
    box(0.28, 0.015, 0.18, dark, MON.x, deskTop + 0.008, MON.z - 0.02);
    box(0.46, 0.022, 0.15, std('#1b2328', { roughness: 0.5 }), MON.x - 0.02, deskTop + 0.011, DESK.z + 0.12);
    box(0.08, 0.02, 0.12, std('#1b2328'), MON.x + 0.33, deskTop + 0.01, DESK.z + 0.12);
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.1, 20), std(p.accent, { roughness: 0.35 }));
    mug.position.set(MON.x + 0.5, deskTop + 0.05, DESK.z + 0.02);
    mug.castShadow = true;
    room.add(mug);
    box(0.22, 0.46, 0.46, dark, DESK.x + 0.55, 0.23, DESK.z - 0.05);
    const pcGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.38), new THREE.MeshBasicMaterial({ color: PAL.teal, toneMapped: false }));
    pcGlow.position.set(DESK.x + 0.66 + 0.001, 0.25, DESK.z + 0.19);
    pcGlow.rotation.y = Math.PI / 2;
    room.add(pcGlow);
    // LED strip behind the monitor
    const led = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.015, 0.01), new THREE.MeshBasicMaterial({ color: PAL.teal, toneMapped: false }));
    led.position.set(MON.x, MON.y + MON.h / 2 + 0.12, BACK + 0.012);
    room.add(led);
    // sticky notes
    [[0.48, 0.22, '#ffd65a'], [0.62, 0.3, '#ff8fa3'], [0.55, 0.07, '#8fe3d0']].forEach(([dx, dy, c], i) => {
      const n = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), std(c, { roughness: 1 }));
      n.position.set(MON.x + dx + 0.1, MON.y + dy, BACK + 0.004 + i * 0.001);
      n.rotation.z = (i - 1) * 0.12;
      room.add(n);
    });

    // sofa + pillows
    if (models?.sofa_02) place(models.sofa_02, [SOFA.x, 0, SOFA.z], { width: 2.1 });
    else {
      box(2.1, 0.42, 0.85, fabric, SOFA.x, 0.21, SOFA.z);
      box(2.1, 0.5, 0.2, fabric, SOFA.x, 0.62, SOFA.z - 0.33);
      for (const s of [-1, 1]) box(0.2, 0.6, 0.85, fabric, SOFA.x + s * 1.0, 0.3, SOFA.z);
    }
    if (models?.throw_pillows_01) place(models.throw_pillows_01, [SOFA.x, 0.42, SOFA.z - 0.12], { width: 1.4 });
    // coffee table with toy figures
    box(1.0, 0.04, 0.55, wood, TABLE.x, 0.38, TABLE.z);
    for (const sx of [-0.45, 0.45]) for (const sz of [-0.22, 0.22]) box(0.04, 0.36, 0.04, wood, TABLE.x + sx, 0.18, TABLE.z + sz);
    addToys(room, TABLE.x, 0.4, TABLE.z, p.accent);
    // TV + console + speakers
    box(TV.w + 0.06, TV.h + 0.06, 0.05, dark, TV.x, TV.y, TV.z - 0.025);
    box(1.9, 0.42, 0.42, std('#2b1d15', { roughness: 0.6 }), TV.x, 0.21, BACK + 0.26);
    const cones = [];
    for (const sx of [-1.15, 1.15]) {
      const sx0 = TV.x + sx;
      box(0.36, 1.05, 0.34, std('#14181b', { roughness: 0.5 }), sx0, 0.525, BACK + 0.24);
      for (const [cy, r] of [[0.78, 0.11], [0.42, 0.13]]) {
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.6, 0.04, 28), std('#2a3136', { roughness: 0.35, metalness: 0.4 }));
        cone.rotation.x = Math.PI / 2;
        cone.position.set(sx0, cy, BACK + 0.42);
        room.add(cone);
        cones.push(cone);
      }
    }
    // shelves + books + plants
    if (models?.wooden_display_shelves_01) place(models.wooden_display_shelves_01, [LEFT + 0.22, 0, 1.3], { rot: Math.PI / 2, height: 1.65 });
    else for (let i = 0; i < 4; i++) box(0.36, 0.03, 1.0, wood, LEFT + 0.2, 0.35 + i * 0.42, 1.3);
    if (models?.book_encyclopedia_set_01) {
      [[0.37, 1.05], [0.79, 1.45], [1.21, 1.18]].forEach(([y, z]) => place(models.book_encyclopedia_set_01, [LEFT + 0.2, y, z], { rot: Math.PI / 2, width: 0.36 }));
    }
    if (models?.potted_plant_04) place(models.potted_plant_04, [RIGHT - 0.4, 0, BACK + 0.38], { height: 1.25 });
    else addPlant(room, RIGHT - 0.4, BACK + 0.38, 1.2);
    if (models?.potted_plant_01) place(models.potted_plant_01, [LEFT + 0.45, 0, -0.75], { height: 0.9 });
    else addPlant(room, LEFT + 0.45, -0.75, 0.9);

    // ── screens ──
    const screenMat = (w, h) => {
      const cv = document.createElement('canvas');
      cv.width = Math.round(w * 1100);
      cv.height = Math.round(h * 1100);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
      return { cv, t, mat };
    };
    const mon = screenMat(MON.w, MON.h);
    const monMesh = new THREE.Mesh(new THREE.PlaneGeometry(MON.w, MON.h), mon.mat);
    monMesh.position.set(MON.x, MON.y, MON.z + 0.001);
    room.add(monMesh);
    const tv = screenMat(TV.w, TV.h);
    const tvMesh = new THREE.Mesh(new THREE.PlaneGeometry(TV.w, TV.h), tv.mat);
    tvMesh.position.set(TV.x, TV.y, TV.z + 0.002);
    room.add(tvMesh);
    // map poster (frame + image)
    box(MAP.w + 0.06, MAP.h + 0.06, 0.025, std('#0e0e0e', { roughness: 0.5 }), MAP.x, MAP.y, MAP.z);
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(MAP.w, MAP.h), std('#ffffff', { map: tex[p.poster] || posterTexture(), roughness: 0.8 }));
    poster.position.set(MAP.x, MAP.y, MAP.z + 0.014);
    room.add(poster);
    // gallery wall
    const gal = (p.gallery || []).map((i) => tex[i]).filter(Boolean);
    const gw = (GAL.z1 - GAL.z0) / GAL.cols;
    const gh = (GAL.y1 - GAL.y0) / GAL.rows;
    const galleryMeshes = [];
    for (let r = 0; r < GAL.rows; r++) {
      for (let c = 0; c < GAL.cols; c++) {
        const i = r * GAL.cols + c;
        const t = gal.length ? gal[i % gal.length] : null;
        const cz = GAL.z0 + gw * (c + 0.5);
        const cy = GAL.y1 - gh * (r + 0.5);
        const fw = gw * 0.82, fh = Math.min(gh * 0.86, fw * 1.0);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(0.025, fh + 0.04, fw + 0.04), std('#0c0c0c', { roughness: 0.45 }));
        fr.position.set(GAL.x - 0.0125, cy, cz);
        fr.castShadow = true;
        room.add(fr);
        const im = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), t ? new THREE.MeshBasicMaterial({ map: t, toneMapped: false }) : std('#1d2a2e'));
        im.position.set(GAL.x - 0.027, cy, cz);
        im.rotation.y = -Math.PI / 2;
        if (t) fitCover(im, t, fw, fh);
        room.add(im);
        galleryMeshes.push(im);
      }
    }
    // neon sign
    const neon = neonSign(p.neon || 'rudywizz', p.accent);
    neon.mesh.position.set(NEON.x, NEON.y, NEON.z + 0.01);
    room.add(neon.mesh);

    // ── lights ──
    scene.add(new THREE.HemisphereLight('#a9d2cf', '#2a1c12', 0.7));
    const key = new THREE.DirectionalLight('#ffe6cc', 1.25);
    key.position.set(2.5, 6, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -3, near: 0.5, far: 20 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 5;
    scene.add(key);
    const moon = new THREE.DirectionalLight('#8fb7ff', 1.4);
    moon.position.set(LEFT - 3, 3.2, WIN.z + 1.2);
    moon.target.position.set(0, 0, -0.2);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    Object.assign(moon.shadow.camera, { left: -4, right: 4, top: 4, bottom: -2, near: 0.5, far: 14 });
    scene.add(moon, moon.target);
    const lamp = new THREE.PointLight(PAL.warm, 7, 4.5, 1.6);
    lamp.position.set(DESK.x - 0.45, deskTop + 0.55, DESK.z + 0.05);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    lamp.shadow.bias = -0.002;
    scene.add(lamp);
    const neonLight = new THREE.PointLight(p.accent, 3.2, 3.5, 1.8);
    neonLight.position.set(NEON.x, NEON.y - 0.2, NEON.z + 0.45);
    scene.add(neonLight);
    const tvLight = new THREE.PointLight('#7fd6ff', 2.5, 3.8, 1.6);
    tvLight.position.set(TV.x, TV.y, TV.z + 0.6);
    scene.add(tvLight);
    const monLight = new THREE.PointLight('#5dff9e', 1.2, 2.2, 1.8);
    monLight.position.set(MON.x, MON.y, MON.z + 0.45);
    scene.add(monLight);
    const galLight = new THREE.SpotLight('#fff1dc', 9, 6, 0.75, 0.6, 1.4);
    galLight.position.set(RIGHT - 1.9, Hh - 0.05, 0.1);
    galLight.target.position.set(RIGHT, 1.7, 0.1);
    scene.add(galLight, galLight.target);

    // ── hosts ──
    const cast = await loadCast(api, p.cast);
    const byName = new Map(cast.map((m) => [m.name.toLowerCase(), m]));
    for (const m of cast) {
      m.tex = new THREE.CanvasTexture(m.cv);
      setPixelTex(m.tex);
      m.mat = new THREE.MeshStandardMaterial({ map: m.tex, emissiveMap: m.tex, emissive: '#ffffff', emissiveIntensity: 0.42, roughness: 1, alphaTest: 0.5, side: THREE.DoubleSide });
      m.depth = new THREE.MeshDepthMaterial({ map: m.tex, alphaTest: 0.5, depthPacking: THREE.RGBADepthPacking });
      const g = new THREE.PlaneGeometry(1, 1);
      g.translate(0, 0.5, 0);
      m.mesh = new THREE.Mesh(g, m.mat);
      m.mesh.customDepthMaterial = m.depth;
      m.mesh.castShadow = true;
      m.mesh.visible = false;
      m.blob = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.35, depthWrite: false }));
      m.blob.rotation.x = -Math.PI / 2;
      m.blob.visible = false;
      scene.add(m.mesh, m.blob);
      m.blinks = [];
      for (let t = 0.8 + api.hash(m.seed, 1) * 1.2, i = 1; t < p.duration + 2; i++) {
        m.blinks.push(t);
        t += 2.2 + api.hash(m.seed, i) * 3.3;
      }
    }
    const lines = (p.lines || []).filter((l) => l && l.at != null).map((l) => ({ ...l }));
    for (const l of lines) {
      const words = String(l.text || '').split(/\s+/).filter(Boolean).length;
      l.dur = l.voice && l.voice.dur ? l.voice.dur : Math.max(1.2, words * 0.36 + 0.4);
      l.end = l.at + l.dur;
      l.m = l.who ? byName.get(String(l.who).toLowerCase()) : null;
      if (l.voice && p.mixVoices !== false) api.cue(l.voice, l.at);
    }
    // nothing to say: the hosts just hang out on the sofa
    const showList = p.show && p.show.length ? p.show : lines.length ? [] : cast.map((m) => ({ who: m.name, from: 0.4, to: p.duration + 1, spot: 'sofa' }));
    const shows = showList.map((s) => ({ ...s, m: byName.get(String(s.who || '').toLowerCase()) })).filter((s) => s.m);

    // ── camera ──
    const camera = new THREE.PerspectiveCamera(32, W / H, 0.05, 80);
    const shots = (p.shots && p.shots.length ? p.shots : [{ at: 0, cam: 'establish', move: 'push' }]).map((s) => ({ ...s })).sort((a, b) => a.at - b.at);
    shots.forEach((s, i) => (s.end = i + 1 < shots.length ? shots[i + 1].at : p.duration));

    return { renderer, scene, camera, mon, tv, tex, cones, led, neon, neonLight, tvLight, cast, lines, shows, shots, portrait, galleryMeshes, monLight };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, fps } = api;
    const beat = 60 / (p.bpm || 112);
    const ph = (t % beat) / beat;
    const pulse = Math.exp(-ph * 6);

    // speakers + LED + neon flicker
    for (const c of s.cones) c.position.z = BACK + 0.42 + pulse * 0.012;
    s.led.material.color.setHSL(0.48, 0.8, 0.35 + pulse * 0.25);
    const flick = t > 0.3 ? 1 : api.hash(Math.floor(t * 30), 3) > 0.5 ? 1 : 0.2;
    s.neon.set(flick);
    s.neonLight.intensity = 3.2 * flick;

    // screens
    drawMonitor(api, s, t);
    drawTV(api, s, t);

    // hosts
    const cam = cameraAt(s, t, api);
    placeHosts(api, s, t, cam.pos);

    s.camera.fov = cam.fov;
    s.camera.position.copy(cam.pos);
    s.camera.up.set(Math.sin(cam.roll || 0), Math.cos(cam.roll || 0), 0);
    s.camera.lookAt(cam.target);
    s.camera.updateProjectionMatrix();
    s.renderer.render(s.scene, s.camera);
    api.bg(null);
    ctx.drawImage(s.renderer.domElement, 0, 0, W, H);
    // a dive ends in the screen's light
    if (cam.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${cam.flash * 0.85})`;
      ctx.fillRect(0, 0, W, H);
    }
  },
};

// ── camera ─────────────────────────────────────────────────────────────────
function presetPose(s, name, t, portrait, aspect) {
  let c = CAMS[name];
  if (name === 'host' || !c) {
    const l = s.lines.find((x) => t >= x.at - 0.3 && t < x.end) || s.lines.find((x) => x.at >= t) || s.lines[s.lines.length - 1];
    const spot = l && l.m && SPOTS[l.spot || l.m.spot] ? SPOTS[l.spot || l.m.spot] : SPOTS.sofa;
    c = { at: [spot[0] + 0.3, 1.0, spot[1]], dir: [0.22, 0.12, 1], w: 2.6, fov: 30, pat: [spot[0] + 0.3, 0.92, spot[1]], pdir: [0.18, 0.16, 1], pw: 2.1 };
  }
  const fov = c.fov;
  const vf = (fov * Math.PI) / 180;
  const hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
  // fit the width; in portrait frames fit ~70% of it so the subject is not tiny
  const w = portrait ? c.pw ?? c.w * 0.62 : c.w;
  const dist = w / 2 / Math.tan(hf / 2);
  const dir = new THREE.Vector3(...(portrait && c.pdir ? c.pdir : c.dir)).normalize();
  const target = new THREE.Vector3(...(portrait && c.pat ? c.pat : c.at));
  return { pos: target.clone().addScaledVector(dir, dist), target, fov, dir, dist };
}

function moved(base, move, k, len) {
  const out = { pos: base.pos.clone(), target: base.target.clone(), fov: base.fov, roll: 0, flash: 0 };
  const e = ease(k);
  const side = new THREE.Vector3().crossVectors(base.dir, new THREE.Vector3(0, 1, 0)).normalize();
  switch (move) {
    case 'push':
      out.pos.addScaledVector(base.dir, -base.dist * 0.22 * e);
      break;
    case 'pull':
      out.pos.addScaledVector(base.dir, base.dist * 0.25 * e);
      break;
    case 'orbit': {
      const a = (e - 0.5) * 0.42;
      const off = out.pos.clone().sub(out.target);
      off.applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
      out.pos.copy(out.target).add(off);
      break;
    }
    case 'crane':
      out.pos.y += (e - 0.3) * base.dist * 0.35;
      out.target.y += (e - 0.3) * 0.15;
      break;
    case 'truck':
      out.pos.addScaledVector(side, (e - 0.5) * base.dist * 0.4);
      out.target.addScaledVector(side, (e - 0.5) * base.dist * 0.25);
      break;
    case 'dive': {
      // hold, then accelerate into the screen in the last 1.1 s
      const tail = Math.min(1.1, len * 0.6);
      const kk = clamp01((k * len - (len - tail)) / tail);
      out.pos.addScaledVector(base.dir, -base.dist * 0.08 * ease(Math.min(1, (k * len) / Math.max(0.1, len - tail))));
      const into = easeIn(kk);
      out.pos.lerp(out.target.clone().addScaledVector(base.dir, base.dist * 0.18), into * 0.97);
      out.flash = clamp01((kk - 0.82) / 0.18);
      out.roll = 0;
      break;
    }
    default: // drift
      out.pos.addScaledVector(base.dir, -base.dist * 0.06 * e);
      out.pos.addScaledVector(side, Math.sin(k * Math.PI) * base.dist * 0.03);
  }
  return out;
}

function cameraAt(s, t, api) {
  const aspect = api.W / api.H;
  const pose = (sh, tt) => {
    let base;
    if (sh.move === 'dive' && SCREENS[sh.cam]) {
      const sc = SCREENS[sh.cam];
      const c = { ...CAMS[sh.cam] };
      base = presetPose(s, sh.cam, tt, s.portrait, aspect);
      // dive straight on: make the screen fill the frame at the end
      base.dir = new THREE.Vector3(0, 0, 1);
      const vf = (c.fov * Math.PI) / 180;
      const hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
      const fillDist = Math.min(sc.w / 2 / Math.tan(hf / 2), sc.h / 2 / Math.tan(vf / 2));
      base.target = new THREE.Vector3(sc.x, sc.y, sc.z);
      base.dist = Math.max(fillDist * 3.2, 1.2);
      base.pos = base.target.clone().addScaledVector(base.dir, base.dist);
      base.fill = fillDist;
      const len = sh.end - sh.at;
      const k = clamp01((tt - sh.at) / len);
      const tail = Math.min(1.1, len * 0.6);
      const kk = clamp01((k * len - (len - tail)) / tail);
      const out = { pos: base.pos.clone(), target: base.target.clone(), fov: c.fov, roll: 0, flash: 0 };
      const hold = ease(Math.min(1, (k * len) / Math.max(0.1, len - tail)));
      out.pos.z = lerp(base.target.z + base.dist, base.target.z + base.dist * 0.82, hold);
      out.pos.z = lerp(out.pos.z, base.target.z + fillDist * 0.92, easeIn(kk));
      out.flash = clamp01((kk - 0.86) / 0.14) * 0.6;
      return out;
    }
    base = presetPose(s, sh.cam, tt, s.portrait, aspect);
    const len = Math.max(0.1, sh.end - sh.at);
    return moved(base, sh.move || 'drift', clamp01((tt - sh.at) / len), len);
  };
  let i = 0;
  for (let k = 0; k < s.shots.length; k++) if (s.shots[k].at <= t) i = k;
  const sh = s.shots[i];
  const cur = pose(sh, t);
  const blend = sh.blend ?? (i === 0 ? 0 : 0.9);
  if (i > 0 && blend > 0 && t < sh.at + blend) {
    const prev = pose(s.shots[i - 1], t); // the previous move keeps going while we travel
    const k = ease((t - sh.at) / blend);
    // travel on an arc: lift the camera a little mid-way so it glides over furniture
    const pos = prev.pos.clone().lerp(cur.pos, k);
    pos.y += Math.sin(k * Math.PI) * 0.35;
    return { pos, target: prev.target.clone().lerp(cur.target, k), fov: lerp(prev.fov, cur.fov, k), roll: 0, flash: cur.flash };
  }
  return cur;
}

// ── hosts ──────────────────────────────────────────────────────────────────
function placeHosts(api, s, t, camPos) {
  const { fps } = api;
  const f = Math.round(t * fps);
  s.cast.forEach((m, ci) => {
    // visible while a line of theirs (or a `show`) is on, with a pixel pop in/out
    const mine = s.lines.filter((l) => l.m === m);
    const win = [...mine.map((l) => ({ from: l.at - 0.35, to: l.end + 0.5, spot: l.spot, pose: l.pose, line: l })), ...s.shows.filter((x) => x.m === m).map((x) => ({ from: x.from, to: x.to, spot: x.spot, pose: x.pose }))];
    // merge windows closer than 1.2 s so a host does not blink out between lines
    win.sort((a, b) => a.from - b.from);
    const merged = [];
    for (const w of win) {
      const last = merged[merged.length - 1];
      if (last && w.from - last.to < 1.2 && (w.spot || last.spot) === (last.spot || w.spot)) last.to = Math.max(last.to, w.to);
      else merged.push({ ...w });
    }
    const on = merged.find((w) => t >= w.from && t < w.to);
    if (!on) {
      m.mesh.visible = m.blob.visible = false;
      return;
    }
    const kIn = clamp01((t - on.from) / 0.3);
    const kOut = clamp01((on.to - t) / 0.3);
    const pop = Math.min(kIn, kOut);
    const line = mine.find((l) => t >= l.at - 0.05 && t < l.end + 0.6);
    const env = line && line.voice && t < line.end ? line.voice.env : null;
    const lf = line ? Math.floor((t - line.at) * fps) : 0;
    const loud = env ? env[lf] || 0 : line && t < line.end ? Math.max(0, Math.sin(t * 17 + m.seed)) : 0;
    const mood = (line && line.mood) || 'neutral';
    let gw, gh, anchor, cv;
    if (m.kind === 'bit') {
      drawBit(m, { t, f, fps, mood: kIn < 1 ? 'loading' : mood, loud, talking: !!(line && t < line.end), wave: false });
      gw = BIT.W; gh = BIT.H; anchor = BIT.W / 2; cv = m.cv;
    } else {
      const pose = line && line.pose && m.rig.poses && m.rig.poses[line.pose] ? line.pose : null;
      const r = drawRig(m, { t, f, fps, mood, loud, line, pose, gaze: 0, env, lf });
      gw = r.gw; gh = r.gh; anchor = r.anchor; cv = r.cv;
    }
    if (m.tex.image !== cv || m.tex.image.width !== m.texW || m.tex.image.height !== m.texH) {
      m.tex.dispose();
      m.tex = new THREE.CanvasTexture(cv);
      setPixelTex(m.tex);
      m.mat.map = m.mat.emissiveMap = m.depth.map = m.tex;
      m.mat.needsUpdate = m.depth.needsUpdate = true;
      m.texW = cv.width;
      m.texH = cv.height;
    }
    m.tex.needsUpdate = true;
    const spotName = on.spot || m.spot || (ci === 0 ? 'sofa' : 'sofa');
    m.spot = spotName;
    const sp = SPOTS[spotName] || SPOTS.sofa;
    const bit = m.kind === 'bit';
    const px = bit ? 0.5 / BIT.H : 1.62 / m.grid[1];
    const hover = bit ? 0.95 + Math.sin(t * 2.4 + m.seed) * 0.03 : 0;
    const x = sp[0] + (bit ? 0.72 : 0);
    const z = sp[1] + (bit ? 0.12 : 0);
    // quantised pop: grows in 6 steps, like pixels arriving
    const stepPop = Math.ceil(pop * 6) / 6;
    m.mesh.visible = stepPop > 0;
    m.mesh.scale.set(gw * px, gh * px * stepPop, 1);
    m.mesh.position.set(x, hover, z);
    // face the camera (yaw only), anchor = feet
    const yaw = Math.atan2(camPos.x - x, camPos.z - z);
    m.mesh.rotation.set(0, yaw, 0);
    const off = (gw / 2 - anchor) * px;
    m.mesh.position.x += Math.cos(yaw) * off;
    m.mesh.position.z -= Math.sin(yaw) * off;
    m.blob.visible = m.mesh.visible;
    m.blob.position.set(x, 0.012, z);
    m.blob.scale.setScalar((bit ? 0.6 : 1) * stepPop);
    m.blob.material.opacity = bit ? 0.22 : 0.35;
  });
}

function setPixelTex(t) {
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
}

// ── screens ────────────────────────────────────────────────────────────────
function activeAt(list, t) {
  let cur = null;
  for (const e of list || []) if (e && e.at <= t) cur = e;
  return cur;
}

function drawMonitor(api, s, t) {
  const { cv, t: tx } = s.mon;
  const c = cv.getContext('2d');
  const e = activeAt(api.p.monitor, t);
  const W = cv.width, H = cv.height;
  if (e && e.image != null && s.tex[e.image]) {
    cover(c, s.tex[e.image].image, W, H);
    tx.needsUpdate = true;
    return;
  }
  c.fillStyle = '#06100b';
  c.fillRect(0, 0, W, H);
  // title bar
  c.fillStyle = '#0d1d16';
  c.fillRect(0, 0, W, H * 0.09);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
    c.fillStyle = col;
    c.beginPath();
    c.arc(W * 0.03 + i * W * 0.03, H * 0.045, H * 0.016, 0, 7);
    c.fill();
  });
  c.fillStyle = '#5c8f7a';
  c.font = `700 ${Math.round(H * 0.04)}px "JetBrains Mono"`;
  c.textAlign = 'center';
  c.fillText('rudywizz-motion — zsh', W / 2, H * 0.058);
  c.textAlign = 'left';
  const text = e && e.text ? String(e.text) : '$ _';
  const typed = e && e.text ? Math.floor((t - e.at) * (e.speed || 24)) : 3;
  const lines = text.split(/\n|\s\/\s/);
  const fs = Math.round(H * 0.075);
  c.font = `700 ${fs}px "JetBrains Mono"`;
  let left = typed;
  lines.forEach((ln, i) => {
    const shown = ln.slice(0, Math.max(0, left));
    left -= ln.length + 4;
    const y = H * 0.2 + i * fs * 1.45;
    c.fillStyle = ln.startsWith('✓') ? '#5dff9e' : ln.startsWith('#') ? '#4f7d6a' : '#c8ffe0';
    c.fillText((ln.startsWith('✓') || ln.startsWith('#') ? '' : '$ ') + shown, W * 0.05, y);
    if (left > -ln.length - 4 && left <= 0 && Math.floor(t * 2) % 2 === 0) {
      const wv = c.measureText((ln.startsWith('✓') || ln.startsWith('#') ? '' : '$ ') + shown).width;
      c.fillStyle = '#5dff9e';
      c.fillRect(W * 0.05 + wv + 4, y - fs * 0.8, fs * 0.5, fs * 0.95);
    }
  });
  scan(c, W, H, t);
  tx.needsUpdate = true;
}

function drawTV(api, s, t) {
  const { cv, t: tx } = s.tv;
  const c = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const e = activeAt(api.p.tv, t);
  if (e && e.image != null && s.tex[e.image]) {
    cover(c, s.tex[e.image].image, W, H);
    const k = clamp01((t - e.at) / 0.25);
    if (k < 1) {
      c.fillStyle = `rgba(255,255,255,${(1 - k) * 0.6})`;
      c.fillRect(0, 0, W, H);
    }
    s.tvLight.color.set('#bfe8ff');
  } else {
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0b1d24');
    g.addColorStop(1, '#2a0f1a');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 ${Math.round(H * 0.22)}px "Big Shoulders Display"`;
    c.fillText(String((e && e.text) || api.p.neon || 'rudywizz').toUpperCase(), W / 2, H * 0.5);
    c.textBaseline = 'alphabetic';
    c.textAlign = 'left';
    s.tvLight.color.set('#7fd6ff');
  }
  scan(c, W, H, t);
  tx.needsUpdate = true;
}

function scan(c, W, H, t) {
  c.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = (t * 40) % 4; y < H; y += 4) c.fillRect(0, y, W, 1.5);
}

function cover(c, im, W, H) {
  const s = Math.max(W / im.width, H / im.height);
  const w = im.width * s, h = im.height * s;
  c.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
}

function fitCover(mesh, t, w, h) {
  const im = t.image;
  if (!im) return;
  const ar = im.width / im.height;
  const fr = w / h;
  const tt = t.clone();
  tt.needsUpdate = true;
  if (ar > fr) {
    tt.repeat.set(fr / ar, 1);
    tt.offset.set((1 - fr / ar) / 2, 0);
  } else {
    tt.repeat.set(1, ar / fr);
    tt.offset.set(0, (1 - ar / fr) / 2);
  }
  mesh.material.map = tt;
}

// ── procedural pieces ──────────────────────────────────────────────────────
function canvasTex(w, h, draw, rep = 1) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep, rep);
  t.anisotropy = 8;
  return t;
}
const hash = (...n) => {
  let h = 2166136261;
  for (const x of n) h = Math.imul(h ^ Math.floor(x * 1000), 16777619);
  return ((h >>> 0) % 100000) / 100000;
};

function woodTexture() {
  return canvasTex(1024, 1024, (c) => {
    const n = 8, h = 128;
    for (let i = 0; i < n; i++) {
      const shift = hash(i, 1) * 1024;
      for (let j = -2; j < 3; j++) {
        const x = shift + j * 512;
        const l = 17 + hash(i, j, 2) * 9;
        c.fillStyle = `hsl(24, 32%, ${l}%)`;
        c.fillRect(x, i * h, 512, h);
        for (let s = 0; s < 14; s++) {
          c.strokeStyle = `hsla(24, 30%, ${l - 6}%, 0.35)`;
          c.lineWidth = 1 + hash(i, j, s, 3) * 2;
          const yy = i * h + hash(i, j, s, 4) * h;
          c.beginPath();
          c.moveTo(x, yy);
          c.bezierCurveTo(x + 170, yy + 6, x + 340, yy - 6, x + 512, yy);
          c.stroke();
        }
        c.fillStyle = 'rgba(0,0,0,0.55)';
        c.fillRect(x, i * h, 3, h);
      }
      c.fillStyle = 'rgba(0,0,0,0.6)';
      c.fillRect(0, i * h, 1024, 3);
    }
  }, 2.6);
}
function plasterTexture() {
  return canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      c.fillStyle = `rgba(0,0,0,${0.02 + hash(i, 7) * 0.05})`;
      c.fillRect(hash(i, 1) * w, hash(i, 2) * h, 2, 2);
    }
  }, 3);
}
function rugTexture(accent) {
  return canvasTex(512, 340, (c, w, h) => {
    c.fillStyle = '#0f2a2c';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      c.fillStyle = `rgba(${hash(i, 3) < 0.5 ? '0,0,0' : '60,120,115'},0.12)`;
      c.fillRect(hash(i, 4) * w, hash(i, 5) * h, 2, 2);
    }
    c.strokeStyle = '#1d8f84';
    c.lineWidth = 6;
    c.strokeRect(22, 22, w - 44, h - 44);
    c.strokeStyle = accent;
    c.lineWidth = 2;
    c.strokeRect(36, 36, w - 72, h - 72);
  });
}
function nightTexture() {
  return canvasTex(512, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#071423');
    g.addColorStop(1, '#173546');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#dfeef0';
    c.beginPath();
    c.arc(370, 110, 30, 0, 7);
    c.fill();
    for (let i = 0; i < 28; i++) {
      const x = hash(i, 1) * w, bw = 30 + hash(i, 2) * 60, bh = 90 + hash(i, 3) * 220;
      c.fillStyle = '#050c14';
      c.fillRect(x, h - bh, bw, bh);
      for (let k = 0; k < 12; k++) {
        if (hash(i, k, 4) < 0.45) continue;
        c.fillStyle = hash(i, k, 5) < 0.7 ? '#ffc777' : '#9fe7dd';
        c.fillRect(x + 5 + hash(i, k, 6) * (bw - 12), h - bh + 10 + hash(i, k, 7) * (bh - 20), 4, 6);
      }
    }
  });
}
function posterTexture() {
  return canvasTex(512, 360, (c, w, h) => {
    c.fillStyle = '#e9e1cf';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#b9ab8f';
    for (let x = 0; x < w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y < h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.fillStyle = '#c9bb9c';
    c.beginPath();
    c.ellipse(170, 170, 120, 80, 0.3, 0, 7);
    c.ellipse(380, 200, 90, 110, -0.2, 0, 7);
    c.fill();
  }, 1);
}

function neonSign(text, accent) {
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 300;
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.47), mat);
  let last = -1;
  const set = (on) => {
    if (on === last) return;
    last = on;
    const c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    c.font = `600 190px "Caveat"`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    for (const [blur, a] of [[40, 0.55], [18, 0.75], [6, 1]]) {
      c.shadowColor = accent;
      c.shadowBlur = blur;
      c.strokeStyle = on > 0.5 ? accent : '#4a2622';
      c.globalAlpha = a * (on > 0.5 ? 1 : 0.6);
      c.lineWidth = 10;
      c.strokeText(text, 512, 150);
    }
    c.shadowBlur = 0;
    c.globalAlpha = 1;
    c.strokeStyle = on > 0.5 ? '#ffe1da' : '#6a3a33';
    c.lineWidth = 3.5;
    c.strokeText(text, 512, 150);
    t.needsUpdate = true;
  };
  return { mesh, set };
}

function addPlant(room, x, z, h) {
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 24), new THREE.MeshStandardMaterial({ color: '#c5683f', roughness: 0.8 }));
  pot.position.set(x, 0.15, z);
  pot.castShadow = pot.receiveShadow = true;
  room.add(pot);
  const leaf = new THREE.MeshStandardMaterial({ color: '#2f6b3a', roughness: 0.7 });
  for (let i = 0; i < 9; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), leaf);
    l.scale.set(1, 0.45, 0.6);
    const a = i * 2.39;
    l.position.set(x + Math.cos(a) * 0.14, 0.4 + (i / 9) * (h - 0.5), z + Math.sin(a) * 0.14);
    l.rotation.set(0.4, a, 0.5);
    l.castShadow = true;
    room.add(l);
  }
}

function addToys(room, x, y, z, accent) {
  // three tiny vinyl figures on the coffee table (a wink at story-3d)
  const cols = [['#ff6b5a', '#3a4a8a'], ['#4aa8ff', '#5a3a7a'], ['#ffd65a', '#2f6b3a']];
  cols.forEach(([shirt, legs], i) => {
    const g = new THREE.Group();
    const m = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.035, 20, 16), m('#f2c6a0'));
    head.position.y = 0.105;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.05, 16), m(shirt));
    body.position.y = 0.055;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.035, 12), m(legs));
    leg.position.y = 0.017;
    g.add(head, body, leg);
    g.traverse((o) => o.isMesh && (o.castShadow = true));
    g.position.set(x - 0.2 + i * 0.16, y, z + (i === 1 ? -0.06 : 0.04));
    g.rotation.y = (i - 1) * 0.4;
    room.add(g);
  });
  void accent;
}

async function loadModels(base) {
  const names = ['wooden_table_02', 'sofa_02', 'throw_pillows_01', 'modern_arm_chair_01', 'desk_lamp_arm_01', 'potted_plant_04', 'potted_plant_01', 'book_encyclopedia_set_01', 'wooden_display_shelves_01'];
  const loader = new THREE.GLTFLoader();
  const out = {};
  await Promise.all(names.map(async (n) => {
    try {
      const g = await loader.loadAsync(`${base}${n}/${n}.gltf`);
      out[n] = g.scene;
    } catch {
      /* missing model: the procedural piece is used */
    }
  }));
  return out;
}
