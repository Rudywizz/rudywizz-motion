// Composition model shared by the browser host and the Node CLI (no DOM here).
//
// A composition is a list of scenes played back to back. Each scene can hand
// over to the next one with a transition (the two overlap for its duration).
//
//   {
//     "width": 1080, "height": 1920, "fps": 30,
//     "look": { "grade": "teal-orange", "grain": 0.05, "bloom": 0.35 },
//     "scenes": [
//       { "style": "neon-sign", "text": "Still / awake", "duration": 3, "camera": "punch-in",
//         "transition": { "type": "whip", "duration": 0.45, "dir": "left" } },
//       { "clip": "beach.mp4", "in": 2, "duration": 2.5, "speed": "ramp-mid", "camera": "handheld",
//         "overlay": { "style": "captions", "text": "Kaş, Antalya" } },
//       { "image": "portrait.jpg", "look": "engrave", "duration": 4, "camera": "drift" }
//     ],
//     "overlays": [ { "style": "captions", "text": "...", "from": 0, "to": 6 } ],
//     "audio": "song.mp3"
//   }

export const TRANSITIONS = [
  'cut', 'fade', 'flash', 'dip', 'whip', 'zoom', 'spin', 'glitch', 'ink', 'burn',
  'liquid', 'iris', 'wipe', 'blinds', 'pixelate', 'leak', 'cube', 'ripple', 'doors', 'stretch', 'luma',
];

export const LOOKS = ['none', 'engrave', 'sketch', 'oldphoto', 'duotone', 'halftone', 'posterize', 'noir'];

export const GRADES = ['none', 'teal-orange', 'kodak', 'fuji', 'sepia', 'noir', 'bleach', 'cyber', 'sunset', 'matte'];

export const SCENE_KEYS = new Set(['type', 'style', 'image', 'layers', 'clip', 'color', 'duration', 'camera', 'look', 'transition', 'overlay', 'in', 'speed', 'fit', 'params']);

export function sceneType(s) {
  if (s.type) return s.type;
  if (s.style) return 'style';
  if (s.image || s.layers) return 'image';
  if (s.clip) return 'clip';
  return 'color';
}

export function normTransition(tr) {
  if (!tr) return { type: 'cut', duration: 0 };
  if (typeof tr === 'string') tr = { type: tr };
  const type = TRANSITIONS.includes(tr.type) ? tr.type : 'fade';
  const dirs = { left: [-1, 0], right: [1, 0], up: [0, 1], down: [0, -1] };
  return {
    type,
    duration: type === 'cut' ? 0 : Number(tr.duration ?? (type === 'whip' ? 0.4 : 0.6)),
    dir: Array.isArray(tr.dir) ? tr.dir : dirs[tr.dir || 'left'] || [-1, 0],
  };
}

/**
 * Normalise any input (single style params or a full composition) into a
 * composition with absolute scene start times.
 * styleDefaults(id) -> the style's defaults object (used for default durations).
 */
export function normalizeComp(input, styleDefaults = () => ({})) {
  let comp = input && Array.isArray(input.scenes) ? { ...input } : null;
  if (!comp) {
    // single style shortcut: every key that isn't a comp key is a style param
    const { width, height, fps, seed, look, cameraBlur, motionBlur, audio, alpha, lang, preview, camera, ...rest } = input || {};
    comp = { width, height, fps, seed, look, cameraBlur, motionBlur, audio, alpha, lang, preview, scenes: [{ ...rest, camera }] };
  }
  comp.width = Math.round(comp.width || 1080);
  comp.height = Math.round(comp.height || 1920);
  comp.fps = Number(comp.fps || 30);
  comp.seed = Number(comp.seed ?? 1);
  comp.look = { ...(comp.look || {}) };
  comp.cameraBlur = comp.cameraBlur !== false;
  comp.motionBlur = Math.max(1, Math.min(16, Number(comp.motionBlur || 1) | 0));
  comp.overlays = Array.isArray(comp.overlays) ? comp.overlays : [];

  let t = 0;
  const scenes = comp.scenes.map((raw, i) => {
    const type = sceneType(raw);
    const defs = type === 'style' ? styleDefaults(raw.style) || {} : {};
    const duration = Number(raw.duration ?? defs.duration ?? (type === 'image' ? 4 : type === 'clip' ? 3 : 2));
    // params passed to the style: explicit params + any non-scene key
    const params = { ...(raw.params || {}) };
    for (const [k, v] of Object.entries(raw)) if (!SCENE_KEYS.has(k)) params[k] = v;
    return { ...raw, i, type, duration, params, transition: normTransition(raw.transition) };
  });
  // overlap scenes by transition length
  scenes.forEach((s, i) => {
    const next = scenes[i + 1];
    if (!next) s.transition = { type: 'cut', duration: 0 };
    else s.transition.duration = Math.min(s.transition.duration, s.duration * 0.8, next.duration * 0.8);
    s.start = t;
    t += s.duration - s.transition.duration;
  });
  comp.scenes = scenes;
  const last = scenes[scenes.length - 1];
  comp.duration = last ? last.start + last.duration : 1;
  return comp;
}

/** Which scenes are visible at time t: [{ scene, local }] (1 or 2) + transition progress. */
export function activeAt(comp, t) {
  const S = comp.scenes;
  for (let i = 0; i < S.length; i++) {
    const s = S[i];
    const end = s.start + s.duration;
    if (t < end || i === S.length - 1) {
      const tr = s.transition;
      const trStart = end - tr.duration;
      if (tr.duration > 0 && t >= trStart && S[i + 1]) {
        return { a: s, b: S[i + 1], p: (t - trStart) / tr.duration, tr };
      }
      return { a: s, b: null, p: 0, tr: null };
    }
  }
  return { a: S[S.length - 1], b: null, p: 0, tr: null };
}

// ---------- clip speed ramps ----------
const RAMPS = {
  'ramp-mid': (u) => 0.3 + 2.0 * Math.pow(Math.abs(2 * u - 1), 2.2), // fast → slow-mo → fast
  'ramp-in': (u) => 0.35 + 1.9 * u * u, // slow → fast
  'ramp-out': (u) => 2.25 - 1.9 * u * u, // fast → slow
};

/** Source-clip seconds elapsed after `local` scene seconds. */
export function clipTime(scene, local) {
  const sp = scene.speed ?? 1;
  if (typeof sp === 'number') return local * sp;
  const f = RAMPS[sp] || (() => 1);
  const D = scene.duration;
  const steps = 120;
  const du = Math.min(1, local / D) / steps;
  let acc = 0;
  for (let k = 0; k < steps; k++) acc += f((k + 0.5) * du) * du;
  return acc * D;
}
