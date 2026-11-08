// presenter — your own mascot hosts the video. Pixel-art characters stand in
// front of any scene (use it as an overlay), talk in sync with their voice
// lines, blink, breathe, raise their brows, strike poses and hand the word to
// each other. Two kinds of character:
//   • a layered pixel rig of your own (a folder of PNGs + rig.json — see SKILL.md)
//   • Bit, the built-in screen-faced robot (no files needed)
//
// Lines: [{ who, at, text, voice, pose, mood, place }] or a script
// ("Rudy [point, happy]: words / Bit [surprised]: words") that plays in order.
const BIT = { W: 30, H: 34 };
const C = { k: '#14101a', g: '#cfdcd9', G: '#8ea6a2', h: '#f4f9f8', s: '#061113', t: '#14d8c0', T: '#0b6b62', a: '#ff6b5a', y: '#ffb547' };

const BIT_MOODS = { happy: 'mutlu', neutral: 'notr', surprised: 'saskin', question: 'soru', curious: 'soru', blank: 'bos', deadpan: 'bos', love: 'kalp', loading: 'yukleniyor', thinking: 'yukleniyor', off: 'kapali', cute: 'bebek' };
// brow offsets (px, minus = up) for [inner, outer]
const BROWS = { neutral: [0, 0], surprised: [-1, -1], angry: [1, 0], sad: [-1, 0], happy: [-1, -1], curious: [-1, 0] };
const PLACES = ['corner', 'stage', 'hidden', 'left', 'right'];

