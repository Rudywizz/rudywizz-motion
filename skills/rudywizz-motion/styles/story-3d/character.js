// A procedural 3D "vinyl toy" character built from primitives — no model files.
// Joints are plain Object3D pivots (no skinning), so every pose is a handful of
// rotations and every frame is a pure function of time.
//
// The face is a 2D canvas painted every frame onto a cap that hugs the front of
// the head: eyes, blinks, brows, blush and a mouth that follows the dialogue.
import * as THREE from '../../engine/vendor/three.bundle.min.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

export const LOOK_DEFAULTS = {
  skin: '#f2c29b',
  hair: '#3b2a20',
  hairStyle: 'short', // short | long | bun | curly | spiky | bald | bob
  shirt: '#ff6b4a',
  pants: '#2d3a5a',
  shoes: '#f4f1ea',
  eyes: '#1d1a22',
  blush: '#ff8a8a',
  accessory: 'none', // none | glasses | cap | headphones | beard
  accent: '#ffd23f', // cap, headphones, glasses frame
  height: 1,
};

function mat(color, { rough = 0.55, clear = 0.25, metal = 0 } = {}) {
  return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), roughness: rough, metalness: metal, clearcoat: clear, clearcoatRoughness: 0.4 });
}

function capsule(r, len, m) {
  const g = new THREE.CapsuleGeometry(r, len, 8, 20);
  g.translate(0, -len / 2, 0); // pivot at the top cap centre
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  return mesh;
}

function ball(r, m, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), m);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  return mesh;
}

function lathe(points, m, segs = 40) {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  return mesh;
}

// ── body ──────────────────────────────────────────────────────────────────
const HEAD_R = 0.3;

function buildHair(style, head, m, accent) {
  const g = new THREE.Group();
  const R = HEAD_R;
  const cap = (scale = 1.07, theta = 1.25) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(R * scale, 40, 24, 0, TAU, 0, theta), m);
    mesh.castShadow = true;
    return mesh;
  };
  if (style === 'bald') return g;
  if (style === 'short' || style === 'bun' || style === 'long' || style === 'bob') {
    const c = cap(1.06, 1.42);
    c.rotation.x = -0.5; // tilted back: covers crown + back, leaves the forehead
    g.add(c);
    for (const sx of [-1, 1]) {
      // side locks down to the ears
      const lock = ball(R * 0.42, m, 0.55, 1.05, 0.95);
      lock.position.set(sx * R * 0.8, R * 0.22, -R * 0.12);
      g.add(lock);
    }
    // fringe
    const fringe = ball(R * 0.55, m, 1.5, 0.45, 0.9);
    fringe.position.set(R * 0.12, R * 0.62, R * 0.62);
    fringe.rotation.z = -0.35;
    g.add(fringe);
  }
  if (style === 'bun') {
    const b = ball(R * 0.36, m);
    b.position.set(0, R * 1.12, -R * 0.25);
    g.add(b);
  }
  if (style === 'long' || style === 'bob') {
    const len = style === 'long' ? R * 1.5 : R * 0.75;
    const back = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.1, len, 32, 1, true, Math.PI * 0.32, Math.PI * 1.36), m);
    // three.js cylinders start at +z (the face): leave the front 0.64π open
    back.material.side = THREE.DoubleSide;
    back.position.y = -len / 2 + R * 0.25;
    back.castShadow = true;
    g.add(back);
    const backCap = cap(1.09, 1.75);
    backCap.rotation.x = -0.9;
    g.add(backCap);
  }
  if (style === 'curly') {
    const r = (s) => (Math.sin(s * 91.7) * 43758.5453) % 1;
    for (let i = 0; i < 46; i++) {
      const th = 0.15 + Math.abs(r(i + 1)) * 1.25;
      const ph = Math.abs(r(i + 7)) * TAU;
      if (th > 0.9 && Math.sin(ph) > 0.35) continue; // keep the face clear
      const b = ball(R * (0.26 + Math.abs(r(i + 3)) * 0.1), m);
      b.position.set(Math.sin(th) * Math.cos(ph) * R * 1.02, Math.cos(th) * R * 1.02, Math.sin(th) * Math.sin(ph) * R * 1.02 - R * 0.05);
      g.add(b);
    }
  }
  if (style === 'spiky') {
    const c = cap(1.04, 1.1);
    c.rotation.x = -0.3;
    g.add(c);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * TAU;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(R * 0.2, R * 0.6, 16), m);
      cone.castShadow = true;
      const th = 0.55;
      cone.position.set(Math.sin(th) * Math.cos(a) * R, Math.cos(th) * R * 1.05, Math.sin(th) * Math.sin(a) * R - R * 0.12);
      cone.lookAt(cone.position.clone().multiplyScalar(3));
      cone.rotateX(Math.PI / 2);
      g.add(cone);
    }
    const top = new THREE.Mesh(new THREE.ConeGeometry(R * 0.22, R * 0.65, 16), m);
    top.position.set(0, R * 1.25, -R * 0.05);
    g.add(top);
  }
  return g;
}

