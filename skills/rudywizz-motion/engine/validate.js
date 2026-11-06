// Composition validation shared by the CLI. Catches typos ("styel", "zoomzoom",
// "wooosh") before a render silently falls back to a black scene or a fade.
import { TRANSITIONS, LOOKS, GRADES, SCENE_KEYS } from './timeline.js';
import { CAMERA_PRESETS } from './camera.js';

const RAMPS = ['ramp-in', 'ramp-out', 'ramp-mid'];
const COMP_KEYS = new Set([
  '$schema', 'name', 'title', 'description', 'format', 'width', 'height', 'fps', 'seed', 'look', 'cameraBlur', 'motionBlur',
  'shutter', 'audio', 'alpha', 'lang', 'bpm', 'scenes', 'overlays', 'clean', 'preview',
]);
const LOOK_KEYS = new Set(['grade', 'gradeAmount', 'bloom', 'grain', 'leak', 'film', 'aberration', 'vignette', 'distortion', 'weave', 'bpm']);
// keys every style understands (filled in by the engine)
const COMMON_PARAMS = new Set(['text', 'lang', 'seed', 'fps', 'duration', 'alpha', 'overlay', 'clean', 'at', 'bg', 'src', 'frames']);

/** Levenshtein distance. */
function dist(a, b) {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

/** Closest candidate to `word`, or null when nothing is reasonably close. */
export function suggest(word, candidates) {
  const w = String(word).toLowerCase();
  let best = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const k = dist(w, String(c).toLowerCase());
    if (k < bestD) {
      bestD = k;
      best = c;
    }
  }
  return best != null && bestD <= Math.max(2, Math.floor(w.length / 3)) ? best : null;
}

const hint = (v, list) => {
  const s = suggest(v, list);
  return s ? ` Did you mean "${s}"?` : ` Use one of: ${list.join(', ')}.`;
};

/**
 * @param comp     raw composition (before normalizeComp)
 * @param styles   { [id]: styleModule } for every style id that exists
 * @returns { errors: string[], warnings: string[] }
 */
export function validateComp(comp, styles) {
  const errors = [];
  const warnings = [];
  const styleIds = Object.keys(styles);
  const cams = Object.keys(CAMERA_PRESETS);

  if (!comp || typeof comp !== 'object') return { errors: ['Composition must be a JSON object.'], warnings };
  if (!Array.isArray(comp.scenes) || !comp.scenes.length) errors.push('Composition needs a non-empty "scenes" array.');
  for (const k of Object.keys(comp)) if (!COMP_KEYS.has(k)) warnings.push(`Unknown composition key "${k}".${hint(k, [...COMP_KEYS])}`);
  for (const k of Object.keys(comp.look || {})) if (!LOOK_KEYS.has(k)) warnings.push(`Unknown look key "${k}".${hint(k, [...LOOK_KEYS])}`);
  if (comp.look?.grade && !GRADES.includes(comp.look.grade)) errors.push(`Unknown grade "${comp.look.grade}".${hint(comp.look.grade, GRADES)}`);

  const checkStyleParams = (where, id, obj, extraKnown = []) => {
    const mod = styles[id];
    if (!mod) {
      errors.push(`${where}: unknown style "${id}".${hint(id, styleIds)}`);
      return;
    }
    const known = new Set([...Object.keys(mod.defaults || {}), ...Object.keys(mod.options || {}), ...COMMON_PARAMS, ...extraKnown]);
    const params = { ...(obj.params || {}) };
    for (const [k, v] of Object.entries(obj)) if (!SCENE_KEYS.has(k) && !extraKnown.includes(k)) params[k] = v;
    for (const k of Object.keys(params)) {
      if (!known.has(k)) warnings.push(`${where}: style "${id}" has no option "${k}".${hint(k, [...known].filter((x) => !COMMON_PARAMS.has(x)))}`);
    }
  };

  (comp.scenes || []).forEach((sc, i) => {
    const where = `Scene ${i + 1}`;
    if (!sc || typeof sc !== 'object') {
      errors.push(`${where} must be an object.`);
      return;
    }
    const isStyle = !!sc.style;
    const isImage = !!(sc.image || sc.layers);
    const isClip = !!sc.clip;
    if (!isStyle && !isImage && !isClip && !sc.color && sc.type !== 'color') {
      const stray = Object.keys(sc).filter((k) => !SCENE_KEYS.has(k));
      errors.push(`${where} has no "style", "image", "clip" or "color".${stray.length ? ` Unknown keys: ${stray.join(', ')}.${hint(stray[0], ['style', 'image', 'clip', 'color', 'layers'])}` : ''}`);
    }
    if (isStyle) checkStyleParams(where, sc.style, sc);
    if (sc.duration != null && !(Number(sc.duration) > 0)) errors.push(`${where}: "duration" must be a positive number of seconds.`);

    const cam = typeof sc.camera === 'string' ? sc.camera : sc.camera?.preset;
    if (cam && !cams.includes(cam)) errors.push(`${where}: unknown camera "${cam}".${hint(cam, cams)}`);
    const look = typeof sc.look === 'string' ? sc.look : sc.look?.type;
    if (look && !LOOKS.includes(look)) errors.push(`${where}: unknown look "${look}".${hint(look, LOOKS)}`);
    const tr = typeof sc.transition === 'string' ? sc.transition : sc.transition?.type;
    if (tr && !TRANSITIONS.includes(tr)) errors.push(`${where}: unknown transition "${tr}".${hint(tr, TRANSITIONS)}`);
    if (sc.speed != null && typeof sc.speed !== 'number' && !RAMPS.includes(sc.speed)) errors.push(`${where}: "speed" must be a number or one of ${RAMPS.join(', ')}.`);
    if (sc.overlay) {
      if (!sc.overlay.style) errors.push(`${where}: "overlay" needs a "style".`);
      else checkStyleParams(`${where} overlay`, sc.overlay.style, sc.overlay, ['style', 'at']);
    }
  });

  (comp.overlays || []).forEach((ov, i) => {
    const where = `Overlay ${i + 1}`;
    if (!ov?.style) errors.push(`${where} needs a "style".`);
    else checkStyleParams(where, ov.style, ov, ['style', 'from', 'to']);
  });
  return { errors, warnings };
}