export default {
  id: 'presenter',
  title: 'Presenter',
  tagline: 'Your own pixel mascot hosts the video: lip-synced to your voice-over, posing, blinking and passing the word to Bit the robot',
  fonts: [['Bricolage Grotesque', 800], ['JetBrains Mono', 700]],
  defaults: {
    text: 'Bit [happy]: Hi. I am Bit. / Bit [question]: Give me a voice file and I will lip-sync it. / Bit [love]: Or just text. I am flexible.',
    duration: 8,
    cast: [{ name: 'Bit', rig: 'bit' }],
    lines: [],
    voices: [],
    place: 'corner',
    captions: 'bubble',
    accent: '#ff6b5a',
    bg: '#16131c',
    backdrop: 'none',
    label: '',
  },
  options: {
    text: 'Script played in order: `Name [pose, mood, place]: words` per line ( / or newline between lines). *word* is highlighted',
    cast: 'Characters: [{ name, rig: "path/to/rig.json" | "bit", side: left|right, scale }]. rig.json lists the layer PNGs of a pixel character (see SKILL.md)',
    lines: 'Timed lines instead of a script: [{ who, at (s), text, voice (audio file), pose, mood, place }]. A line with only `at` + `place` just moves the hosts',
    voices: 'With a script: audio files, one per line in order. Each line lasts as long as its audio and the mouth follows it',
    place: 'Starting layout: corner (small, bottom) | stage (big, centre) | left | right | hidden',
    captions: 'bubble (speech bubbles, words appear as they are said) | none',
    accent: 'Highlight colour for *words*',
    bg: 'Background when used as a scene (as an overlay it is transparent)',
    backdrop: 'none | studio — a soft-lit stage behind the hosts when used as a scene',
    label: 'Small mono caption at the top of the studio backdrop (e.g. "RUDYWIZZ · 03 · HOW IT WORKS")',
  },

  async setup(api) {
    const { p, W, H } = api;
    const S = Math.min(W, H) / 1080;
    const portrait = H > W * 1.1;

    // ── cast ────────────────────────────────────────────────────────────────
    const cast = [];
    for (const [i, c] of (p.cast || []).entries()) {
      const m = { name: c.name || `Host ${i + 1}`, side: c.side || (i === 0 ? 'left' : 'right'), scale: c.scale || 1, seed: i * 17 + 3 };
      if (!c.rig || c.rig === 'bit') {
        m.kind = 'bit';
        m.grid = [BIT.W, BIT.H];
      } else {
        const rig = typeof c.rig === 'string' ? await (await fetch(c.rig)).json() : c.rig;
        m.kind = 'rig';
        m.rig = rig;
        m.grid = rig.grid;
        const base = typeof c.rig === 'string' ? c.rig.replace(/[^/]*$/, '') : '';
        const load = (src) => (src ? api.loadImage(/^(blob:|data:|https?:|\/)/.test(src) ? src : base + src) : null);
        m.img = {
          layers: await Promise.all(rig.layers.map((l) => load(l.src))),
          eyes: await Promise.all((rig.eyes || []).map((e) => load(e.src))),
          brows: await Promise.all((rig.brows || []).map((b) => load(b.src))),
          mouths: await Promise.all((rig.mouths || []).map((s) => load(s))),
          poses: Object.fromEntries(await Promise.all(Object.entries(rig.poses || {}).map(async ([k, v]) => [k, await load(v.src)]))),
        };
      }
      m.cv = document.createElement('canvas');
      cast.push(m);
    }
    const byName = new Map(cast.map((m) => [m.name.toLowerCase(), m]));

    // ── lines ───────────────────────────────────────────────────────────────
    let lines = Array.isArray(p.lines) && p.lines.length ? p.lines.map((l) => ({ ...l })) : parseScript(p.text, p.voices);
    let tEnd = 0.4;
    for (const l of lines) {
      if (l.at == null) l.at = tEnd + (l.text ? 0.3 : 0);
      const words = String(l.text || '').split(/\s+/).filter(Boolean).length;
      l.dur = l.voice && l.voice.dur ? l.voice.dur : l.text ? Math.max(1.2, words * 0.36 + 0.4) : 0;
      l.end = l.at + l.dur;
      l.m = l.who ? byName.get(String(l.who).toLowerCase()) : null;
      if (l.voice) api.cue(l.voice, l.at);
      if (l.text) tEnd = l.end;
    }
    lines.sort((a, b) => a.at - b.at);

    // ── layouts ─────────────────────────────────────────────────────────────
    // a character's box: centre x, feet y (fractions) and height (fraction of H)
    const L = portrait
      ? {
          corner: { left: [0.2, 0.985, 0.36], right: [0.8, 0.8, 0.13] },
          stage: { left: [0.3, 1.0, 0.54], right: [0.8, 0.6, 0.17] },
          left: { left: [0.24, 1.0, 0.44], right: [0.6, 0.66, 0.15] },
          right: { left: [0.62, 1.0, 0.44], right: [0.86, 0.66, 0.15] },
        }
      : {
          corner: { left: [0.09, 0.99, 0.5], right: [0.92, 0.8, 0.2] },
          stage: { left: [0.4, 1.0, 0.82], right: [0.62, 0.62, 0.28] },
          left: { left: [0.16, 1.0, 0.75], right: [0.33, 0.6, 0.26] },
          right: { left: [0.8, 1.0, 0.75], right: [0.94, 0.6, 0.26] },
        };
    const boxFor = (m, place) => {
      const solo = cast.length === 1;
      const pl = place === 'hidden' ? 'corner' : place;
      let b = (L[pl] || L.corner)[m.side === 'left' ? 'left' : 'right'];
      if (solo && m.kind === 'bit') b = [b[0], Math.min(0.97, b[1] + 0.12), b[2] * 1.6];
      let [x, y, h] = b;
      h *= m.scale;
      if (m.kind === 'bit' && !solo) h = h; // robots float; their y is their feet when hovering
      if (place === 'hidden') y = 1.04 + h;
      return { x, y, h };
    };
    const placeAt = (t) => {
      let pl = PLACES.includes(p.place) ? p.place : 'corner';
      let since = -10;
      let prev = pl;
      for (const l of lines) {
        if (l.place && PLACES.includes(l.place) && l.at - 0.35 <= t) {
          prev = pl;
          pl = l.place;
          since = l.at - 0.35;
        }
      }
      return { pl, prev, k: api.clamp((t - since) / 0.6) };
    };

    const blinks = (seed) => {
      const out = [];
      let t = 0.8 + api.hash(seed, 1) * 1.2;
      for (let i = 1; t < p.duration + 2; i++) {
        out.push(t);
        if (api.hash(seed, i, 7) < 0.18) out.push(t + 0.27);
        t += 2.2 + api.hash(seed, i) * 3.3;
      }
      return out;
    };
    for (const m of cast) m.blinks = blinks(m.seed);

    const bg = p.alpha ? null : p.bg;
    return { cast, lines, boxFor, placeAt, S, portrait, bg };
  },

  frame(api, t, st) {
    const { ctx, W, H, p, fps } = api;
    api.bg(st.bg);
    if (!p.overlay && p.backdrop === 'studio') studio(api, t, st);
    const f = Math.round(t * fps);
    const { pl, prev, k } = st.placeAt(t);
    const e = ease(k);

    // who is speaking now / last
    const cur = st.lines.filter((l) => l.text && t >= l.at - 0.05 && t < l.end + 0.35);
    const speaking = new Set(cur.filter((l) => t < l.end).map((l) => l.m));

    const drawn = [];
    for (const m of st.cast) {
      const a = st.boxFor(m, prev);
      const b = st.boxFor(m, pl);
      const box = { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), h: lerp(a.h, b.h, e) };
      const line = [...st.lines].reverse().find((l) => l.m === m && l.text && t >= l.at - 0.05 && t < l.end + 0.6);
      const lastMood = [...st.lines].reverse().find((l) => l.m === m && l.mood && t >= l.at - 0.05);
      const mood = (lastMood && lastMood.mood) || 'neutral';
      const env = line && line.voice && t < line.end ? line.voice.env : null;
      const lf = line ? Math.floor((t - line.at) * fps) : 0;
      const loud = env ? env[lf] || 0 : line && t < line.end && !line.voice ? fakeTalk(t, m.seed) : 0;
      const other = st.lines.find((l) => l.m && l.m !== m && t >= l.at && t < l.end);
      const gaze = other ? (other.m.side === 'left' ? -1 : 1) * (m.side === 'left' ? 1 : 1) : 0;

      let px; // pixel size
      const hp = box.h * H;
      px = hp / m.grid[1];
      if (px >= 2) px = Math.round(px);
      const feetX = box.x * W;
      const feetY = box.y * H;
      if (m.kind === 'bit') {
        drawBit(m, { t, f, fps, mood, loud, talking: speaking.has(m), wave: line && line.pose === 'wave' && t < line.end });
        const hover = Math.round(Math.sin(t * 2.4 + m.seed) * 0.6 + 0.4);
        const x = Math.round(feetX - (BIT.W * px) / 2);
        const y = Math.round(feetY - BIT.H * px - hover * px);
        shadow(ctx, feetX, feetY + px * 1.5, BIT.W * px * 0.32, px * 1.6, 0.28 - hover * 0.06);
        blit(ctx, m.cv, x, y, px);
        drawn.push({ m, x, y, w: BIT.W * px, h: BIT.H * px });
      } else {
        const pose = line && line.pose && m.rig.poses && m.rig.poses[line.pose] ? line.pose : null;
        const { cv, anchor, gw, gh } = drawRig(m, { t, f, fps, mood, loud, line, pose, gaze, env, lf });
        const x = Math.round(feetX - anchor * px);
        const y = Math.round(feetY - gh * px);
        shadow(ctx, feetX, feetY - px * 2, m.grid[0] * px * 0.36, px * 4, 0.3);
        blit(ctx, cv, x, y, px, gw, gh);
        drawn.push({ m, x: feetX - (m.grid[0] * px) / 2, y, w: m.grid[0] * px, h: gh * px });
      }
    }

    if (p.captions !== 'none') {
      for (const l of cur) {
        const d = drawn.find((q) => q.m === l.m);
        bubble(api, st, l, d, t);
      }
    }
  },
};