function buildAccessory(kind, accent, hairMat) {
  const g = new THREE.Group();
  const R = HEAD_R;
  const am = mat(accent, { rough: 0.35, clear: 0.6 });
  if (kind === 'glasses') {
    // Chunky toy glasses: thick rounded frames that stand off the face, centred
    // on the painted eyes (face decal: eyes at u = 0.5 ± 0.135, v = 0.47 over a 1.9 rad span).
    const frame = mat(accent, { rough: 0.28, clear: 0.9 });
    const lensMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.14, roughness: 0.05, clearcoat: 1, depthWrite: false });
    const hw = R * 0.19, hh = R * 0.16, cr = R * 0.09, t = R * 0.045;
    const rrect = (s, w, h, r) => {
      s.moveTo(-w + r, -h);
      s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r);
      s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h);
      s.lineTo(-w + r, h); s.quadraticCurveTo(-w, h, -w, h - r);
      s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
      return s;
    };
    const outer = rrect(new THREE.Shape(), hw, hh, cr);
    outer.holes.push(rrect(new THREE.Path(), hw - t, hh - t, cr - t * 0.6));
    const rimGeo = new THREE.ExtrudeGeometry(outer, { depth: R * 0.04, bevelEnabled: true, bevelThickness: R * 0.012, bevelSize: R * 0.01, bevelSegments: 3, curveSegments: 10 });
    rimGeo.translate(0, 0, -R * 0.02);
    const lensGeo = new THREE.ShapeGeometry(rrect(new THREE.Shape(), hw - t * 0.5, hh - t * 0.5, cr - t * 0.3), 10);
    const yaw = 0.135 * 1.9, pitch = 0.03 * 1.9, off = R * 1.07;
    const edge = { in: [], out: [] };
    for (const sx of [-1, 1]) {
      const lens = new THREE.Group();
      lens.rotation.order = 'YXZ';
      lens.rotation.set(-pitch, sx * yaw, 0);
      lens.position.set(Math.sin(sx * yaw) * Math.cos(pitch) * off, Math.sin(pitch) * off, Math.cos(yaw) * Math.cos(pitch) * off);
      const rim = new THREE.Mesh(rimGeo, frame);
      rim.castShadow = true;
      lens.add(rim);
      lens.add(new THREE.Mesh(lensGeo, lensMat));
      lens.updateMatrix();
      g.add(lens);
      edge.in.push(new THREE.Vector3(-sx * (hw - t * 0.3), hh * 0.25, 0).applyMatrix4(lens.matrix));
      edge.out.push([sx, new THREE.Vector3(sx * (hw - t * 0.3), hh * 0.35, 0).applyMatrix4(lens.matrix)]);
    }
    const tube = (pts, r) => {
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 10), frame);
      m.castShadow = true;
      g.add(m);
    };
    // bridge arches over the nose
    tube([edge.in[0], new THREE.Vector3(0, R * 0.1, R * 1.1), edge.in[1]], R * 0.028);
    // temples run back over the cheeks to the ears
    for (const [sx, p] of edge.out) {
      tube([p, new THREE.Vector3(sx * R * 0.72, R * 0.1, R * 0.8), new THREE.Vector3(sx * R * 1.0, R * 0.08, R * 0.3), new THREE.Vector3(sx * R * 1.01, R * 0.0, -R * 0.15)], R * 0.026);
    }
  } else if (kind === 'cap') {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(R * 1.09, 40, 20, 0, TAU, 0, 1.35), am);
    dome.rotation.x = -0.2;
    dome.castShadow = true;
    g.add(dome);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.62, R * 0.62, R * 0.06, 40, 1, false, -Math.PI / 2 - 1.2, 2.4), am);
    brim.position.set(0, R * 0.42, R * 0.62);
    brim.rotation.x = 0.18;
    brim.castShadow = true;
    g.add(brim);
  } else if (kind === 'headphones') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(R * 1.12, R * 0.07, 12, 48, Math.PI), am);
    band.rotation.z = 0;
    g.add(band);
    for (const sx of [-1, 1]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.3, R * 0.3, R * 0.22, 32), am);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(sx * R * 1.05, 0, 0);
      cup.castShadow = true;
      g.add(cup);
    }
  } else if (kind === 'beard') {
    const b = new THREE.Mesh(new THREE.SphereGeometry(R * 1.02, 40, 20, Math.PI * 0.08, Math.PI * 0.84, 1.75, 1.05), hairMat);
    b.castShadow = true;
    g.add(b);
  }
  return g;
}

