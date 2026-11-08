// Code-made music: an original backing track synthesised from scratch, with no samples, loops or network.
// Everything (drums, bass, pads, arpeggios, the hook) is computed sample by sample, so the track is yours
// and royalty-free, and the same mood + length + seed always gives the same file.
import fs from 'node:fs';

export const SR = 44100;
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const KEYS = { c: 0, 'c#': 1, db: 1, d: 2, 'd#': 3, eb: 3, e: 4, f: 5, 'f#': 6, gb: 6, g: 7, 'g#': 8, ab: 8, a: 9, 'a#': 10, bb: 10, b: 11 };

export const MOODS = {
  upbeat: { bpm: 116, key: 5, scale: 'major', prog: [5, 3, 0, 4], prog2: [3, 4, 0, 5], pump: 0.5, room: 0.82, desc: 'bright pop: four-on-the-floor, plucked arpeggios, marimba hook' },
  chill: { bpm: 84, key: 2, scale: 'major', prog: [3, 2, 5, 1], prog2: [3, 4, 2, 5], sevenths: true, swing: 0.11, pump: 0.18, room: 0.8, desc: 'lo-fi: soft electric piano, lazy swung beat, warm bass, vinyl crackle' },
  retro: { bpm: 100, key: 9, scale: 'minor', prog: [0, 5, 2, 6], prog2: [5, 6, 0, 0], pump: 0.38, room: 0.86, desc: 'synthwave: gated snare, eighth-note saw bass, neon arpeggios' },
  cinematic: { bpm: 92, key: 2, scale: 'minor', prog: [0, 5, 2, 6], prog2: [3, 5, 6, 0], pump: 0.22, room: 0.9, desc: 'trailer pulse: big drums, string ostinato, wide reverb' },
};

export const ALIASES = { pop: 'upbeat', happy: 'upbeat', energetic: 'upbeat', lofi: 'chill', 'lo-fi': 'chill', calm: 'chill', synthwave: 'retro', '80s': 'retro', epic: 'cinematic', trailer: 'cinematic', dramatic: 'cinematic' };

