// rudywizz-motion — shared browser runtime for styles.
// Everything here is deterministic: no Date.now(), no unseeded Math.random().

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
/** Progress of t inside [a, b], clamped to 0..1. */
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const fract = (x) => x - Math.floor(x);

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outElastic: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
};

/** Damped spring from 0 to 1 (analytic, deterministic). */
export function spring(t, { freq = 2.2, damping = 0.45 } = {}) {
  if (t <= 0) return 0;
  const w = freq * 2 * Math.PI;
  const wd = w * Math.sqrt(1 - damping * damping);
  return 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t));
}

/** Seeded PRNG (mulberry32). rng() -> [0,1). */
export function rng(seed = 1) {
  let a = (seed >>> 0) || 1;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (a, b) => a + r() * (b - a);
  r.int = (a, b) => Math.floor(a + r() * (b - a + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.sign = () => (r() < 0.5 ? -1 : 1);
  return r;
}

/** Stateless hash noise: same inputs -> same value in [0,1). */
export function hash(...n) {
  let h = 2166136261;
  for (const v of n) {
    h ^= Math.floor(v * 1000) | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Smooth 1D value noise in [0,1). */
export function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed), hash(i + 1, seed), u);
}

/** Split into user-perceived characters (keeps combining marks / emoji intact). */
export function graphemes(str) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(str)].map((s) => s.segment);
  }
  return [...str];
}

/** Locale-aware uppercase (Turkish: i -> İ, ı -> I). */
export const upper = (str, lang) => (lang ? str.toLocaleUpperCase(lang) : str.toUpperCase());
export const lower = (str, lang) => (lang ? str.toLocaleLowerCase(lang) : str.toLowerCase());

/** Explicit line breaks: "\n" or " / ". */
export function splitLines(text) {
  return String(text)
    .split(/\n|\s\/\s/)
    .map((s) => s.trim())
    .filter(Boolean);
}
export const words = (text) => String(text).split(/\s+/).filter(Boolean);

export function font(size, family, weight = 400) {
  return `${weight} ${Math.round(size)}px "${family}"`;
}

/** Greedy word wrap with ctx's current font. */
export function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of splitLines(text)) {
    let line = '';
    for (const w of words(para)) {
      const test = line ? line + ' ' + w : w;
      if (line && ctx.measureText(test).width > maxW) {
        out.push(line);
        line = w;
      } else line = test;
    }
    if (line) out.push(line);
  }
  return out;
}

/**
 * Largest font size so every line fits in maxW and the block fits in maxH.
 * lines: array of strings (already split). Returns size in px.
 */
export function fitSize(ctx, lines, { family, weight = 400, maxW, maxH = Infinity, lineHeight = 1.0, max = 600, min = 8 }) {
  let size = max;
  ctx.font = font(100, family, weight);
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 1);
  size = Math.min(size, (maxW / widest) * 100);
  size = Math.min(size, maxH / (lines.length * lineHeight));
  return Math.max(min, Math.floor(size));
}

/**
 * Make sure no line is wider than maxW at minSize: wraps long lines by word and
 * splits words that are still too long into hyphenated chunks
 * ("Çekoslovakyalılaştıramadıklarımızdan" → "Çekoslovakya-", "lılaştıramadık-", …).
 * Use before fitSize so very long words stay readable instead of shrinking to a hairline.
 */
export function breakLongWords(ctx, lines, { family, weight = 400, maxW, minSize }) {
  ctx.font = font(minSize, family, weight);
  const fits = (s) => ctx.measureText(s).width <= maxW;
  const out = [];
  for (const line of lines) {
    if (fits(line)) {
      out.push(line);
      continue;
    }
    for (const part of wrap(ctx, line, maxW)) {
      if (fits(part)) {
        out.push(part);
        continue;
      }
      let cur = '';
      for (const c of graphemes(part)) {
        if (cur && !fits(cur + c + '-')) {
          out.push(cur + '-');
          cur = c;
        } else cur += c;
      }
      if (cur) out.push(cur);
    }
  }
  return out;
}

/** Measure each grapheme's x offset for per-letter animation. */
export function layoutChars(ctx, line) {
  const chars = graphemes(line);
  const res = [];
  let prefix = '';
  for (const c of chars) {
    const x = ctx.measureText(prefix).width;
    prefix += c;
    res.push({ c, x, w: ctx.measureText(prefix).width - x });
  }
  return { chars: res, width: ctx.measureText(line).width };
}

export function hexToRgb(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgba = (hex, a = 1) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};
export function mixHex(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(lerp(v, B[i], t)));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function offscreen(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Pre-baked film grain tiles; pick one per frame for deterministic flicker. */
export function makeGrain(w, h, seed = 7, tiles = 6) {
  const r = rng(seed);
  const tw = 256;
  const arr = [];
  for (let k = 0; k < tiles; k++) {
    const c = offscreen(tw, tw);
    const g = c.getContext('2d');
    const img = g.createImageData(tw, tw);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    arr.push(c);
  }
  return (ctx, frame, amount = 0.06, mode = 'overlay') => {
    const tile = arr[frame % arr.length];
    ctx.save();
    ctx.globalAlpha = amount;
    ctx.globalCompositeOperation = mode;
    const pat = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };
}

export function vignette(ctx, w, h, strength = 0.55, color = '0,0,0') {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.hypot(w, h) * 0.6);
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(1, `rgba(${color},${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function scanlines(ctx, w, h, { gap = 4, alpha = 0.18, offset = 0 } = {}) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let y = offset % gap; y < h; y += gap) ctx.fillRect(0, y, w, gap / 2);
  ctx.restore();
}

/** Tint an alpha mask canvas with a solid color into a new canvas. */
export function tint(src, color) {
  const c = offscreen(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