// ── helpers ─────────────────────────────────────────────────────────────────
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
function fakeTalk(t, seed) {
  const s = Math.sin(t * 17 + seed) * 0.5 + Math.sin(t * 7.3 + seed * 2) * 0.5;
  return Math.max(0, s);
}

function parseScript(text, voices) {
  const out = [];
  const parts = String(text || '').split(/\n|\s\/\s/).map((s) => s.trim()).filter(Boolean);
  let vi = 0;
  for (const part of parts) {
    const m = part.match(/^([^:[\]]+?)\s*(?:\[([^\]]*)\])?\s*:\s*(.*)$/);
    if (!m) continue;
    const tags = (m[2] || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const l = { who: m[1].trim(), text: m[3].trim() };
    for (const tg of tags) {
      if (PLACES.includes(tg)) l.place = tg;
      else if (BROWS[tg] || BIT_MOODS[tg]) l.mood = tg;
      else l.pose = tg;
    }
    if (l.text && Array.isArray(voices)) l.voice = voices[vi++] || null;
    out.push(l);
  }
  return out;
}

function shadow(ctx, x, y, rx, ry, a) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${Math.max(0, a)})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function blit(ctx, cv, x, y, px, gw = cv.width, gh = cv.height) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, 0, 0, gw, gh, x, y, gw * px, gh * px);
  ctx.restore();
}

