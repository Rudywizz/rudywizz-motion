// Camera moves. A camera state is { x, y, zoom, rot, tx, ty, lens }:
//   x, y   pan as a fraction of the frame (x>0 looks right, y>0 looks down)
//   zoom   1 = frame filled
//   rot    roll in radians
//   tx, ty pitch / yaw of the image plane in radians (2.5D perspective)
//   lens   extra barrel distortion (dolly-zoom feel)
//
// A scene's `camera` is a preset name, or { preset, amount, shake, keys: [...] }
// with keyframes { at: 0..1 (fraction of the scene) | t: seconds, x, y, zoom, rot, tx, ty, ease }.

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const outExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
const inOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const inOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const EASE = { linear: (t) => t, outExpo, inOutCubic, inOutSine, outCubic: (t) => 1 - Math.pow(1 - t, 3), inCubic: (t) => t * t * t };

function hash(n, s = 0) {
  const x = Math.sin(n * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function noise(x, s = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i, s) * (1 - u) + hash(i + 1, s) * u - 0.5;
}

export const CAMERA_PRESETS = {
  static: () => ({}),
  drift: (u) => ({ zoom: 1.02 + 0.08 * inOutSine(u), x: 0.015 * inOutSine(u), y: -0.01 * inOutSine(u) }),
  'push-in': (u) => ({ zoom: 1 + 0.2 * inOutCubic(u) }),
  'pull-out': (u) => ({ zoom: 1.22 - 0.2 * inOutCubic(u) }),
  'punch-in': (u, t) => ({ zoom: 1 + 0.2 * outExpo(prog(t, 0, 0.35)) + 0.05 * u }),
  'crash-zoom': (u, t) => ({ zoom: 1 + 1.4 * (1 - outExpo(prog(t, 0, 0.5))), rot: 0.06 * (1 - outExpo(prog(t, 0, 0.5))) }),
  'whip-from-left': (u, t) => ({ x: 0.9 * (1 - outExpo(prog(t, 0, 0.42))), zoom: 1.04 }),
  'whip-from-right': (u, t) => ({ x: -0.9 * (1 - outExpo(prog(t, 0, 0.42))), zoom: 1.04 }),
  'whip-from-top': (u, t) => ({ y: -0.6 * (1 - outExpo(prog(t, 0, 0.42))), zoom: 1.04 }),
  'spin-in': (u, t) => ({ rot: -0.5 * (1 - outExpo(prog(t, 0, 0.6))), zoom: 1.05 + 0.5 * (1 - outExpo(prog(t, 0, 0.6))) }),
  rise: (u, t) => ({ y: -0.18 * (1 - outExpo(prog(t, 0, 0.8))), zoom: 1.06 - 0.03 * u }),
  orbit: (u) => ({ ty: 0.22 * Math.sin(u * Math.PI * 1.2 - 0.6), tx: 0.12 * Math.cos(u * Math.PI), rot: 0.02 * Math.sin(u * 3), zoom: 1.18 }),
  'tilt-reveal': (u, t) => ({ tx: 0.85 * (1 - outExpo(prog(t, 0, 1.4))), zoom: 1.12 + 0.25 * (1 - outExpo(prog(t, 0, 1.4))), y: 0.08 * (1 - outExpo(prog(t, 0, 1.4))) }),
  'tilt-left': (u) => ({ ty: -0.32 + 0.12 * inOutSine(u), zoom: 1.2, x: 0.02 }),
  'tilt-right': (u) => ({ ty: 0.32 - 0.12 * inOutSine(u), zoom: 1.2, x: -0.02 }),
  vertigo: (u) => ({ zoom: 1 + 0.35 * inOutCubic(u), lens: 0.35 * inOutCubic(u) }),
  handheld: () => ({ zoom: 1.05 }),
  float: (u, t) => ({ zoom: 1.07, y: 0.012 * Math.sin(t * 1.1), x: 0.01 * Math.sin(t * 0.7), rot: 0.008 * Math.sin(t * 0.9) }),
  'beat-punch': (u, t, ctx) => {
    const beat = 60 / (ctx.bpm || 100);
    const k = Math.floor(t / beat);
    const bt = t - k * beat;
    const hit = Math.exp(-bt * 9);
    return { zoom: 1.04 + 0.09 * hit, rot: (k % 2 ? 1 : -1) * 0.012 * hit };
  },
};

const BASE = { x: 0, y: 0, zoom: 1, rot: 0, tx: 0, ty: 0, lens: 0 };

/** Camera state for a scene at local time t (seconds). */
export function cameraAt(spec, t, dur, ctx = {}) {
  if (!spec) return { ...BASE };
  if (typeof spec === 'string') spec = { preset: spec };
  const u = clamp(t / Math.max(0.001, dur));
  const amount = spec.amount ?? 1;
  const fn = CAMERA_PRESETS[spec.preset] || CAMERA_PRESETS.static;
  const pr = fn(u, t, ctx);
  const c = { ...BASE };
  for (const k of Object.keys(pr)) c[k] = BASE[k] + (pr[k] - BASE[k]) * amount;

  if (Array.isArray(spec.keys) && spec.keys.length) {
    const ks = spec.keys.map((k) => ({ ...k, at: k.at ?? (k.t != null ? k.t / dur : 0) })).sort((a, b) => a.at - b.at);
    let A = ks[0];
    let B = ks[ks.length - 1];
    for (let i = 0; i < ks.length - 1; i++) if (u >= ks[i].at && u <= ks[i + 1].at) { A = ks[i]; B = ks[i + 1]; break; }
    const e = (EASE[B.ease] || inOutCubic)(B.at === A.at ? 1 : clamp((u - A.at) / (B.at - A.at)));
    for (const k of Object.keys(BASE)) {
      const a = A[k] ?? c[k];
      const b = B[k] ?? a;
      if (A[k] != null || B[k] != null) c[k] = a + (b - a) * e;
    }
  }
  const shake = (spec.shake ?? (spec.preset === 'handheld' ? 1 : 0)) * 1;
  if (shake) {
    const s = ctx.seed || 1;
    c.x += noise(t * 1.7, s) * 0.012 * shake + noise(t * 7, s + 3) * 0.002 * shake;
    c.y += noise(t * 1.5, s + 1) * 0.012 * shake + noise(t * 6, s + 4) * 0.002 * shake;
    c.rot += noise(t * 1.2, s + 2) * 0.01 * shake;
    c.zoom = Math.max(c.zoom, 1.04);
  }
  return c;
}