// ── face ──────────────────────────────────────────────────────────────────
const FACE_PX = 512;

function paintFace(fctx, look, f) {
  const c = fctx;
  const P = FACE_PX;
  c.clearRect(0, 0, P, P);
  const lx = clamp(f.lookX, -1, 1) * 14;
  const ly = clamp(f.lookY, -1, 1) * 10;
  const e = f.emotion;
  const eyeY = P * 0.47 + ly;
  const eyeDX = P * 0.135;
  const cx = P / 2 + lx;

  // blush
  const blush = e === 'happy' || e === 'excited' || e === 'shy' ? 0.55 : 0.28;
  for (const sx of [-1, 1]) {
    const g = c.createRadialGradient(cx + sx * P * 0.22, eyeY + P * 0.11, 0, cx + sx * P * 0.22, eyeY + P * 0.11, P * 0.07);
    g.addColorStop(0, hexA(look.blush, blush));
    g.addColorStop(1, hexA(look.blush, 0));
    c.fillStyle = g;
    c.fillRect(0, 0, P, P);
  }

  // eyes
  const open = f.blink;
  for (const sx of [-1, 1]) {
    const x = cx + sx * eyeDX;
    c.save();
    c.translate(x, eyeY);
    if (e === 'happy' || e === 'excited') {
      // ^ ^ arcs
      c.strokeStyle = look.eyes;
      c.lineWidth = P * 0.028;
      c.lineCap = 'round';
      c.beginPath();
      c.arc(0, P * 0.025, P * 0.045, Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
    } else {
      const big = e === 'surprised' ? 1.25 : 1;
      const rx = P * 0.042 * big;
      const ry = P * 0.058 * big * Math.max(0.08, open);
      if (open < 0.12) {
        c.strokeStyle = look.eyes;
        c.lineWidth = P * 0.022;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(-rx, 0);
        c.quadraticCurveTo(0, P * 0.015, rx, 0);
        c.stroke();
      } else {
        c.fillStyle = look.eyes;
        c.beginPath();
        c.ellipse(0, 0, rx, ry, 0, 0, TAU);
        c.fill();
        // highlights
        c.fillStyle = 'rgba(255,255,255,0.95)';
        c.beginPath();
        c.ellipse(rx * 0.32, -ry * 0.38, rx * 0.34, ry * 0.26, 0, 0, TAU);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.6)';
        c.beginPath();
        c.arc(-rx * 0.35, ry * 0.4, rx * 0.15, 0, TAU);
        c.fill();
        if (e === 'sad' || e === 'tired') {
          // heavy upper lid
          c.fillStyle = look.skin;
          c.beginPath();
          c.ellipse(0, -ry * 1.05, rx * 1.3, ry * 0.75, sx * 0.25, 0, TAU);
          c.fill();
        }
        if (e === 'angry') {
          c.fillStyle = look.skin;
          c.beginPath();
          c.moveTo(-rx * 1.4, -ry * 1.3);
          c.lineTo(rx * 1.4, -ry * 1.3);
          c.lineTo(sx * rx * 1.4, -ry * 0.15);
          c.closePath();
          c.fill();
        }
      }
    }
    c.restore();
  }

  // brows
  const browUp = { surprised: -26, sad: -10, worried: -10, angry: 6, thinking: -6, happy: -8, excited: -14 }[e] ?? 0;
  const browTilt = { sad: 0.38, worried: 0.32, angry: -0.45, thinking: 0, surprised: 0.05 }[e] ?? 0.05;
  c.strokeStyle = shade(look.hair, -0.1);
  c.lineCap = 'round';
  c.lineWidth = P * 0.022;
  for (const sx of [-1, 1]) {
    const x = cx + sx * eyeDX;
    const y = eyeY - P * 0.1 + browUp + (e === 'thinking' && sx === 1 ? -14 : 0);
    const tilt = browTilt * sx * -1;
    c.save();
    c.translate(x, y);
    c.rotate(tilt);
    c.beginPath();
    c.moveTo(-P * 0.04, 2);
    c.quadraticCurveTo(0, -5, P * 0.04, 2);
    c.stroke();
    c.restore();
  }

  // mouth
  const my = eyeY + P * 0.155;
  const mx = cx;
  const o = clamp(f.mouth);
  const round = clamp(f.round);
  const smile = { happy: 1, excited: 1, sad: -0.8, angry: -0.5, worried: -0.4, surprised: 0, thinking: -0.15, neutral: 0.45, tired: -0.2, shy: 0.6 }[e] ?? 0.4;
  const w = P * lerp(0.075, 0.05, round) * (e === 'excited' ? 1.25 : 1);
  if (o < 0.06 && e !== 'surprised') {
    c.strokeStyle = shade(look.skin, -0.55);
    c.lineWidth = P * 0.018;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(mx - w, my - smile * 6);
    c.quadraticCurveTo(mx, my + smile * 22, mx + w, my - smile * 6);
    c.stroke();
  } else {
    const oo = e === 'surprised' ? Math.max(o, 0.55) : o;
    const h = P * (0.012 + oo * 0.075);
    const ww = e === 'surprised' ? w * 0.6 : w;
    c.fillStyle = '#5a1e24';
    c.beginPath();
    if (smile > 0.3 && round < 0.5) {
      // D-shaped open smile
      c.moveTo(mx - ww, my - 4);
      c.quadraticCurveTo(mx, my - 4 - smile * 6, mx + ww, my - 4);
      c.quadraticCurveTo(mx + ww * 0.9, my + h * 1.5, mx, my + h * 1.6);
      c.quadraticCurveTo(mx - ww * 0.9, my + h * 1.5, mx - ww, my - 4);
    } else {
      c.ellipse(mx, my + h * 0.5, ww * (1 - round * 0.3), h, 0, 0, TAU);
    }
    c.fill();
    // tongue
    c.save();
    c.clip();
    c.fillStyle = '#ff6f7d';
    c.beginPath();
    c.ellipse(mx, my + h * 1.6, ww * 0.7, h * 0.8, 0, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.fillRect(mx - ww, my - 8, ww * 2, Math.min(h * 0.35, 10));
    c.restore();
  }
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// ── poses ─────────────────────────────────────────────────────────────────
// Angles in radians. arm.out raises sideways, arm.fwd raises forward,
// fore.bend folds the forearm forward/up, fore.in folds it across the body.
const P0 = {
  lift: 0, lean: 0, tilt: 0, turn: 0,
  headX: 0, headZ: 0, headY: 0,
  rArm: { out: 0.12, fwd: 0.05 }, lArm: { out: 0.12, fwd: 0.05 },
  rFore: { bend: 0.2, in: 0 }, lFore: { bend: 0.2, in: 0 },
  rLeg: { fwd: 0, out: 0.04 }, lLeg: { fwd: 0, out: 0.04 },
  rKnee: 0, lKnee: 0,
};

const POSES = {
  idle: () => ({}),
  talk: (t) => ({
    rArm: { out: 0.28 + Math.sin(t * 2.1) * 0.08, fwd: 0.35 + Math.sin(t * 1.7) * 0.12 },
    rFore: { bend: 1.0 + Math.sin(t * 2.6) * 0.25, in: 0.2 },
    lArm: { out: 0.2, fwd: 0.18 + Math.sin(t * 1.3 + 1) * 0.08 },
    lFore: { bend: 0.6 + Math.sin(t * 2.2 + 2) * 0.2, in: 0.1 },
    headZ: Math.sin(t * 1.4) * 0.05,
  }),
  wave: (t) => ({
    rArm: { out: 2.5, fwd: 0.15 },
    rFore: { bend: 0.15, in: -0.35 + Math.sin(t * 9) * 0.45 },
    headZ: 0.1,
    tilt: -0.04,
  }),
  point: () => ({ rArm: { out: 1.45, fwd: 0.35 }, rFore: { bend: 0.05, in: 0 }, turn: -0.25, headY: -0.3 }),
  'point-up': () => ({ rArm: { out: 2.75, fwd: 0.2 }, rFore: { bend: 0.05, in: 0 }, headX: -0.15 }),
  think: (t) => ({
    rArm: { out: 0.2, fwd: 0.55 },
    rFore: { bend: 2.45, in: 0.55 },
    lArm: { out: 0.25, fwd: 0.35 },
    lFore: { bend: 1.4, in: 0.9 },
    headZ: 0.14, headX: -0.12 + Math.sin(t * 0.8) * 0.02,
  }),
  shrug: () => ({
    rArm: { out: 0.55, fwd: 0.25 }, lArm: { out: 0.55, fwd: 0.25 },
    rFore: { bend: 1.45, in: -0.6 }, lFore: { bend: 1.45, in: -0.6 },
    headZ: 0.16, lift: 0.015,
  }),
  celebrate: (t) => ({
    rArm: { out: 2.6, fwd: 0.1 }, lArm: { out: 2.6, fwd: 0.1 },
    rFore: { bend: 0.25, in: Math.sin(t * 10) * 0.2 }, lFore: { bend: 0.25, in: -Math.sin(t * 10) * 0.2 },
    lift: Math.abs(Math.sin(t * 5.5)) * 0.12, headX: -0.1,
  }),
  hips: () => ({
    rArm: { out: 0.75, fwd: -0.15 }, lArm: { out: 0.75, fwd: -0.15 },
    rFore: { bend: 0.4, in: 1.75 }, lFore: { bend: 0.4, in: 1.75 },
    rLeg: { fwd: 0, out: 0.12 }, lLeg: { fwd: 0, out: 0.12 }, headZ: -0.06,
  }),
  present: () => ({
    rArm: { out: 0.85, fwd: 0.55 }, lArm: { out: 0.85, fwd: 0.55 },
    rFore: { bend: 0.35, in: -0.2 }, lFore: { bend: 0.35, in: -0.2 }, headX: -0.06,
  }),
  surprised: () => ({
    rArm: { out: 0.45, fwd: 0.55 }, lArm: { out: 0.45, fwd: 0.55 },
    rFore: { bend: 1.9, in: -0.3 }, lFore: { bend: 1.9, in: -0.3 },
    lean: -0.1, headX: -0.08,
  }),
  sad: () => ({ rArm: { out: 0.04, fwd: 0.1 }, lArm: { out: 0.04, fwd: 0.1 }, rFore: { bend: 0.1 }, lFore: { bend: 0.1 }, lean: 0.12, headX: 0.28 }),
  facepalm: () => ({ rArm: { out: 0.15, fwd: 0.95 }, rFore: { bend: 2.25, in: 0.45 }, headX: 0.25, lean: 0.06 }),
  dance: (t) => {
    const b = Math.sin(t * 7.5);
    return {
      rArm: { out: 1.4 + b * 0.9, fwd: 0.3 }, lArm: { out: 1.4 - b * 0.9, fwd: 0.3 },
      rFore: { bend: 0.9, in: -0.4 }, lFore: { bend: 0.9, in: -0.4 },
      tilt: b * 0.12, lift: Math.abs(Math.cos(t * 7.5)) * 0.05, headZ: -b * 0.12,
      rKnee: Math.max(0, b) * 0.5, lKnee: Math.max(0, -b) * 0.5, rLeg: { fwd: Math.max(0, b) * 0.3 }, lLeg: { fwd: Math.max(0, -b) * 0.3 },
    };
  },
  jump: (t, k) => {
    // k = 0..1 progress through the beat
    const crouch = smooth(k / 0.18) * (1 - smooth((k - 0.18) / 0.08));
    const air = Math.sin(clamp((k - 0.22) / 0.5) * Math.PI);
    return {
      lift: air * 0.55 - crouch * 0.08,
      rKnee: crouch * 0.9 + air * 0.5, lKnee: crouch * 0.9 + air * 0.5,
      rLeg: { fwd: crouch * 0.5 + air * 0.3 }, lLeg: { fwd: crouch * 0.5 + air * 0.3 },
      rArm: { out: 0.4 + air * 2.2, fwd: 0.2 }, lArm: { out: 0.4 + air * 2.2, fwd: 0.2 },
      lean: crouch * 0.2,
    };
  },
  walk: (t) => {
    const s = Math.sin(t * 8);
    return {
      rLeg: { fwd: s * 0.55, out: 0.03 }, lLeg: { fwd: -s * 0.55, out: 0.03 },
      rKnee: Math.max(0, -s) * 0.8, lKnee: Math.max(0, s) * 0.8,
      rArm: { out: 0.12, fwd: -s * 0.5 }, lArm: { out: 0.12, fwd: s * 0.5 },
      lift: Math.abs(Math.cos(t * 8)) * 0.03, lean: 0.05,
    };
  },
  sit: () => ({ lift: -0.27, rLeg: { fwd: 1.5, out: 0.08 }, lLeg: { fwd: 1.5, out: 0.08 }, rKnee: 1.5, lKnee: 1.5, rArm: { out: 0.1, fwd: 0.6 }, lArm: { out: 0.1, fwd: 0.6 }, rFore: { bend: 0.6 }, lFore: { bend: 0.6 } }),
};
export const POSE_NAMES = Object.keys(POSES);
export const EMOTIONS = ['neutral', 'happy', 'excited', 'sad', 'angry', 'surprised', 'thinking', 'worried', 'tired', 'shy'];

function merge(base, over) {
  const out = { ...base };
  for (const k of Object.keys(over)) out[k] = typeof over[k] === 'object' ? { ...base[k], ...over[k] } : over[k];
  return out;
}
export function poseAt(name, t, k = 0) {
  return merge(P0, (POSES[name] || POSES.idle)(t, k));
}
export function blendPose(a, b, w) {
  const out = {};
  for (const key of Object.keys(P0)) {
    if (typeof P0[key] === 'object') {
      out[key] = {};
      for (const sub of Object.keys({ ...a[key], ...b[key] })) out[key][sub] = lerp(a[key][sub] ?? 0, b[key][sub] ?? 0, w);
    } else out[key] = lerp(a[key], b[key], w);
  }
  return out;
}

// ── character ─────────────────────────────────────────────────────────────
export function createCharacter(lookIn = {}) {
  const look = { ...LOOK_DEFAULTS, ...lookIn };
  const skin = mat(look.skin, { rough: 0.6, clear: 0.15 });
  const shirt = mat(look.shirt);
  const pants = mat(look.pants, { rough: 0.7, clear: 0.1 });
  const shoes = mat(look.shoes, { rough: 0.45, clear: 0.4 });
  const hairM = mat(look.hair, { rough: 0.45, clear: 0.5 });

  const root = new THREE.Group();
  const body = new THREE.Group(); // lift / lean
  root.add(body);
  const hips = new THREE.Group();
  hips.position.y = 0.56;
  body.add(hips);

  // torso: a soft bean, shirt on top, waistband below
  const torso = lathe([[0.001, 0], [0.15, 0.0], [0.19, 0.06], [0.2, 0.18], [0.205, 0.3], [0.17, 0.39], [0.08, 0.43], [0.001, 0.44]], shirt);
  torso.scale.z = 0.8;
  hips.add(torso);
  const waist = lathe([[0.001, -0.03], [0.16, -0.03], [0.196, 0.04], [0.2, 0.1], [0.001, 0.1]], pants);
  waist.scale.z = 0.82;
  hips.add(waist);

  const neck = new THREE.Group();
  neck.position.y = 0.42;
  hips.add(neck);
  const neckMesh = capsule(0.06, 0.04, skin);
  neckMesh.position.y = 0.06;
  neck.add(neckMesh);
  const head = new THREE.Group();
  head.position.y = 0.3;
  neck.add(head);
  const skull = ball(HEAD_R, skin, 1, 0.95, 0.93);
  skull.userData.inwardLumps = true; // the painted face sits just above the skull: clay may only dent it
  head.add(skull);
  for (const sx of [-1, 1]) {
    const ear = ball(HEAD_R * 0.2, skin, 0.6, 1, 0.8);
    ear.position.set(sx * HEAD_R * 0.98, -HEAD_R * 0.02, 0);
    head.add(ear);
  }
  const nose = ball(HEAD_R * 0.075, mat(look.skin, { rough: 0.5, clear: 0.2 }), 1.1, 0.9, 0.9);
  nose.position.set(0, -HEAD_R * 0.06, HEAD_R * 0.93);
  head.add(nose);

  // face decal
  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = faceCanvas.height = FACE_PX;
  const fctx = faceCanvas.getContext('2d');
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  faceTex.anisotropy = 4;
  const span = 1.9;
  const faceGeo = new THREE.SphereGeometry(HEAD_R * 1.004, 48, 32, Math.PI / 2 - span / 2, span, Math.PI / 2 - span / 2, span);
  const face = new THREE.Mesh(faceGeo, new THREE.MeshPhysicalMaterial({ map: faceTex, transparent: true, roughness: 0.4, clearcoat: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  face.scale.copy(skull.scale);
  // SphereGeometry phi runs from -x through +z, so u already grows towards screen-right
  head.add(face);

  const hair = buildHair(look.hairStyle, head, hairM, look.accent);
  hair.scale.copy(skull.scale);
  head.add(hair);
  const acc = buildAccessory(look.accessory, look.accent, hairM);
  acc.scale.copy(skull.scale);
  head.add(acc);

  // arms
  const arm = (sx) => {
    const sh = new THREE.Group();
    sh.position.set(sx * 0.215, 0.35, 0);
    hips.add(sh);
    sh.add(capsule(0.062, 0.17, shirt));
    const el = new THREE.Group();
    el.position.y = -0.2;
    sh.add(el);
    el.add(capsule(0.056, 0.15, skin));
    const hand = ball(0.072, skin, 1, 1.05, 0.9);
    hand.position.y = -0.2;
    el.add(hand);
    return { sh, el };
  };
  const leg = (sx) => {
    const hp = new THREE.Group();
    hp.position.set(sx * 0.1, 0.0, 0);
    hips.add(hp);
    hp.add(capsule(0.08, 0.2, pants));
    const kn = new THREE.Group();
    kn.position.y = -0.26;
    hp.add(kn);
    kn.add(capsule(0.07, 0.17, pants));
    const foot = ball(0.09, shoes, 1.05, 0.62, 1.55);
    foot.position.set(0, -0.255, 0.05);
    kn.add(foot);
    return { hp, kn };
  };
  const R = arm(-1); // character's right = screen left when facing camera
  const L = arm(1);
  const RL = leg(-1);
  const LL = leg(1);

  root.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  root.scale.setScalar(look.height);

  const headWorld = new THREE.Vector3();

  return {
    root,
    look,
    headPos() {
      head.getWorldPosition(headWorld);
      return headWorld;
    },
    /** Apply a pose + face state. */
    apply(pose, f) {
      body.position.y = pose.lift;
      body.rotation.x = pose.lean;
      body.rotation.z = pose.tilt;
      body.rotation.y = pose.turn;
      neck.rotation.set(pose.headX, pose.headY + f.headYaw, pose.headZ);
      const setArm = (j, a, fo, side) => {
        j.sh.rotation.set(-a.fwd, 0, side * a.out, 'ZXY');
        j.el.rotation.set(-(fo.bend ?? 0), 0, -side * (fo.in ?? 0), 'XZY');
      };
      setArm(R, pose.rArm, pose.rFore, -1);
      setArm(L, pose.lArm, pose.lFore, 1);
      const setLeg = (j, lg, knee, side) => {
        j.hp.rotation.set(-(lg.fwd ?? 0), 0, side * (lg.out ?? 0), 'ZXY');
        j.kn.rotation.set(knee, 0, 0);
      };
      setLeg(RL, pose.rLeg, pose.rKnee, -1);
      setLeg(LL, pose.lLeg, pose.lKnee, 1);
      // breathing
      const br = 1 + Math.sin(f.t * 2.2 + f.seed) * 0.012;
      torso.scale.set(br, 1 + (br - 1) * 0.5, 0.8 * br);
      paintFace(fctx, look, f);
      faceTex.needsUpdate = true;
    },
  };
}

export { visemeAt } from '../../engine/story.js';