/** Mouth shape from loudness: 0 closed · 1 slight · 2 wide A · 3 E/I · 4 O/U · 5 F/V. Held ≥ 3 frames. */
function mouthShape(env, lf, seed) {
  const slot = Math.floor(lf / 3);
  const at = (i) => (env ? env[Math.max(0, Math.min(env.length - 1, i))] || 0 : 0);
  const v = (at(slot * 3) + at(slot * 3 + 1) + at(slot * 3 + 2)) / 3;
  if (v < 0.12) return 0;
  const prev = (at(slot * 3 - 3) + at(slot * 3 - 2)) / 2;
  const next = (at(slot * 3 + 3) + at(slot * 3 + 4)) / 2;
  if (v < prev * 0.55 && v < next * 0.55) return 0; // a dip between syllables: lips meet
  const r = hashN(slot, seed);
  if (v > 0.62) return r < 0.6 ? 2 : 4;
  if (v > 0.32) return r < 0.4 ? 3 : r < 0.7 ? 4 : r < 0.85 ? 2 : 1;
  return r < 0.75 ? 1 : 5;
}
function hashN(a, b) {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function drawRig(m, { t, f, fps, mood, loud, line, pose, gaze, env, lf }) {
  const rig = m.rig;
  const cv = m.cv;
  if (pose) {
    const P = rig.poses[pose];
    const [cw, ch] = P.cell;
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const c = cv.getContext('2d');
    c.clearRect(0, 0, cw, ch);
    const intro = P.intro || [];
    const loop = P.loop && P.loop.length ? P.loop : [P.frames - 1];
    const outro = P.outro || [];
    const step = Math.floor((t - line.at) * 8);
    const toEnd = Math.floor((line.end + 0.6 - t) * 8);
    let i;
    if (toEnd < outro.length) i = outro[Math.max(0, outro.length - 1 - toEnd)];
    else if (step < intro.length) i = intro[Math.max(0, step)];
    else i = loop[Math.floor((step - intro.length) / 2) % loop.length];
    c.drawImage(m.img.poses[pose], i * cw, 0, cw, ch, 0, 0, cw, ch);
    return { cv, anchor: P.anchor ?? cw / 2, gw: cw, gh: ch };
  }
  const [gw, gh] = rig.grid;
  if (cv.width !== gw || cv.height !== gh) { cv.width = gw; cv.height = gh; }
  const c = cv.getContext('2d');
  c.clearRect(0, 0, gw, gh);
  const breath = Math.sin((t / 3.6) * Math.PI * 2 + m.seed) > 0.3 ? -1 : 0;
  const talking = loud > 0.12;
  // head dips on a syllable onset
  const onset = env && (env[lf] || 0) > 0.55 && (env[lf - 2] || 0) < 0.3;
  const head = breath + (onset ? 1 : 0);
  const sentenceStart = line && t - line.at < 0.3 && t >= line.at;
  const [bi, bo] = (BROWS[mood] || BROWS.neutral).map((v) => v - (sentenceStart ? 1 : 0));
  const blinkFrames = [1, 2, 2, 1];
  const blink = m.blinks.reduce((s, b) => {
    const i = Math.floor((t - b) * fps);
    return i >= 0 && i < blinkFrames.length ? Math.max(s, blinkFrames[i]) : s;
  }, 0);
  rig.layers.forEach((l, i) => {
    const dy = l.move === 'breath' ? breath : l.move === 'head' ? head : 0;
    if (m.img.layers[i]) c.drawImage(m.img.layers[i], 0, dy);
  });
  (rig.eyes || []).forEach((e, i) => {
    c.save();
    c.beginPath();
    c.rect(e.x, e.y + head, e.w, e.h);
    c.clip();
    c.drawImage(m.img.eyes[i], gaze, head);
    if (blink > 0) {
      c.fillStyle = rig.lid || '#bb7650';
      c.fillRect(e.x, e.y + head, e.w, blink);
      c.fillStyle = rig.lash || '#2b1610';
      c.fillRect(e.x + 1, e.y + head + blink, e.w - 2, 1);
    }
    c.restore();
  });
  (rig.brows || []).forEach((b, i) => c.drawImage(m.img.brows[i], 0, head + (b.part === 'outer' ? bo : bi)));
  const shape = talking ? (env ? mouthShape(env, lf, m.seed) : [1, 2, 3, 4, 1, 0][Math.floor(t * 9 + m.seed) % 6]) : 0;
  const mouth = m.img.mouths[shape];
  if (shape > 0 && mouth) c.drawImage(mouth, 0, head);
  return { cv, anchor: gw / 2, gw, gh };
}

function drawBit(m, { t, f, fps, mood, loud, talking, wave }) {
  const cv = m.cv;
  if (cv.width !== BIT.W) { cv.width = BIT.W; cv.height = BIT.H; }
  const c = cv.getContext('2d');
  c.clearRect(0, 0, BIT.W, BIT.H);
  const r = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const ifade = BIT_MOODS[mood] || (Object.values(BIT_MOODS).includes(mood) ? mood : 'notr');
  const anten = Math.floor(t * 1.4) % 2 === 0 ? C.a : C.y;
  const gogus = talking ? (Math.floor(f / 3) % 2 === 0 ? C.t : C.h) : C.T;
  const kol = wave ? (Math.floor(f / 5) % 2 === 0 ? 1 : 0.6) : 0;
  // antenna
  r(14, 2, 2, 3, C.k); r(13, 0, 4, 2, anten); r(14, 0, 1, 1, C.h);
  // ears
  r(0, 11, 2, 6, C.k); r(1, 12, 1, 4, C.G); r(28, 11, 2, 6, C.k); r(28, 12, 1, 4, C.G);
  // head
  r(3, 5, 24, 1, C.k); r(3, 21, 24, 1, C.k); r(2, 6, 1, 15, C.k); r(27, 6, 1, 15, C.k);
  r(3, 6, 24, 15, C.g); r(3, 19, 24, 2, C.G); r(25, 6, 2, 15, C.G); r(4, 7, 6, 1, C.h);
  // screen
  r(5, 8, 20, 11, C.k); r(6, 9, 18, 9, C.s);
  // neck, body
  r(13, 22, 4, 1, C.k); r(9, 23, 12, 1, C.k); r(9, 31, 12, 1, C.k); r(8, 24, 1, 7, C.k); r(21, 24, 1, 7, C.k);
  r(9, 24, 12, 7, C.g); r(9, 29, 12, 2, C.G); r(13, 25, 4, 2, gogus);
  // arms
  r(5, 24, 3, 5, C.k); r(6, 25, 1, 3, C.G);
  const ky = 24 - Math.round(kol) * 5;
  r(22, ky, 3, 5, C.k); r(23, ky + 1, 1, 3, C.G);
  // feet
  r(10, 32, 4, 2, C.k); r(16, 32, 4, 2, C.k);

  // face
  const p1 = (x, y, col = C.t) => r(6 + x, 9 + y, 1, 1, col);
  const b = (x, y, w, h, col = C.t) => r(6 + x, 9 + y, w, h, col);
  if (ifade === 'kapali') return;
  if (ifade === 'yukleniyor' && !talking) {
    for (let i = 0; i < 3; i++) b(5 + i * 3, 4, 2, 2, Math.floor(f / 6) % 3 === i ? C.t : C.T);
    return;
  }
  const kb = Math.floor(t / 3.1);
  const kk = t - kb * 3.1 - hashN(kb, m.seed) * 1.5;
  const blink = kk > 0 && kk < 3 / fps;
  if (blink) { b(3, 3, 3, 1); b(12, 3, 3, 1); }
  else if (ifade === 'mutlu') for (const ox of [3, 12]) { p1(ox + 1, 2); p1(ox, 3); p1(ox + 2, 3); }
  else if (ifade === 'saskin') for (const ox of [2, 12]) { b(ox, 1, 4, 4); b(ox + 1, 2, 2, 2, C.s); }
  else if (ifade === 'bos') { p1(4, 3); p1(13, 3); }
  else if (ifade === 'bebek') for (const ox of [2, 12]) { b(ox, 1, 4, 4); p1(ox + 1, 2, C.h); }
  else if (ifade === 'kalp') for (const ox of [2, 12]) { p1(ox, 2, C.a); p1(ox + 2, 2, C.a); b(ox, 3, 3, 1, C.a); p1(ox + 1, 4, C.a); }
  else { b(3, 2, 2, 3); b(12, 2, 2, ifade === 'soru' ? 2 : 3); }
  if (ifade === 'soru') { b(15, 0, 2, 1, C.y); p1(17, 1, C.y); p1(16, 2, C.y); p1(16, 4, C.y); }
  if (talking) {
    // equalizer mouth follows the voice
    for (let i = 0; i < 5; i++) {
      const h = 1 + Math.min(2, Math.floor(loud * 3 * (0.6 + hashN(Math.floor(f / 2), i + m.seed) * 0.8)));
      b(5 + i * 2, 8 - h, 1, h);
    }
    return;
  }
  if (ifade === 'mutlu' || ifade === 'kalp') { p1(6, 6); b(7, 7, 4, 1); p1(11, 6); }
  else if (ifade === 'saskin') b(8, 6, 2, 2);
  else if (ifade === 'bebek') b(8, 7, 2, 1);
  else if (ifade === 'bos') b(7, 7, 4, 1, C.T);
  else b(7, 7, 4, 1);
}

// ── studio backdrop ─────────────────────────────────────────────────────────
function studio(api, t, st) {
  const { ctx, W, H, S, p } = api;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#231b33');
  g.addColorStop(0.62, '#141019');
  g.addColorStop(1, '#0b090f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow = (x, y, r, col) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, col);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  };
  glow(W * (0.34 + Math.sin(t * 0.3) * 0.03), H * 0.66, Math.max(W, H) * 0.42, 'rgba(255,107,90,0.26)');
  glow(W * (0.8 + Math.cos(t * 0.25) * 0.03), H * 0.5, Math.max(W, H) * 0.3, 'rgba(20,216,192,0.16)');
  // pixel dot grid, fading towards the floor
  const step = 34 * S;
  for (let y = step; y < H * 0.84; y += step) {
    ctx.fillStyle = `rgba(255,255,255,${0.07 * (1 - y / H)})`;
    for (let x = (W % step) / 2; x < W; x += step) ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(2 * S), Math.ceil(2 * S));
  }
  // floor
  const fy = H * (st.portrait ? 0.86 : 0.9);
  const fl = ctx.createLinearGradient(0, fy, 0, H);
  fl.addColorStop(0, 'rgba(0,0,0,0.25)');
  fl.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = fl;
  ctx.fillRect(0, fy, W, H - fy);
  ctx.fillStyle = 'rgba(255,107,90,0.55)';
  ctx.fillRect(0, fy, W, Math.max(1, 2 * S));
  if (p.label) {
    ctx.font = `700 ${Math.round(24 * S)}px "JetBrains Mono"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(String(p.label), W / 2, H * 0.07);
    ctx.textAlign = 'left';
  }
}

// ── speech bubbles ──────────────────────────────────────────────────────────
function bubble(api, st, l, d, t) {
  if (!d) return;
  const { ctx, W, H, p } = api;
  const S = st.S;
  const robot = l.m.kind === 'bit';
  const words = String(l.text).split(/\s+/).filter(Boolean);
  // reveal words as they are said (by character count across the line)
  const total = words.reduce((n, w) => n + w.length + 1, 0);
  const prog = api.clamp((t - l.at) / Math.max(0.3, l.dur * 0.92)) * total;
  let acc = 0;
  const shown = words.map((w) => {
    const on = prog >= acc;
    acc += w.length + 1;
    return on;
  });
  // *highlighted phrase* may span several words
  let on = false;
  const emph = words.map((w) => {
    if (w.startsWith('*')) on = true;
    const h = on;
    if (/\*[.,!?…:;”"’']*$/.test(w) && (w.length > 1 || !w.startsWith('*'))) on = false;
    return h;
  });
  const out = api.clamp((l.end + 0.35 - t) / 0.2);
  const inn = api.clamp((t - l.at + 0.05) / 0.16);
  const a = Math.min(out, inn);
  if (a <= 0) return;

  // speaker off screen (place: hidden): plain subtitles low in the frame, so the scene stays clean
  const off = d.y > H * 0.92;
  const size = (st.portrait ? 50 : 40) * S * (off ? 0.78 : 1);
  const fam = robot ? 'JetBrains Mono' : 'Bricolage Grotesque';
  const weight = robot ? 700 : 800;
  ctx.save();
  ctx.font = `${weight} ${size}px "${fam}"`;
  const maxW = W * (st.portrait ? 0.8 : 0.42);
  const pad = size * 0.55;
  // wrap
  const rows = [[]];
  let rw = 0;
  const space = ctx.measureText(' ').width;
  const clean = (w) => w.replace(/\*/g, '');
  const prefix = robot ? '> ' : '';
  const pw = ctx.measureText(prefix).width;
  words.forEach((w, i) => {
    const ww = ctx.measureText(clean(w)).width;
    if (rows[rows.length - 1].length && rw + space + ww > maxW - pad * 2 - pw) { rows.push([]); rw = 0; }
    rows[rows.length - 1].push(i);
    rw += (rw ? space : 0) + ww;
  });
  const lineH = size * 1.18;
  const bw = Math.min(maxW, Math.max(...rows.map((r) => r.reduce((s, i, k) => s + ctx.measureText(clean(words[i])).width + (k ? space : 0), 0))) + pad * 2 + pw);
  const bh = rows.length * lineH + pad * 1.4;
  // above the speaker's head, kept on screen
  const cx = off ? W / 2 : d.x + d.w / 2;
  let bx = off ? (W - bw) / 2 : Math.max(W * 0.04, Math.min(W * 0.96 - bw, cx - bw * (d.x + d.w / 2 < W / 2 ? 0.3 : 0.7)));
  let by = off ? H * (st.portrait ? 0.86 : 0.9) - bh : d.y - bh - size * 0.7;
  if (by < H * 0.05) by = H * 0.05;
  const pop = 0.85 + 0.15 * ease(inn);
  ctx.globalAlpha = a;
  ctx.translate(cx, by + bh);
  ctx.scale(pop, pop);
  ctx.translate(-cx, -(by + bh));
  ctx.fillStyle = robot ? 'rgba(6,17,19,0.92)' : '#fffaf2';
  ctx.strokeStyle = robot ? C.t : '#14101a';
  ctx.lineWidth = robot ? 3 * S : 4 * S;
  if (!off) {
    ctx.beginPath();
    api.roundRect(ctx, bx, by, bw, bh, robot ? size * 0.25 : size * 0.6);
    ctx.fill();
    ctx.stroke();
  }
  // tail
  if (!off) {
  const tx = Math.max(bx + size, Math.min(bx + bw - size, cx));
  ctx.beginPath();
  ctx.moveTo(tx - size * 0.35, by + bh - ctx.lineWidth / 2);
  ctx.lineTo(tx + (cx < W / 2 ? -1 : 1) * size * 0.1, by + bh + size * 0.55);
  ctx.lineTo(tx + size * 0.35, by + bh - ctx.lineWidth / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(tx - size * 0.33, by + bh - ctx.lineWidth * 1.6, size * 0.66, ctx.lineWidth * 1.2);
  }
  // words
  ctx.textBaseline = 'middle';
  rows.forEach((r, ri) => {
    let x = bx + pad;
    const y = by + pad * 0.7 + lineH * (ri + 0.5);
    if (robot && ri === 0) {
      ctx.fillStyle = C.T;
      ctx.fillText(prefix, x, y);
    }
    if (robot) x += pw;
    for (const i of r) {
      const w = words[i];
      const hl = emph[i];
      const txt = clean(w);
      ctx.fillStyle = robot ? (hl ? C.y : C.t) : hl ? p.accent : off ? '#ffffff' : '#14101a';
      ctx.globalAlpha = a * (shown[i] ? 1 : off ? 0 : 0.16);
      if (off) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = size * 0.2;
        ctx.strokeStyle = 'rgba(10,8,14,0.9)';
        ctx.strokeText(txt, x, y);
      }
      ctx.fillText(txt, x, y);
      x += ctx.measureText(txt).width + space;
    }
  });
  ctx.restore();
}