// 16th-note rhythms for the hook, two bars long: [step, length]
const HOOKS = {
  upbeat: [
    [[0, 2], [3, 2], [6, 2], [8, 4], [14, 2], [16, 2], [19, 2], [22, 2], [24, 6]],
    [[2, 2], [4, 2], [6, 4], [10, 2], [12, 4], [18, 2], [20, 2], [22, 2], [24, 4], [28, 4]],
    [[0, 3], [3, 3], [6, 2], [10, 2], [12, 2], [14, 2], [16, 6], [24, 2], [26, 2], [28, 4]],
  ],
  chill: [
    [[2, 4], [6, 2], [8, 6], [18, 2], [20, 4], [24, 8]],
    [[0, 6], [8, 2], [10, 6], [20, 2], [22, 2], [24, 8]],
  ],
  retro: [
    [[0, 4], [4, 4], [8, 2], [10, 6], [16, 4], [20, 4], [24, 8]],
    [[0, 2], [2, 2], [4, 4], [8, 8], [16, 2], [18, 2], [20, 4], [24, 8]],
  ],
  cinematic: [
    [[0, 6], [6, 2], [8, 8], [16, 6], [22, 2], [24, 8]],
    [[0, 4], [4, 4], [8, 8], [16, 4], [20, 4], [24, 8]],
  ],
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function rngOf(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Topology-preserving state-variable filter (cheap, stable under modulation). */
class SVF {
  constructor(fc = 1000, q = 0.7) {
    this.ic1 = 0;
    this.ic2 = 0;
    this.set(fc, q);
  }
  set(fc, q = this.q) {
    this.q = q;
    const g = Math.tan((Math.PI * Math.min(fc, SR * 0.45)) / SR);
    const k = 1 / q;
    this.k = k;
    this.a1 = 1 / (1 + g * (g + k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }
  run(v0) {
    const v3 = v0 - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.lp = v2;
    this.bp = v1;
    this.hp = v0 - this.k * v1 - v2;
    return v2;
  }
}
const blep = (t, dt) => {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
};

/**
 * Synthesise a track. Returns { left, right, bpm, mood, sampleRate }.
 * @param {{mood?:string, duration?:number, bpm?:number, key?:string|number, seed?:number}} o
 */
export function synthMusic(o = {}) {
  const mood = ALIASES[String(o.mood || 'upbeat').toLowerCase()] || String(o.mood || 'upbeat').toLowerCase();
  const M = MOODS[mood];
  if (!M) throw new Error(`Unknown music mood "${o.mood}". Moods: ${Object.keys(MOODS).join(', ')}`);
  const duration = Math.max(2, Number(o.duration) || 30);
  const bpm = Math.min(200, Math.max(50, Number(o.bpm) || M.bpm));
  const key = o.key == null ? M.key : typeof o.key === 'number' ? ((o.key % 12) + 12) % 12 : KEYS[String(o.key).toLowerCase()];
  if (key == null) throw new Error(`Unknown key "${o.key}". Use a note name like C, F#, Bb.`);
  const rnd = rngOf((Number(o.seed) || 1) * 7919 + mood.length * 104729);
  const nrnd = rngOf(12345); // noise source
  const noise = () => nrnd() * 2 - 1;

  const beat = 60 / bpm;
  const bar = beat * 4;
  const s16 = beat / 4;
  const N = Math.ceil(duration * SR);
  const scale = SCALES[M.scale];
  const bus = () => [new Float32Array(N), new Float32Array(N)];
  const D = bus(); // drums (not pumped)
  const Mu = bus(); // music (side-chain pumped by the kick)
  const R = bus(); // reverb send
  const E = new Float32Array(N); // echo send (mono → ping-pong)
  const kicks = [];
  const at = (t) => Math.round(t * SR);
  const add = (b, i, l, r) => {
    if (i >= 0 && i < N) {
      b[0][i] += l;
      b[1][i] += r;
    }
  };

  // ── harmony ──────────────────────────────────────────────────────────────
  const degreeNote = (d) => scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7) + key;
  const chordOf = (deg, n = M.sevenths ? 4 : 3) => Array.from({ length: n }, (_, k) => degreeNote(deg + 2 * k));
  const voice = (pcs, lo) => pcs.map((p) => lo + ((((p - lo) % 12) + 12) % 12)).sort((a, b) => a - b);
  const tonesIn = (pcs, lo, hi) => {
    const out = [];
    for (let m = lo; m <= hi; m++) if (pcs.some((p) => (((m - p) % 12) + 12) % 12 === 0)) out.push(m);
    return out;
  };

  // ── instruments ──────────────────────────────────────────────────────────
  function kick(t0, v = 1, tone = 1) {
    kicks.push(t0);
    const i0 = at(t0);
    const len = Math.round(0.5 * SR);
    let ph = 0;
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      ph += (2 * Math.PI * (44 * tone + 115 * Math.exp(-t * 32))) / SR;
      let s = Math.sin(ph) * Math.exp(-t * 6.2) * Math.min(1, n / 60);
      if (n < 180) s += noise() * 0.22 * (1 - n / 180);
      add(D, i0 + n, s * v * 0.95, s * v * 0.95);
    }
  }
  function snare(t0, v = 1, gated = false) {
    const i0 = at(t0);
    const f = new SVF(gated ? 1500 : 1900, 0.8);
    const len = Math.round((gated ? 0.42 : 0.26) * SR);
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      const env = gated ? (t < 0.22 ? Math.exp(-t * 3.5) : Math.exp(-0.77 - (t - 0.22) * 40)) : Math.exp(-t * 19);
      f.run(noise());
      const s = (f.bp * 1.6 * env + Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 32) * 0.55) * v * 0.42;
      add(D, i0 + n, s, s);
      add(R, i0 + n, s * (gated ? 0.55 : 0.22), s * (gated ? 0.55 : 0.22));
    }
  }
  function clap(t0, v = 1) {
    const i0 = at(t0);
    const f = new SVF(1250, 1.3);
    const len = Math.round(0.3 * SR);
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      let env = Math.exp(-t * 15) * 0.55;
      for (let k = 0; k < 3; k++) if (t >= k * 0.011) env += Math.exp(-(t - k * 0.011) * 90) * 0.6;
      f.run(noise());
      const s = f.bp * env * v * 0.95;
      add(D, i0 + n, s * 0.95, s);
      add(R, i0 + n, s * 0.3, s * 0.3);
    }
  }
  function hat(t0, v = 1, open = false) {
    const i0 = at(t0);
    const f = new SVF(8200, 0.9);
    const len = Math.round((open ? 0.32 : 0.07) * SR);
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      f.run(noise());
      const s = f.hp * Math.exp(-t * (open ? 11 : 60)) * v * 0.24;
      add(D, i0 + n, s * 0.8, s);
    }
  }
  function crash(t0, v = 1) {
    const i0 = at(t0);
    const fl = new SVF(5200, 0.7);
    const fr = new SVF(5600, 0.7);
    const len = Math.round(2.6 * SR);
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      const env = Math.exp(-t * 1.9) * v * 0.13;
      fl.run(noise());
      fr.run(noise());
      add(D, i0 + n, fl.hp * env, fr.hp * env);
      add(R, i0 + n, fl.hp * env * 0.3, fr.hp * env * 0.3);
    }
  }
  function tom(t0, f0 = 70, v = 1) {
    const i0 = at(t0);
    const len = Math.round(0.9 * SR);
    let ph = 0;
    const lp = new SVF(900, 0.7);
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      ph += (2 * Math.PI * f0 * (1 + 0.5 * Math.exp(-t * 18))) / SR;
      lp.run(noise());
      const s = (Math.sin(ph) * Math.exp(-t * 4.5) + lp.lp * Math.exp(-t * 14) * 0.5) * v * 0.7;
      add(D, i0 + n, s, s);
      add(R, i0 + n, s * 0.35, s * 0.35);
    }
  }
  function riser(t0, len, v = 1) {
    const i0 = at(t0);
    const L = Math.round(len * SR);
    const f = new SVF(300, 2.5);
    for (let n = 0; n < L; n++) {
      const p = n / L;
      if (n % 32 === 0) f.set(300 * Math.pow(25, p), 2.5);
      f.run(noise());
      const s = f.bp * p * p * v * 0.3;
      add(D, i0 + n, s * (1 - p * 0.5), s * (0.5 + p * 0.5));
      add(R, i0 + n, s * 0.5, s * 0.5);
    }
  }
  function bass(t0, m, dur, v = 1, kind = 'pluck') {
    const i0 = at(t0);
    const f = mtof(m);
    const dt = f / SR;
    const L = Math.round((dur + 0.06) * SR);
    const lp = new SVF(400, kind === 'saw' ? 1.4 : 0.9);
    let a = 0;
    let b = 0.37;
    let ph = 0;
    for (let n = 0; n < L; n++) {
      const t = n / SR;
      if (n % 16 === 0) lp.set(kind === 'sub' ? 380 : kind === 'saw' ? 260 + 1700 * Math.exp(-t * 9) : 180 + 1100 * Math.exp(-t * 11));
      a += dt;
      if (a >= 1) a -= 1;
      b += dt * 1.004;
      if (b >= 1) b -= 1;
      ph += 2 * Math.PI * f / SR;
      const saw = 2 * a - 1 - blep(a, dt) + 2 * b - 1 - blep(b, dt * 1.004);
      const raw = kind === 'sub' ? Math.sin(ph) + 0.25 * Math.sin(2 * ph) : saw * 0.35 + Math.sin(ph) * 0.8;
      const env = Math.min(1, n / 90) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.06) : 1);
      const s = lp.run(raw) * env * v * 0.42;
      add(Mu, i0 + n, s, s);
    }
  }
  function pad(t0, notes, dur, v = 1, strings = false) {
    const i0 = at(t0);
    const att = strings ? 0.7 : 0.35;
    const rel = strings ? 1.2 : 0.9;
    const L = Math.round((dur + rel) * SR);
    notes.forEach((m, j) => {
      const f = mtof(m);
      const det = [-0.0047, 0, 0.0047];
      const ph = det.map(() => rnd());
      const lp = new SVF(strings ? 2000 : 1500, 0.6);
      const pan = notes.length > 1 ? (j / (notes.length - 1)) * 2 - 1 : 0;
      for (let n = 0; n < L; n++) {
        const t = n / SR;
        if (n % 64 === 0) lp.set((strings ? 1900 : 1300) + 500 * Math.sin(2 * Math.PI * 0.11 * (t0 + t) + j));
        const vib = strings ? 1 + 0.003 * Math.sin(2 * Math.PI * 5.2 * t) * Math.min(1, t / 0.6) : 1;
        let s = 0;
        for (let k = 0; k < 3; k++) {
          const dt = (f * (1 + det[k]) * vib) / SR;
          ph[k] += dt;
          if (ph[k] >= 1) ph[k] -= 1;
          s += 2 * ph[k] - 1 - blep(ph[k], dt);
        }
        const env = Math.min(1, t / att) * (t > dur ? Math.max(0, 1 - (t - dur) / rel) : 1);
        s = lp.run(s) * env * v * 0.032;
        const l = s * (1 - pan * 0.6);
        const r = s * (1 + pan * 0.6);
        add(Mu, i0 + n, l, r);
        add(R, i0 + n, l * 0.45, r * 0.45);
      }
    });
  }
  function epiano(t0, m, dur, v = 1, pan = 0) {
    const i0 = at(t0);
    const f = mtof(m);
    const L = Math.round(Math.min(dur + 0.5, 4) * SR);
    for (let n = 0; n < L; n++) {
      const t = n / SR;
      const I = 1.5 * Math.exp(-t * 2.8) + 0.25;
      const mod = Math.sin(2 * Math.PI * f * t) * I;
      let s = Math.sin(2 * Math.PI * f * t + mod) * Math.exp(-t * 1.1);
      s += Math.sin(2 * Math.PI * f * 7.02 * t) * Math.exp(-t * 18) * 0.12; // tine
      const env = Math.min(1, n / 80) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.5) : 1);
      const trem = 1 + 0.25 * Math.sin(2 * Math.PI * 4.5 * t);
      s *= env * v * 0.11;
      add(Mu, i0 + n, s * (1 - pan) * (2 - trem) * 0.5 + s * 0.5, s * (1 + pan) * trem * 0.5 + s * 0.5);
      add(R, i0 + n, s * 0.3, s * 0.3);
    }
  }
  function pluck(t0, m, v = 1, bright = 0.6, pan = 0) {
    // Karplus–Strong string
    const i0 = at(t0);
    const f = mtof(m);
    const P = Math.max(2, Math.round(SR / f));
    const buf = new Float32Array(P);
    let y = 0;
    for (let k = 0; k < P; k++) {
      y += (noise() - y) * bright;
      buf[k] = y;
    }
    const L = Math.round(0.9 * SR);
    let idx = 0;
    for (let n = 0; n < L; n++) {
      const cur = buf[idx];
      const nxt = buf[(idx + 1) % P];
      buf[idx] = 0.4985 * (cur + nxt);
      idx = (idx + 1) % P;
      const s = cur * v * 0.5;
      add(Mu, i0 + n, s * (1 - pan), s * (1 + pan));
      E[i0 + n] !== undefined && (E[i0 + n] += s * 0.28);
    }
  }
  function sawPluck(t0, m, dur, v = 1, cutoff = 2400, pan = 0, echo = 0.3) {
    const i0 = at(t0);
    const f = mtof(m);
    const dt = f / SR;
    const L = Math.round((dur + 0.15) * SR);
    const lp = new SVF(cutoff, 1.1);
    let a = rnd();
    let b = rnd();
    for (let n = 0; n < L; n++) {
      const t = n / SR;
      if (n % 16 === 0) lp.set(300 + cutoff * Math.exp(-t * 14));
      a += dt;
      if (a >= 1) a -= 1;
      b += dt * 1.006;
      if (b >= 1) b -= 1;
      const raw = 2 * a - 1 - blep(a, dt) + 2 * b - 1 - blep(b, dt * 1.006);
      const env = Math.min(1, n / 40) * Math.exp(-t * 4) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.15) : 1);
      const s = lp.run(raw) * env * v * 0.16;
      add(Mu, i0 + n, s * (1 - pan), s * (1 + pan));
      if (i0 + n < N) E[i0 + n] += s * echo;
    }
  }
  function lead(t0, m, dur, v = 1, kind = 'bell') {
    const i0 = at(t0);
    const f = mtof(m);
    const rel = kind === 'bell' || kind === 'piano' ? 0.6 : 0.12;
    const L = Math.round((dur + rel) * SR);
    const lp = new SVF(2600, 0.8);
    let a = rnd();
    let b = rnd();
    let ph = 0;
    for (let n = 0; n < L; n++) {
      const t = n / SR;
      let s;
      if (kind === 'bell') {
        // marimba-like FM
        const I = 2.2 * Math.exp(-t * 22) + 0.3;
        s = Math.sin(2 * Math.PI * f * t + Math.sin(2 * Math.PI * f * t) * I) * Math.exp(-t * 4.5);
        s += Math.sin(2 * Math.PI * f * 3.99 * t) * Math.exp(-t * 26) * 0.18;
      } else if (kind === 'piano') {
        const I = 1.1 * Math.exp(-t * 5) + 0.1;
        s = Math.sin(2 * Math.PI * f * t + Math.sin(2 * Math.PI * f * 2 * t) * I) * Math.exp(-t * 1.6);
      } else {
        const vib = 1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, Math.max(0, (t - 0.18) / 0.3));
        if (kind === 'soft') {
          ph += (2 * Math.PI * f * vib) / SR;
          s = Math.sin(ph) + 0.12 * Math.sin(3 * ph);
        } else {
          const dt = (f * vib) / SR;
          a += dt;
          if (a >= 1) a -= 1;
          b += dt * 1.005;
          if (b >= 1) b -= 1;
          s = lp.run((2 * a - 1 - blep(a, dt) + 2 * b - 1 - blep(b, dt * 1.005)) * 0.5);
        }
        const env = Math.min(1, t / 0.02) * (t > dur ? Math.max(0, 1 - (t - dur) / rel) : 1);
        s *= env;
      }
      if (kind === 'bell' || kind === 'piano') s *= t > dur + 0.25 ? Math.max(0, 1 - (t - dur - 0.25) / 0.35) : 1;
      s *= v * (kind === 'saw' ? 0.13 : kind === 'soft' ? 0.11 : 0.14);
      add(Mu, i0 + n, s, s);
      add(R, i0 + n, s * 0.25, s * 0.25);
      if (i0 + n < N) E[i0 + n] += s * 0.35;
    }
  }
  function crackle() {
    const lp = new SVF(3000, 0.7);
    for (let n = 0; n < N; n++) {
      let s = lp.run(noise()) * 0.006;
      if (nrnd() < 0.00025) s += noise() * 0.12;
      add(D, n, s, s);
    }
  }

  // ── arrangement ──────────────────────────────────────────────────────────
  const tail = Math.min(3, duration * 0.25);
  const bars = Math.max(1, Math.floor((duration - tail) / bar));
  const endT = bars * bar;
  const plan = [];
  const intro = bars >= 24 ? 4 : bars >= 8 ? 2 : 0;
  for (let i = 0; i < intro; i++) plan.push({ type: 'intro', i, len: intro });
  const cycle = ['A', 'B', 'A', 'B', 'break', 'B', 'B', 'A', 'B', 'break'];
  for (let c = 0; plan.length < bars; c++) {
    let type = cycle[c % cycle.length];
    const left = bars - plan.length;
    if (type === 'break' && left < 12) type = 'B';
    const len = Math.min(type === 'break' ? 4 : 8, left);
    for (let i = 0; i < len; i++) plan.push({ type, i, len });
  }
  const hooks = HOOKS[mood];
  const motif = () => {
    const rh = hooks[Math.floor(rnd() * hooks.length)];
    let o = 0;
    return rh.map(([st, ln], j) => {
      if (j) o = Math.max(-3, Math.min(4, o + [-2, -1, -1, 1, 1, 2, 0][Math.floor(rnd() * 7)]));
      return { st, ln, o };
    });
  };
  const M1 = motif();
  const M2 = motif();
  const leadRange = { upbeat: [69, 88], chill: [67, 84], retro: [64, 84], cinematic: [62, 81] }[mood];
  const leadKind = { upbeat: 'bell', chill: 'soft', retro: 'saw', cinematic: 'piano' }[mood];
  const sw = (st) => (M.swing && st % 4 === 2 ? M.swing * beat : 0);

  if (mood === 'chill') crackle();
  plan.forEach((p, b) => {
    const t = b * bar;
    const prog = p.type === 'B' ? M.prog2 : M.prog;
    const deg = prog[b % 4];
    const pcs = chordOf(deg);
    const root = 36 + ((degreeNote(deg) - 36) % 12 + 12) % 12; // bass octave
    const padNotes = voice(pcs, mood === 'cinematic' ? 50 : 53);
    const drums = p.type === 'A' || p.type === 'B';
    const lastOfBlock = p.i === p.len - 1;
    const v = () => 0.9 + rnd() * 0.15;
    // crash on the downbeat of a new drum block
    if (drums && p.i === 0 && b > 0) crash(t, 0.9);
    if (lastOfBlock && (p.type === 'intro' || p.type === 'break') && b + 1 < bars) riser(t, bar, 0.9);

    // harmony bed
    if (mood === 'chill') {
      const hits = p.type === 'intro' || p.type === 'break' ? [[0, 16]] : [[0, 6], [6, 10]];
      for (const [st, ln] of hits) padNotes.forEach((m, j) => epiano(t + st * s16 + sw(st) + j * 0.012, m, ln * s16, (st ? 0.7 : 0.9) * v(), j / padNotes.length - 0.4));
    } else {
      pad(t, padNotes, bar, p.type === 'break' ? 1.15 : p.type === 'intro' ? 1 : 0.85, mood === 'cinematic');
    }

    // bass
    if (p.type !== 'intro') {
      if (mood === 'upbeat') {
        if (p.type === 'break') bass(t, root, bar * 0.95, 0.6, 'sub');
        else for (const st of [2, 6, 10, 14]) bass(t + st * s16, root + (st === 14 && b % 2 ? 12 : 0), s16 * 1.6, v());
      } else if (mood === 'chill') {
        bass(t, root, beat * 1.6, 0.95, 'sub');
        if (p.type !== 'break') bass(t + 10 * s16 + sw(10), root + 7, beat * 1.2, 0.7, 'sub');
      } else if (mood === 'retro') {
        if (p.type === 'break') bass(t, root, bar * 0.95, 0.55, 'sub');
        else for (let st = 0; st < 16; st += 2) bass(t + st * s16, root + (st % 4 === 2 ? 12 : 0), s16 * 1.7, 0.85 * v(), 'saw');
      } else {
        for (let st = 0; st < 16; st += 2) sawPluck(t + st * s16, root + 12 + (st % 8 === 6 ? 7 : 0), s16 * 1.5, (p.type === 'break' ? 0.6 : 1) * v(), 900, 0, 0.05);
        if (p.type !== 'break') bass(t, root, bar * 0.9, 0.7, 'sub');
      }
    } else if (mood === 'cinematic') {
      for (let st = 0; st < 16; st += 2) sawPluck(t + st * s16, root + 12, s16 * 1.5, 0.45 + 0.4 * (p.i / p.len), 700, 0, 0.05);
    }

    // arpeggio
    const arpTones = [...padNotes, ...padNotes.map((m) => m + 12)];
    if (mood === 'upbeat') {
      const open = p.type === 'intro' ? 0.25 + 0.5 * ((p.i + 1) / p.len) : p.type === 'break' ? 0.35 : 0.7;
      const pat = [0, 1, 2, 3, 4, 3, 2, 1];
      for (let st = 0; st < 16; st++) pluck(t + st * s16, arpTones[pat[st % 8] % arpTones.length] + 12, (st % 4 === 0 ? 0.55 : 0.38) * v(), open, st % 2 ? 0.35 : -0.35);
    } else if (mood === 'retro') {
      const pat = [0, 1, 2, 1, 3, 1, 2, 1];
      const cut = p.type === 'intro' ? 600 + 2400 * ((p.i + 1) / p.len) : 2600;
      for (let st = 0; st < 16; st++) sawPluck(t + st * s16, arpTones[pat[st % 8] % arpTones.length] + 12, s16 * 0.8, 0.8 * v(), cut, st % 2 ? 0.4 : -0.4, 0.3);
    }

    // drums
    if (drums) {
      if (mood === 'upbeat') {
        for (let k = 0; k < 4; k++) kick(t + k * beat, k ? 0.95 : 1);
        clap(t + beat, v());
        clap(t + 3 * beat, v());
        for (let st = 0; st < 16; st++) {
          if (st % 4 === 2) hat(t + st * s16, 0.95, p.type === 'B');
          else hat(t + st * s16, 0.35 * v());
        }
      } else if (mood === 'chill') {
        kick(t, 0.9, 0.95);
        kick(t + 10 * s16 + sw(10), 0.7, 0.95);
        if (b % 2) kick(t + 7 * s16, 0.45, 0.95);
        snare(t + beat, 0.75);
        snare(t + 3 * beat, 0.75);
        for (let st = 0; st < 16; st += 2) hat(t + st * s16 + sw(st), (st % 4 ? 0.45 : 0.7) * v());
      } else if (mood === 'retro') {
        kick(t, 1);
        kick(t + 2 * beat, 1);
        if (p.type === 'B') kick(t + 10 * s16, 0.6);
        snare(t + beat, 0.9, true);
        snare(t + 3 * beat, 0.9, true);
        for (let st = 0; st < 16; st++) hat(t + st * s16, (st % 2 ? 0.3 : 0.6) * v());
      } else {
        tom(t, 52, 1.1);
        kick(t, 0.8, 0.9);
        tom(t + 6 * s16, 60, 0.75);
        tom(t + 10 * s16, 52, 0.9);
        snare(t + 2 * beat, 1, true);
        if (p.type === 'B') for (let st = 1; st < 16; st += 2) hat(t + st * s16, 0.35 * v());
      }
      // fill into the next block
      if (lastOfBlock && b + 1 < bars) {
        for (let st = 12; st < 16; st++) {
          if (mood === 'cinematic') tom(t + st * s16, 90 - (st - 12) * 9, 0.6 + (st - 12) * 0.12);
          else snare(t + st * s16, 0.45 + (st - 12) * 0.15, mood === 'retro');
        }
      }
    }

    // hook
    if (p.type === 'B' || p.type === 'break') {
      const pair = Math.floor(p.i / 2);
      const half = p.i % 2;
      const mot = p.type === 'break' ? (pair === 0 ? M2 : M1) : pair === 2 ? M2 : M1;
      const tones = tonesIn(pcs, leadRange[0], leadRange[1]);
      const center = (leadRange[0] + leadRange[1]) / 2;
      let base = 0;
      tones.forEach((m, k) => Math.abs(m - center) < Math.abs(tones[base] - center) && (base = k));
      const notes = mot.filter((n) => (half ? n.st >= 16 : n.st < 16));
      notes.forEach((n, j) => {
        let idx = Math.max(0, Math.min(tones.length - 1, base + n.o));
        const lastNote = half && j === notes.length - 1 && p.i === p.len - 1;
        if (lastNote) idx = tones.reduce((best, m, k) => ((m - pcs[0]) % 12 === 0 && Math.abs(k - idx) < Math.abs(best - idx) ? k : best), idx);
        lead(t + (n.st - half * 16) * s16 + sw(n.st), tones[idx], n.ln * s16 * 0.92, (p.type === 'break' ? 0.8 : 1) * v(), leadKind);
      });
    }
  });

  // ending: one big tonic hit that rings out
  const tonic = chordOf(0);
  const tRoot = 36 + ((key - 36) % 12 + 12) % 12;
  const ring = duration - endT;
  kick(endT, 1.05);
  crash(endT, 1);
  if (mood === 'cinematic') tom(endT, 48, 1.2);
  if (mood === 'chill') voice(tonic, 53).forEach((m, j) => epiano(endT + j * 0.02, m, ring, 0.9, j / 3 - 0.4));
  else pad(endT, voice(tonic, 53), Math.max(0.3, ring - 1), 1.1, mood === 'cinematic');
  bass(endT, tRoot, Math.max(0.3, ring - 0.8), 0.8, 'sub');
  lead(endT, tonesIn(tonic, leadRange[0], leadRange[1]).find((m) => (m - key) % 12 === 0) ?? 72, Math.max(0.3, ring - 1), 0.9, leadKind);

  // ── mix ──────────────────────────────────────────────────────────────────
  const left = new Float32Array(N);
  const right = new Float32Array(N);
  // Freeverb-style reverb
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const aps = [556, 441, 341, 225];
  const mk = (sp) => ({
    c: combs.map((l) => ({ b: new Float32Array(l + sp), i: 0, s: 0 })),
    a: aps.map((l) => ({ b: new Float32Array(l + sp), i: 0 })),
  });
  const rv = [mk(0), mk(23)];
  const fb = M.room;
  const damp = 0.3;
  const reverb = (r, x) => {
    let out = 0;
    for (const c of r.c) {
      const y = c.b[c.i];
      c.s = y * (1 - damp) + c.s * damp;
      c.b[c.i] = x + c.s * fb;
      c.i = (c.i + 1) % c.b.length;
      out += y;
    }
    for (const a of r.a) {
      const y = a.b[a.i];
      a.b[a.i] = out + y * 0.5;
      a.i = (a.i + 1) % a.b.length;
      out = y - out;
    }
    return out;
  };
  // ping-pong echo, dotted eighth
  const dl = Math.round(beat * 0.75 * SR);
  const eL = new Float32Array(dl);
  const eR = new Float32Array(dl);
  let ei = 0;
  let eLp = 0;
  // kick side-chain pump
  let kp = 0;
  kicks.sort((a, b) => a - b);
  let hpL = 0;
  let hpR = 0;
  let pxL = 0;
  let pxR = 0;
  for (let n = 0; n < N; n++) {
    const t = n / SR;
    while (kp + 1 < kicks.length && kicks[kp + 1] <= t) kp++;
    let pump = 1;
    if (kicks.length && kicks[kp] <= t) pump = 1 - M.pump * (1 - Math.min(1, Math.pow((t - kicks[kp]) / 0.2, 0.7)));
    const wl = reverb(rv[0], (R[0][n] + R[1][n]) * 0.5 * 0.03 + R[0][n] * 0.012);
    const wr = reverb(rv[1], (R[0][n] + R[1][n]) * 0.5 * 0.03 + R[1][n] * 0.012);
    const oL = eL[ei];
    const oR = eR[ei];
    eLp += (E[n] + oR * 0.42 - eLp) * 0.5; // damped feedback
    eL[ei] = eLp;
    eR[ei] = oL * 0.42;
    ei = (ei + 1) % dl;
    let l = D[0][n] + Mu[0][n] * pump + wl + oL * 0.55;
    let r = D[1][n] + Mu[1][n] * pump + wr + oR * 0.55;
    // DC / rumble high-pass (~25 Hz)
    hpL = 0.9965 * (hpL + l - pxL);
    pxL = l;
    hpR = 0.9965 * (hpR + r - pxR);
    pxR = r;
    left[n] = hpL;
    right[n] = hpR;
  }
  // loudness: bring the busy part to a steady level, then a soft clip keeps peaks under 0 dBFS
  const sample = [];
  for (let n = 0; n < N; n += 97) sample.push(Math.abs(left[n]) + Math.abs(right[n]));
  sample.sort((a, b) => a - b);
  const ref = sample[Math.floor(sample.length * 0.995)] / 2 || 1;
  const g = 0.72 / ref;
  const fadeIn = Math.round(0.01 * SR);
  const fadeOut = Math.round(Math.min(1.5, ring * 0.6) * SR);
  for (let n = 0; n < N; n++) {
    const f = Math.min(1, n / fadeIn) * Math.min(1, (N - n) / fadeOut);
    left[n] = Math.tanh(left[n] * g * 1.1) * 0.92 * f;
    right[n] = Math.tanh(right[n] * g * 1.1) * 0.92 * f;
  }
  return { left, right, bpm, mood, key, sampleRate: SR, duration };
}

/** Write a 16-bit stereo WAV. */
export function writeWav(file, { left, right, sampleRate = SR }) {
  const n = left.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
}
