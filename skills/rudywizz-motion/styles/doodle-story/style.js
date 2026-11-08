// doodle-story — hand-drawn characters on paper. Wobbly ink lines that "boil"
// (redrawn ~10×/s like hand animation), watercolour fills, 34 emotions with
// little extras (tears, hearts, sweat, zzz…) and the same script language as
// story-3d. `sheet: true` lays every emotion out as a model sheet.
import { parseScript, visemeAt, timeBeats, TRANSIENT, attachVoices, voiceOpen } from '../../engine/story.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
function h(...n) {
  let s = 0;
  for (const v of n) s = Math.sin(s * 12.9898 + v * 78.233 + 0.1) * 43758.5453;
  return s - Math.floor(s);
}

// ── emotions ──────────────────────────────────────────────────────────────
// eyes / brows / mouth + extras + body motion
const EMO = {
  neutral: { eyes: 'dot', brows: 'none', mouth: 'small' },
  happy: { eyes: 'happy', brows: 'up', mouth: 'smile', extra: ['blush'] },
  excited: { eyes: 'wide', brows: 'up', mouth: 'grin', extra: ['sparkle'], bounce: 1 },
  laughing: { eyes: 'squeeze', brows: 'up', mouth: 'laugh', extra: ['lines', 'blush'], bounce: 1.4 },
  love: { eyes: 'heart', brows: 'up', mouth: 'smile', extra: ['hearts', 'blush'] },
  sad: { eyes: 'sad', brows: 'worried', mouth: 'frown', droop: 1 },
  crying: { eyes: 'squeeze', brows: 'worried', mouth: 'cry', extra: ['tears'], droop: 1, shake: 0.4 },
  angry: { eyes: 'angry', brows: 'angry', mouth: 'teeth', extra: ['vein'] },
  furious: { eyes: 'angry', brows: 'angry', mouth: 'yell', extra: ['steam', 'vein'], shake: 1.2 },
  surprised: { eyes: 'wide', brows: 'high', mouth: 'o' },
  shocked: { eyes: 'pin', brows: 'high', mouth: 'yell', extra: ['shock'], jolt: 1 },
  scared: { eyes: 'pin', brows: 'worried', mouth: 'wavy', extra: ['sweat'], shake: 0.8 },
  confused: { eyes: 'uneven', brows: 'one', mouth: 'wavy', extra: ['question'] },
  thinking: { eyes: 'up', brows: 'one', mouth: 'side', extra: ['dots'] },
  idea: { eyes: 'wide', brows: 'high', mouth: 'grin', extra: ['bulb'], jolt: 0.6 },
  sleepy: { eyes: 'closed', brows: 'none', mouth: 'small', extra: ['zzz'], droop: 0.6 },
  bored: { eyes: 'half', brows: 'flat', mouth: 'flat', droop: 0.4 },
  smug: { eyes: 'halfside', brows: 'one', mouth: 'smirk' },
  wink: { eyes: 'wink', brows: 'up', mouth: 'grin', extra: ['sparkle'] },
  shy: { eyes: 'happy', brows: 'worried', mouth: 'small', extra: ['blush', 'lines'] },
  embarrassed: { eyes: 'squeeze', brows: 'worried', mouth: 'wavy', extra: ['blushbig', 'sweat'] },
  proud: { eyes: 'closed', brows: 'up', mouth: 'smile', extra: ['sparkle'], chin: 1 },
  determined: { eyes: 'dot', brows: 'angry', mouth: 'flat', extra: ['fire'] },
  nervous: { eyes: 'dot', brows: 'worried', mouth: 'wavy', extra: ['sweat'], shake: 0.3 },
  sick: { eyes: 'half', brows: 'worried', mouth: 'wavy', extra: ['green'], droop: 0.7 },
  dizzy: { eyes: 'spiral', brows: 'none', mouth: 'wavy', extra: ['orbit'], sway: 1 },
  starstruck: { eyes: 'star', brows: 'up', mouth: 'grin', extra: ['sparkle'], bounce: 0.6 },
  cool: { eyes: 'shades', brows: 'none', mouth: 'smirk' },
  mischievous: { eyes: 'halfside', brows: 'angry', mouth: 'grin' },
  disappointed: { eyes: 'half', brows: 'worried', mouth: 'flat', droop: 0.8 },
  relieved: { eyes: 'closed', brows: 'up', mouth: 'smile', extra: ['sweat'] },
  curious: { eyes: 'wide', brows: 'one', mouth: 'o', extra: ['question'] },
  grumpy: { eyes: 'half', brows: 'angry', mouth: 'frown', extra: ['cloud'] },
  silly: { eyes: 'wink', brows: 'up', mouth: 'tongue', bounce: 0.5 },
};
export const EMOTIONS = Object.keys(EMO);

// ── poses ─────────────────────────────────────────────────────────────────
// arm angle from straight down (+ = outward), bend = elbow curve; legs likewise
const BASE = { rA: 0.35, lA: 0.35, rB: 0.2, lB: 0.2, rL: 0.08, lL: 0.08, rK: 0, lK: 0, lift: 0, sq: 1, tilt: 0 };
const POSES = {
  idle: (t) => ({ rA: 0.3 + Math.sin(t * 1.3) * 0.04, lA: 0.3 + Math.sin(t * 1.3 + 1) * 0.04 }),
  talk: (t) => ({ rA: 0.9 + Math.sin(t * 3.1) * 0.25, rB: 0.8, lA: 0.45 + Math.sin(t * 2.3) * 0.1 }),
  wave: (t) => ({ rA: 2.6 + Math.sin(t * 10) * 0.25, rB: 0.5 + Math.sin(t * 10) * 0.3 }),
  point: () => ({ rA: 1.6, rB: 0, tilt: -0.05 }),
  think: () => ({ rA: 0.6, rB: 2.4, lA: 0.5, lB: 1.6 }),
  shrug: () => ({ rA: 1.1, lA: 1.1, rB: -1.2, lB: -1.2, sq: 0.97 }),
  celebrate: (t) => ({ rA: 2.7 + Math.sin(t * 12) * 0.12, lA: 2.7 - Math.sin(t * 12) * 0.12, rB: 0.2, lB: 0.2, lift: Math.abs(Math.sin(t * 6)) * 0.12 }),
  dance: (t) => { const b = Math.sin(t * 7); return { rA: 1.5 + b * 1, lA: 1.5 - b * 1, rB: 0.9, lB: 0.9, tilt: b * 0.12, lift: Math.abs(Math.cos(t * 7)) * 0.05, rL: 0.08 + Math.max(0, b) * 0.35, lL: 0.08 + Math.max(0, -b) * 0.35 }; },
  jump: (t, k) => { const c = smooth(k / 0.2) * (1 - smooth((k - 0.2) / 0.08)); const air = Math.sin(clamp((k - 0.24) / 0.5) * Math.PI); return { lift: air * 0.45, sq: 1 - c * 0.18 + air * 0.08, rA: 0.5 + air * 2, lA: 0.5 + air * 2, rK: c * 0.8, lK: c * 0.8 }; },
  walk: (t) => { const s = Math.sin(t * 9); return { rL: s * 0.45, lL: -s * 0.45, rK: Math.max(0, -s) * 0.6, lK: Math.max(0, s) * 0.6, rA: 0.35 - s * 0.3, lA: 0.35 + s * 0.3, lift: Math.abs(Math.cos(t * 9)) * 0.03 }; },
  sad: () => ({ rA: 0.12, lA: 0.12, rB: 0, lB: 0, sq: 0.95 }),
  hide: () => ({ rA: 0.5, lA: 0.5, rB: 2.6, lB: 2.6, sq: 0.9 }),
};
export const POSE_NAMES = Object.keys(POSES);

// ── bodies ────────────────────────────────────────────────────────────────
// outline points for a body of width w, height hgt (base at 0, up = -y)
function bodyPoints(kind, w, hgt, n = 72) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    let x, y;
    if (kind === 'block') {
      // superellipse → soft box
      const e = 0.28;
      const c = Math.cos(a), s = Math.sin(a);
      x = Math.sign(c) * Math.pow(Math.abs(c), e) * w / 2;
      y = Math.sign(s) * Math.pow(Math.abs(s), e) * hgt / 2;
    } else if (kind === 'ball') {
      x = Math.cos(a) * w / 2;
      y = Math.sin(a) * hgt / 2;
    } else if (kind === 'tall') {
      const c = Math.cos(a), s = Math.sin(a);
      x = Math.sign(c) * Math.pow(Math.abs(c), 0.6) * w / 2;
      y = Math.sign(s) * Math.pow(Math.abs(s), 0.8) * hgt / 2;
    } else {
      // bean: wider at the bottom, a little lean
      const c = Math.cos(a), s = Math.sin(a);
      const bottom = s > 0 ? 1.08 : 0.92;
      x = c * w / 2 * bottom + (s < 0 ? -s * w * 0.04 : 0);
      y = Math.sign(s) * Math.pow(Math.abs(s), 0.85) * hgt / 2;
    }
    pts.push([x, y - hgt / 2]);
  }
  return pts;
}

// ── ink ───────────────────────────────────────────────────────────────────
function wob(pts, amp, seed, frame) {
  return pts.map(([x, y], i) => [
    x + (h(seed, i, frame) - 0.5) * amp + Math.sin(i * 0.7 + seed + frame * 1.7) * amp * 0.35,
    y + (h(seed + 9, i, frame) - 0.5) * amp + Math.cos(i * 0.6 + seed - frame) * amp * 0.35,
  ]);
}
function pathOf(ctx, pts, closed) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - (closed ? 0 : 1); i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  if (!closed) {
    const l = pts[pts.length - 1];
    ctx.lineTo(l[0], l[1]);
  } else ctx.closePath();
}
function inkLine(ctx, pts, { w, ink, seed, frame, amp, closed = false }) {
  const a = wob(pts, amp, seed, frame);
  ctx.strokeStyle = ink;
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.lineWidth = w;
  pathOf(ctx, a, closed);
  ctx.stroke();
  // a thinner second pass, slightly off: reads as a real pen line
  ctx.globalAlpha *= 0.35;
  ctx.lineWidth = w * 0.45;
  pathOf(ctx, wob(pts, amp * 1.3, seed + 3, frame), closed);
  ctx.stroke();
  ctx.globalAlpha /= 0.35;
}
function curve(p0, p1, p2, n = 10) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
  }
  return out;
}
function circlePts(cx, cy, r, n = 18, ry = r) {
  const o = [];
  for (let i = 0; i < n; i++) o.push([cx + Math.cos((i / n) * TAU) * r, cy + Math.sin((i / n) * TAU) * ry]);
  return o;
}
function hexA(hex, a) {
  const n = parseInt(String(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function mix(hex, to, k) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
  const c = (sh) => Math.round(lerp((a >> sh) & 255, (b >> sh) & 255, k));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

// ── character drawing ─────────────────────────────────────────────────────
function drawCharacter(api, ch, st, U, frame) {
  const { ctx } = api;
  const ink = st.ink || api.p.ink || "#2a221d";
  const emo = EMO[st.emotion] || EMO.neutral;
  const p = st.pose;
  const W0 = ch.w * U, H0 = ch.h * U;
  const legL = 0.26 * U * ch.legs;
  const lw = 0.024 * U;
  const amp = 0.006 * U;
  const seed = ch.seed;

  // body motion from emotion
  const t = st.t;
  const shake = (emo.shake || 0) * Math.sin(t * 40) * 0.01 * U;
  const bounce = (emo.bounce || 0) * Math.abs(Math.sin(t * 6)) * 0.04 * U;
  const droop = (emo.droop || 0) * 0.04;
  const sway = (emo.sway || 0) * Math.sin(t * 2.5) * 0.12;
  const talkSq = st.mouth * 0.025;
  const sq = p.sq * (1 - droop) * (1 + talkSq);
  const bh = H0 * sq;
  const bw = W0 / Math.sqrt(sq);

  ctx.save();
  ctx.translate(st.x + shake, st.y - (p.lift * U + bounce));
  ctx.rotate(p.tilt + sway);

  // shadow
  ctx.save();
  ctx.rotate(-(p.tilt + sway));
  ctx.fillStyle = hexA(ink, 0.1 * (1 - clamp(p.lift * 2)));
  ctx.beginPath();
  ctx.ellipse(0, p.lift * U + bounce + 0.01 * U, bw * 0.55, 0.035 * U, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  // legs
  const hipY = -legL;
  const leg = (sx, a, k) => {
    const hip = [sx * bw * 0.2, hipY];
    const foot = [hip[0] + Math.sin(sx * 0 + a) * legL * 0.6 * sx * 0 + Math.sin(a) * legL * 0.5, hipY + Math.cos(a) * legL * (1 - k * 0.35)];
    const knee = [lerp(hip[0], foot[0], 0.5) + k * 0.12 * U, lerp(hip[1], foot[1], 0.5)];
    inkLine(ctx, curve(hip, knee, foot, 6), { w: lw * 1.1, ink, seed: seed + sx, frame, amp });
    inkLine(ctx, [[foot[0] - 0.01 * U, foot[1]], [foot[0] + sx * 0.07 * U, foot[1]]], { w: lw * 1.6, ink, seed: seed + sx + 5, frame, amp: amp * 0.5 });
  };
  leg(-1, -p.rL, p.rK);
  leg(1, p.lL, p.lK);

  // body
  const pts = bodyPoints(ch.body, bw, bh).map(([x, y]) => [x, y + hipY + 0.02 * U]);
  const wpts = wob(pts, amp, seed, frame);
  ctx.save();
  pathOf(ctx, wpts, true);
  ctx.fillStyle = emo.extra?.includes('green') ? mix(ch.color, '#9bd17b', 0.45) : ch.color;
  ctx.fill();
  ctx.clip();
  // watercolour: darker pooled edge + lighter bloom + paper fibres
  const top = hipY - bh;
  const g = ctx.createRadialGradient(-bw * 0.2, top + bh * 0.3, bw * 0.05, 0, top + bh * 0.55, bw * 0.8);
  g.addColorStop(0, 'rgba(255,255,255,0.32)');
  g.addColorStop(0.6, 'rgba(255,255,255,0)');
  g.addColorStop(1, hexA('#000000', 0.12));
  ctx.fillStyle = g;
  ctx.fillRect(-bw, top - 10, bw * 2, bh + 20);
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = hexA(i % 2 ? '#ffffff' : '#000000', 0.022);
    ctx.beginPath();
    ctx.ellipse((h(seed, i, 1) - 0.5) * bw, top + h(seed, i, 2) * bh, bw * (0.3 + h(seed, i, 3) * 0.3), bh * (0.2 + h(seed, i, 4) * 0.25), h(seed, i, 5) * 3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  inkLine(ctx, pts, { w: lw * 1.25, ink, seed, frame, amp, closed: true });

  // arms
  const shY = hipY - bh * 0.42;
  const armL = 0.24 * U;
  const arm = (sx, a, bend) => {
    const sh = [sx * bw * 0.46, shY];
    const hand = [sh[0] + sx * Math.sin(a) * armL, sh[1] + Math.cos(a) * armL];
    const mid = [lerp(sh[0], hand[0], 0.5) + sx * Math.cos(a) * bend * 0.06 * U, lerp(sh[1], hand[1], 0.5) - Math.abs(bend) * 0.06 * U * Math.sign(bend)];
    inkLine(ctx, curve(sh, mid, hand, 8), { w: lw, ink, seed: seed + 20 + sx, frame, amp });
    ctx.fillStyle = ch.color;
    ctx.beginPath();
    ctx.arc(hand[0], hand[1], 0.028 * U, 0, TAU);
    ctx.fill();
    inkLine(ctx, circlePts(hand[0], hand[1], 0.028 * U, 10), { w: lw * 0.8, ink, seed: seed + 30 + sx, frame, amp: amp * 0.6, closed: true });
  };
  arm(-1, p.rA, p.rB);
  arm(1, p.lA, p.lB);

  // face
  const fx = st.lookX * bw * 0.1;
  const fy = top + bh * (ch.body === 'tall' ? 0.3 : 0.4) - (emo.chin ? 0.015 * U : 0);
  const E = Math.min(bw, bh) * 0.145;
  drawFace(ctx, emo, { x: fx, y: fy, E, ink, lw, amp, seed, frame, t, mouth: st.mouth, round: st.round, blink: st.blink, lookX: st.lookX, color: ch.color, bw });
  drawExtras(ctx, emo, { x: fx, y: fy, E, ink, lw, amp, seed, frame, t, bw, top });
  ctx.restore();
}

function drawFace(ctx, emo, f) {
  const { x, y, E, ink, lw, amp, seed, frame } = f;
  const ex = E * 1.25;
  const L = (pts, w = lw, closed = false, s = 0) => inkLine(ctx, pts, { w, ink, seed: seed + 40 + s, frame, amp: amp * 0.5, closed });
  const dotEye = (cx, cy, r, ry = r) => {
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, ry, 0, 0, TAU);
    ctx.fill();
  };
  const blink = f.blink < 0.2;
  for (const sx of [-1, 1]) {
    const cx = x + sx * ex + f.lookX * E * 0.25;
    const cy = y;
    let kind = emo.eyes;
    if (blink && ['dot', 'wide', 'pin', 'uneven', 'up', 'sad', 'angry'].includes(kind)) kind = 'closed';
    if (kind === 'wink') kind = sx < 0 ? 'happy' : 'dot';
    switch (kind) {
      case 'dot': dotEye(cx, cy, E * 0.32, E * 0.42); break;
      case 'wide': L(circlePts(cx, cy, E * 0.6, 14, E * 0.7), lw * 0.8, true, sx); dotEye(cx + f.lookX * E * 0.2, cy + E * 0.05, E * 0.26, E * 0.3); break;
      case 'pin': L(circlePts(cx, cy, E * 0.62, 14, E * 0.72), lw * 0.8, true, sx); dotEye(cx, cy, E * 0.1); break;
      case 'uneven': dotEye(cx, cy, E * (sx < 0 ? 0.25 : 0.42), E * (sx < 0 ? 0.32 : 0.5)); break;
      case 'up': dotEye(cx + E * 0.15, cy - E * 0.25, E * 0.3, E * 0.38); break;
      case 'happy': L(curve([cx - E * 0.45, cy + E * 0.15], [cx, cy - E * 0.55], [cx + E * 0.45, cy + E * 0.15]), lw, false, sx); break;
      case 'squeeze': L([[cx - sx * E * 0.4, cy - E * 0.35], [cx + sx * E * 0.35, cy], [cx - sx * E * 0.4, cy + E * 0.35]], lw, false, sx); break;
      case 'closed': L(curve([cx - E * 0.45, cy], [cx, cy + E * 0.35], [cx + E * 0.45, cy]), lw, false, sx); break;
      case 'half':
        dotEye(cx, cy + E * 0.1, E * 0.3, E * 0.22);
        L([[cx - E * 0.5, cy - E * 0.05], [cx + E * 0.5, cy - E * 0.05]], lw * 0.9, false, sx);
        break;
      case 'halfside':
        dotEye(cx + E * 0.18, cy + E * 0.1, E * 0.26, E * 0.2);
        L([[cx - E * 0.5, cy - E * 0.05], [cx + E * 0.5, cy - E * 0.05]], lw * 0.9, false, sx);
        break;
      case 'sad': dotEye(cx, cy + E * 0.1, E * 0.3, E * 0.36); L(curve([cx - E * 0.5, cy - E * 0.2], [cx, cy - E * 0.45], [cx + E * 0.5, cy - E * 0.05]), lw * 0.7, false, sx); break;
      case 'angry': dotEye(cx, cy + E * 0.08, E * 0.3, E * 0.3); break;
      case 'spiral': {
        const s = [];
        for (let i = 0; i < 26; i++) { const a = i * 0.55 + f.t * 6 * sx; const r = (i / 26) * E * 0.6; s.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
        L(s, lw * 0.7, false, sx);
        break;
      }
      case 'heart': {
        const k = 1 + Math.sin(f.t * 8) * 0.12;
        ctx.fillStyle = '#e8454d';
        heart(ctx, cx, cy, E * 0.65 * k);
        ctx.fill();
        break;
      }
      case 'star': {
        ctx.fillStyle = '#f2b51d';
        star(ctx, cx, cy, E * 0.7 * (1 + Math.sin(f.t * 7) * 0.1), f.t);
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.lineWidth = lw * 0.6;
        ctx.stroke();
        break;
      }
      case 'shades':
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.moveTo(cx - E * 0.7, cy - E * 0.35);
        ctx.lineTo(cx + E * 0.7, cy - E * 0.35);
        ctx.quadraticCurveTo(cx + E * 0.6, cy + E * 0.55, cx, cy + E * 0.5);
        ctx.quadraticCurveTo(cx - E * 0.6, cy + E * 0.55, cx - E * 0.7, cy - E * 0.35);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(cx - E * 0.45, cy - E * 0.2, E * 0.25, E * 0.08);
        if (sx < 0) L([[cx + E * 0.7, cy - E * 0.3], [cx + ex * 2 - E * 0.7, cy - E * 0.3]], lw * 0.9);
        break;
      default: dotEye(cx, cy, E * 0.3);
    }
  }
  // brows
  const by = y - E * 0.95;
  for (const sx of [-1, 1]) {
    const cx = x + sx * ex;
    const k = emo.brows;
    if (k === 'none') continue;
    let a = [cx - E * 0.4, by], b = [cx + E * 0.4, by];
    if (k === 'up') { a[1] -= E * 0.1; b[1] -= E * 0.1; }
    if (k === 'high') { a[1] -= E * 0.4; b[1] -= E * 0.4; }
    if (k === 'angry') { a = [cx - sx * E * 0.45, by - E * 0.25]; b = [cx + sx * E * 0.35, by + E * 0.15]; }
    if (k === 'worried') { a = [cx - sx * E * 0.45, by + E * 0.1]; b = [cx + sx * E * 0.35, by - E * 0.25]; }
    if (k === 'one' && sx > 0) { a[1] -= E * 0.35; b[1] -= E * 0.45; }
    if (k === 'flat') { a[1] += E * 0.1; b[1] += E * 0.1; }
    L([a, b], lw * 0.9, false, 7 + sx);
  }
  // mouth
  const my = y + E * 1.25;
  const mx = x + f.lookX * E * 0.2;
  const M = E * 0.7;
  const talking = f.mouth > 0.12;
  let kind = emo.mouth;
  if (talking && !['yell', 'cry', 'laugh'].includes(kind)) kind = f.round > 0.5 ? 'o' : 'talk';
  const fillMouth = (pts) => {
    const w = wob(pts, amp * 0.4, seed + 60, frame);
    pathOf(ctx, w, true);
    ctx.fillStyle = '#5b2329';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#ef6b74';
    ctx.beginPath();
    const b = w.reduce((m, p) => Math.max(m, p[1]), -1e9);
    ctx.ellipse(mx, b, M * 0.6, M * 0.35, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    L(pts, lw * 0.8, true, 61);
  };
  switch (kind) {
    case 'small': L(curve([mx - M * 0.35, my], [mx, my + M * 0.18], [mx + M * 0.35, my]), lw * 0.85); break;
    case 'smile': L(curve([mx - M * 0.7, my - M * 0.1], [mx, my + M * 0.6], [mx + M * 0.7, my - M * 0.1]), lw * 0.9); break;
    case 'grin': fillMouth([...curve([mx - M * 0.7, my - M * 0.1], [mx, my - M * 0.05], [mx + M * 0.7, my - M * 0.1], 6), ...curve([mx + M * 0.7, my - M * 0.1], [mx, my + M * 1.1], [mx - M * 0.7, my - M * 0.1], 8)]); break;
    case 'laugh': fillMouth(circlePts(mx, my + M * 0.3, M * 0.6, 16, M * (0.55 + Math.abs(Math.sin(f.t * 14)) * 0.25))); break;
    case 'talk': fillMouth(circlePts(mx, my + M * 0.15, M * 0.5, 14, M * (0.12 + f.mouth * 0.5))); break;
    case 'o': fillMouth(circlePts(mx, my + M * 0.2, M * 0.3, 14, M * (0.3 + f.mouth * 0.2))); break;
    case 'yell': fillMouth(circlePts(mx, my + M * 0.35, M * 0.65, 16, M * 0.7)); break;
    case 'cry': fillMouth([...curve([mx - M * 0.6, my + M * 0.5], [mx, my - M * 0.3], [mx + M * 0.6, my + M * 0.5], 8), [mx, my + M * 0.55]]); break;
    case 'frown': L(curve([mx - M * 0.6, my + M * 0.3], [mx, my - M * 0.3], [mx + M * 0.6, my + M * 0.3]), lw * 0.9); break;
    case 'flat': L([[mx - M * 0.45, my + M * 0.1], [mx + M * 0.45, my + M * 0.1]], lw * 0.9); break;
    case 'wavy': { const s = []; for (let i = 0; i <= 12; i++) s.push([mx - M * 0.6 + (i / 12) * M * 1.2, my + M * 0.1 + Math.sin(i * 1.6) * M * 0.12]); L(s, lw * 0.8); break; }
    case 'smirk': L(curve([mx - M * 0.5, my + M * 0.15], [mx + M * 0.1, my + M * 0.3], [mx + M * 0.6, my - M * 0.2]), lw * 0.9); break;
    case 'side': L(curve([mx + M * 0.05, my + M * 0.1], [mx + M * 0.3, my + M * 0.2], [mx + M * 0.55, my]), lw * 0.85); break;
    case 'teeth': {
      const pts = circlePts(mx, my + M * 0.2, M * 0.6, 16, M * 0.28);
      pathOf(ctx, wob(pts, amp * 0.4, seed + 70, frame), true);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      L(pts, lw * 0.8, true, 71);
      L([[mx - M * 0.55, my + M * 0.2], [mx + M * 0.55, my + M * 0.2]], lw * 0.6, false, 72);
      break;
    }
    case 'tongue':
      L(curve([mx - M * 0.6, my], [mx, my + M * 0.5], [mx + M * 0.6, my]), lw * 0.9);
      ctx.fillStyle = '#ef6b74';
      ctx.beginPath();
      ctx.ellipse(mx + M * 0.15, my + M * 0.38, M * 0.22, M * 0.3, 0, 0, Math.PI);
      ctx.fill();
      break;
    default: L([[mx - M * 0.3, my], [mx + M * 0.3, my]]);
  }
}

function heart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.55);
  ctx.bezierCurveTo(x - s * 1.1, y - s * 0.2, x - s * 0.45, y - s * 0.95, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 0.95, x + s * 1.1, y - s * 0.2, x, y + s * 0.55);
}
function star(ctx, x, y, r, t) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU - Math.PI / 2 + t * 0.6;
    const rr = i % 2 ? r * 0.45 : r;
    ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function drawExtras(ctx, emo, f) {
  const { x, y, E, ink, lw, amp, seed, frame, t, bw, top } = f;
  const L = (pts, w = lw * 0.8, closed = false, s = 0) => inkLine(ctx, pts, { w, ink, seed: seed + 90 + s, frame, amp: amp * 0.5, closed });
  for (const ex of emo.extra || []) {
    switch (ex) {
      case 'blush':
      case 'blushbig':
        for (const sx of [-1, 1]) {
          ctx.fillStyle = 'rgba(240,96,110,0.35)';
          ctx.beginPath();
          ctx.ellipse(x + sx * E * 2.2, y + E * 0.75, E * (ex === 'blushbig' ? 0.75 : 0.5), E * 0.3, 0, 0, TAU);
          ctx.fill();
          if (ex === 'blushbig') for (let i = 0; i < 3; i++) L([[x + sx * E * (1.9 + i * 0.25), y + E * 0.6], [x + sx * E * (1.75 + i * 0.25), y + E * 0.95]], lw * 0.5, false, i);
        }
        break;
      case 'tears':
        for (const sx of [-1, 1]) {
          const k = (t * 1.6 + (sx > 0 ? 0.5 : 0)) % 1;
          ctx.fillStyle = 'rgba(90,170,240,0.85)';
          ctx.beginPath();
          ctx.ellipse(x + sx * E * 1.4, y + E * 0.5 + k * E * 3, E * 0.18, E * 0.28, 0, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = 'rgba(90,170,240,0.6)';
          ctx.lineWidth = lw * 0.9;
          ctx.beginPath();
          ctx.moveTo(x + sx * E * 1.4, y + E * 0.4);
          ctx.lineTo(x + sx * E * 1.4, y + E * 0.5 + k * E * 3);
          ctx.stroke();
        }
        break;
      case 'sweat': {
        const k = (t * 0.8) % 1;
        ctx.fillStyle = 'rgba(110,185,245,0.9)';
        ctx.beginPath();
        const sx = x + bw * 0.42, sy = top + E * 0.8 + k * E * 1.2;
        ctx.moveTo(sx, sy - E * 0.5);
        ctx.quadraticCurveTo(sx + E * 0.35, sy, sx, sy + E * 0.2);
        ctx.quadraticCurveTo(sx - E * 0.35, sy, sx, sy - E * 0.5);
        ctx.fill();
        break;
      }
      case 'hearts':
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.6 + i / 3) % 1;
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = '#e8454d';
          heart(ctx, x + (i - 1) * E * 1.8 + Math.sin(t * 3 + i) * E * 0.4, top - k * E * 4, E * 0.4);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        break;
      case 'sparkle':
        for (let i = 0; i < 3; i++) {
          const s = (Math.sin(t * 5 + i * 2) * 0.5 + 0.5) * E * 0.5 + E * 0.15;
          const px = x + [-1, 1, 1.2][i] * bw * 0.55, py = top + [0.1, -0.05, 0.6][i] * E * 3;
          L([[px - s, py], [px + s, py]], lw * 0.6, false, i);
          L([[px, py - s], [px, py + s]], lw * 0.6, false, i + 3);
        }
        break;
      case 'lines':
      case 'shock':
        for (let i = 0; i < (ex === 'shock' ? 7 : 4); i++) {
          const a = -Math.PI / 2 + (i - (ex === 'shock' ? 3 : 1.5)) * 0.35;
          const r0 = bw * 0.6 + (ex === 'shock' ? Math.sin(t * 30) * E * 0.2 : 0);
          L([[x + Math.cos(a) * r0, top + E + Math.sin(a) * r0], [x + Math.cos(a) * (r0 + E * 1.1), top + E + Math.sin(a) * (r0 + E * 1.1)]], lw * 0.7, false, i);
        }
        break;
      case 'vein': {
        const vx = x + bw * 0.28, vy = top + E * 1.0, s = E * 0.45 * (1 + Math.sin(t * 9) * 0.15);
        ctx.strokeStyle = '#d93a3a';
        ctx.lineWidth = lw * 0.9;
        for (const [a, b] of [[[-1, -0.3], [-0.3, -0.3]], [[0.3, -0.3], [1, -0.3]], [[-1, 0.3], [-0.3, 0.3]], [[0.3, 0.3], [1, 0.3]]]) {
          ctx.beginPath();
          ctx.moveTo(vx + a[0] * s, vy + a[1] * s * 2);
          ctx.quadraticCurveTo(vx, vy, vx + b[0] * s, vy + b[1] * s * 2);
          ctx.stroke();
        }
        break;
      }
      case 'steam':
        for (const sx of [-1, 1]) {
          const k = (t * 1.5 + (sx > 0 ? 0.4 : 0)) % 1;
          ctx.globalAlpha = 1 - k;
          L(circlePts(x + sx * bw * 0.45, top - k * E * 3, E * (0.3 + k * 0.5), 12), lw * 0.6, true, sx);
          ctx.globalAlpha = 1;
        }
        break;
      case 'question': {
        ctx.save();
        ctx.fillStyle = ink;
        ctx.font = `700 ${Math.round(E * 2.4)}px "Caveat"`;
        ctx.textAlign = 'center';
        ctx.translate(x + bw * 0.55, top - E * 0.6 + Math.sin(t * 4) * E * 0.2);
        ctx.rotate(0.15);
        ctx.fillText('?', 0, 0);
        ctx.restore();
        break;
      }
      case 'dots':
        for (let i = 0; i < 3; i++) {
          const on = (t * 2.5) % 3 > i;
          if (!on) continue;
          L(circlePts(x + bw * 0.45 + i * E * 0.6, top - E * 0.2 - i * E * 0.6, E * (0.12 + i * 0.08), 8), lw * 0.6, true, i);
        }
        break;
      case 'bulb': {
        const bx = x, by = top - E * 2.2;
        const glow = 0.5 + Math.sin(t * 6) * 0.2;
        ctx.fillStyle = `rgba(255,214,70,${glow})`;
        ctx.beginPath();
        ctx.arc(bx, by, E * 1.4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.arc(bx, by, E * 0.7, 0, TAU);
        ctx.fill();
        L(circlePts(bx, by, E * 0.7, 14), lw * 0.7, true, 1);
        L([[bx - E * 0.3, by + E * 0.85], [bx + E * 0.3, by + E * 0.85]], lw * 0.7, false, 2);
        L([[bx - E * 0.25, by + E * 1.05], [bx + E * 0.25, by + E * 1.05]], lw * 0.7, false, 3);
        break;
      }
      case 'zzz': {
        ctx.save();
        ctx.fillStyle = ink;
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.5 + i / 3) % 1;
          ctx.globalAlpha = 1 - k;
          ctx.font = `700 ${Math.round(E * (1 + i * 0.4))}px "Caveat"`;
          ctx.fillText('z', x + bw * 0.4 + k * E * 2, top - k * E * 3.5);
        }
        ctx.restore();
        break;
      }
      case 'cloud': {
        const cx = x, cy = top - E * 1.8;
        ctx.fillStyle = 'rgba(80,80,90,0.25)';
        for (const [dx, r] of [[-0.7, 0.5], [0, 0.7], [0.7, 0.5]]) {
          ctx.beginPath();
          ctx.arc(cx + dx * E, cy + Math.sin(t * 2 + dx) * E * 0.1, r * E, 0, TAU);
          ctx.fill();
        }
        if (Math.floor(t * 3) % 3 === 0) L([[cx, cy + E * 0.6], [cx - E * 0.3, cy + E * 1.2], [cx + E * 0.1, cy + E * 1.2], [cx - E * 0.2, cy + E * 1.8]], lw * 0.6, false, 5);
        break;
      }
      case 'fire':
        for (let i = 0; i < 3; i++) {
          const fx = x + (i - 1) * E * 0.9, fy = top - E * 0.3;
          const hh = E * (1 + Math.sin(t * 12 + i) * 0.3);
          ctx.fillStyle = i === 1 ? '#ff7a2f' : '#ffb02e';
          ctx.beginPath();
          ctx.moveTo(fx - E * 0.35, fy);
          ctx.quadraticCurveTo(fx - E * 0.3, fy - hh * 0.6, fx, fy - hh);
          ctx.quadraticCurveTo(fx + E * 0.3, fy - hh * 0.6, fx + E * 0.35, fy);
          ctx.fill();
        }
        break;
      case 'orbit':
        for (let i = 0; i < 3; i++) {
          const a = t * 4 + (i / 3) * TAU;
          ctx.fillStyle = '#f2b51d';
          star(ctx, x + Math.cos(a) * bw * 0.45, top - E * 0.3 + Math.sin(a) * E * 0.5, E * 0.35, t);
          ctx.fill();
        }
        break;
    }
  }
}

// ── paper ─────────────────────────────────────────────────────────────────
function paperTexture(api, W, H, paper, ink) {
  const cv = api.offscreen(W, H);
  const c = cv.getContext('2d');
  c.fillStyle = paper;
  c.fillRect(0, 0, W, H);
  // fibres + tooth
  const rnd = api.rng(7);
  for (let i = 0; i < (W * H) / 900; i++) {
    c.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '90,70,50'},${0.03 + rnd() * 0.05})`;
    const x = rnd() * W, y = rnd() * H, l = 2 + rnd() * 10;
    c.fillRect(x, y, l, 1);
  }
  const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(90,60,30,0.16)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  void ink;
  return cv;
}

const DEFAULT_CAST = [
  { name: 'Pip', body: 'bean', color: '#ff8a5b' },
  { name: 'Momo', body: 'block', color: '#7cc6f2' },
];

export default {
  id: 'doodle-story',
  title: 'Doodle Story',
  tagline: 'Hand-drawn characters on paper: boiling ink lines, watercolour fills, 34 emotions, your script',
  fonts: [['Caveat', 600], ['Caveat', 700]],
  defaults: {
    text: 'Pip [wave, happy]: Hi, I\'m Pip! / Momo [surprised]: You can talk?! / Pip [shrug, smug]: I\'m drawn by code. / Momo [think, thinking]: So... I am too? / Pip [point, wink]: Every wobbly line. / Momo [celebrate, starstruck]: That is SO cool! / Momo [jump, laughing]: / Pip [dance, excited]:',
    duration: 14,
    cast: DEFAULT_CAST,
    paper: '#f5eedf',
    ink: '#2a221d',
    boil: 10,
    sheet: false,
    dialogue: 'bubbles',
    voices: [],
    cuts: 'auto',
  },
  options: {
    text: 'Script: `Name [pose, emotion, shot]: words`, one beat per line. `* text` narration, a 0–1 number in the tags walks there',
    cast: 'Characters: [{ name, body (bean|block|ball|tall), color, x (0–1), size }]',
    paper: 'Paper colour',
    ink: 'Ink colour',
    boil: 'Line redraws per second (8–12 = hand-drawn; 0 = still)',
    sheet: 'true = model sheet: every emotion in a grid',
    voices: 'Audio files, one per spoken line in script order (null skips a line). Each line lasts as long as its audio, the mouth follows its loudness, and the render mixes them in',
    dialogue: 'bubbles | none',
    cuts: 'auto | wide',
  },

  setup(api) {
    const { W, H, p, S } = api;
    const portrait = H > W * 1.1;
    const paper = paperTexture(api, W, H, p.paper, p.ink);
    const castIn = Array.isArray(p.cast) && p.cast.length ? p.cast : DEFAULT_CAST;
    const n = castIn.length;
    const chars = castIn.map((c, i) => {
      const size = Number(c.size) || 1;
      const body = c.body || ['bean', 'block', 'ball', 'tall'][i % 4];
      const dims = { bean: [0.62, 0.58], block: [0.6, 0.5], ball: [0.62, 0.6], tall: [0.42, 0.78] }[body] || [0.6, 0.58];
      const u = c.x != null ? Number(c.x) : n === 1 ? 0.5 : 0.3 + (0.4 * i) / (n - 1);
      return { name: c.name || `#${i + 1}`, body, color: c.color || ['#ff8a5b', '#7cc6f2', '#a7d96b', '#c99bf0'][i % 4], w: dims[0] * size, h: dims[1] * size, legs: size, seed: i * 13 + 5, u0: u };
    });
    const beats = parseScript(p.text, chars.map((c) => c.name), { poses: POSE_NAMES, emotions: EMOTIONS });
    for (const b of beats) {
      const len = (b.text || b.narration || '').length;
      b.speak = b.text ? Math.min(6.5, 0.45 + len * 0.055) : 0;
      b.dur = b.dur || (b.narration ? Math.min(5, 1.6 + len * 0.045) : b.text ? b.speak + 0.5 : b.moveTo != null ? 1.6 : 1.4);
    }
    attachVoices(beats, p.voices);
    timeBeats(beats, p.duration, 0.3);
    for (const b of beats) if (b.voice) api.cue(b.voice, b.at);
    const pos = chars.map((c) => c.u0);
    for (const b of beats) {
      if (b.who >= 0 && b.moveTo != null) {
        b.fromU = pos[b.who];
        b.toU = b.moveTo;
        b.walk = Math.min(b.dur, Math.abs(b.toU - b.fromU) * 3 + 0.25);
        pos[b.who] = b.toU;
      }
    }
    let prev = -1;
    beats.forEach((b, i) => {
      if (p.cuts === 'wide') b.cam = 'wide';
      else if (b.shot) b.cam = b.shot;
      else if (i === 0 || b.narration || b.who < 0 || b.moveTo != null || ['dance', 'jump', 'celebrate'].includes(b.pose)) b.cam = 'wide';
      else if (['surprised', 'shocked', 'furious', 'love', 'starstruck', 'crying'].includes(b.emotion)) b.cam = 'close';
      else b.cam = b.who !== prev && i % 3 === 0 ? 'wide' : 'medium';
      if (b.who >= 0) prev = b.who;
    });
    return { paper, chars, beats, portrait, U: Math.min(W, H) * (portrait ? 0.72 : 0.5) };
  },

  frame(api, t, s) {
    const { ctx, W, H, p } = api;
    const frame = p.boil > 0 ? Math.floor(t * p.boil) : 0;
    const tq = p.boil > 0 ? Math.floor(t * Math.max(p.boil, 12)) / Math.max(p.boil, 12) : t; // hand animation timing
    api.bg(p.alpha ? null : p.paper);
    if (!p.alpha) ctx.drawImage(s.paper, 0, 0);

    if (p.sheet) return drawSheet(api, s, tq, frame);

    const { chars, beats, U } = s;
    const cur = beatAt(beats, t);
    const groundY = H * (s.portrait ? 0.7 : 0.78);
    const span = W * (s.portrait ? 0.95 : 0.75);
    const xOfU = (u) => W / 2 + (u - 0.5) * span;

    // states
    const states = chars.map((c, ci) => {
      let u = c.u0;
      let walking = null;
      for (const b of beats) {
        if (b.who !== ci || b.toU == null) continue;
        if (t >= b.at + b.walk) u = b.toU;
        else if (t >= b.at) { const kk = smooth((t - b.at) / b.walk); u = lerp(b.fromU, b.toU, kk); walking = b; }
      }
      let mine = null, prevB = null, emotion = 'neutral';
      for (const b of beats) {
        if (b.at > t) break;
        if (b.who === ci) { prevB = mine; mine = b; emotion = b.emotion && !TRANSIENT.has(b.emotion) ? b.emotion : b.emotion ? 'neutral' : emotion; }
      }
      const active = mine && t < mine.at + mine.dur ? mine : null;
      const local = active ? t - active.at : 0;
      const pn = walking ? 'walk' : active ? active.pose || (active.text ? 'talk' : 'idle') : 'idle';
      const kk = active ? local / Math.max(0.01, active.dur) : 0;
      let pose = { ...BASE, ...POSES[pn](tq + c.seed, kk) };
      const since = mine ? t - mine.at : 99;
      if (since < 0.25) {
        const from = { ...BASE, ...POSES[(prevB && prevB.pose) || 'idle'](tq + c.seed, 1) };
        const w = smooth(since / 0.25);
        for (const key of Object.keys(pose)) pose[key] = lerp(from[key], pose[key], w);
        pose.sq *= 1 - Math.sin(w * Math.PI) * 0.06; // little squash on every new beat
      }
      let mouth = 0, round = 0;
      if (active && active.text && local < active.speak) {
        const v = visemeAt(active.text, local / active.speak);
        mouth = active.voice ? voiceOpen(active.voice, local, p.fps) : v.open;
        round = v.round * (active.voice ? Math.min(1, mouth * 1.5) : 1);
      }
      const speaker = cur && cur.who >= 0 && cur.who !== ci ? cur.who : -1;
      const bl = (tq + c.seed * 0.7) % 3.1;
      return { c, x: xOfU(u), u, pose, emotion: active?.emotion || emotion, mouth, round, t: tq, blink: bl < 0.12 ? 0 : 1, lookX: speaker >= 0 ? Math.sign(chars[speaker].u0 - c.u0) * 0.8 : walking ? Math.sign(walking.toU - walking.fromU) : 0, y: groundY };
    });

    // camera (2D): zoom on the speaker
    const cam = cur ? cur.cam : 'wide';
    let zoom = 1, cx = W / 2, cy = groundY - U * 0.35;
    const who = cur && cur.who >= 0 ? states[cur.who] : null;
    if (who && cam === 'medium') { zoom = 1.45; cx = who.x; cy = groundY - U * 0.45; }
    if (who && cam === 'close') { zoom = 2.1; cx = who.x; cy = groundY - U * 0.62; }
    const local = cur ? t - cur.at : 0;
    zoom *= 1 + Math.min(1, local / 5) * 0.03;
    ctx.save();
    ctx.translate(W / 2, H * (s.portrait ? 0.56 : 0.5));
    ctx.scale(zoom, zoom);
    ctx.translate(-cx, -cy);

    // ground line
    inkLine(ctx, [[-W, groundY], [W * 0.3, groundY + 2], [W * 0.7, groundY - 2], [W * 2, groundY]], { w: 0.012 * U, ink: p.ink, seed: 3, frame, amp: 0.004 * U });
    for (const st of states) drawCharacter(api, st.c, st, U, frame);
    ctx.restore();

    if (!cur) return;
    const fade = smooth(local / 0.15) * (1 - smooth((local - cur.dur + 0.12) / 0.12));
    if (cur.narration) drawCard(api, s, cur.narration, fade, frame);
    else if (cur.text && p.dialogue !== 'none' && who) {
      const shown = Math.min(1, local / Math.max(0.01, cur.speak));
      // bubble above the speaker, in screen space
      const top = groundY - (who.c.h + 0.26 * who.c.legs) * U * 1.05;
      const sx = W / 2 + (who.x - cx) * zoom;
      const sy = H * (s.portrait ? 0.56 : 0.5) + (top - cy) * zoom;
      drawBubble(api, s, cur.text, shown, fade, sx, sy, frame);
    }
  },
};

function beatAt(beats, t) {
  let cur = null;
  for (const b of beats) if (b.at <= t) cur = b;
  return cur || beats[0] || null;
}

function drawBubble(api, s, text, shown, a, hx, hy, frame) {
  const { ctx, W, H, p } = api;
  if (a <= 0) return;
  const fs = Math.min(W, H) * (s.portrait ? 0.068 : 0.052);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `700 ${Math.round(fs)}px "Caveat"`;
  const maxW = W * (s.portrait ? 0.7 : 0.42);
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const tr = cur ? cur + ' ' + w : w;
    if (ctx.measureText(tr).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tr;
  }
  if (cur) lines.push(cur);
  const lh = fs * 1.05;
  const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + fs * 1.3;
  const bh = lines.length * lh + fs * 0.8;
  const bx = clamp(hx - bw / 2, W * 0.04, W * 0.96 - bw);
  const by = clamp(hy - bh - fs * 0.8, H * 0.04, H);
  const pts = [];
  const n = 40;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU;
    const c = Math.cos(ang), sn = Math.sin(ang);
    pts.push([bx + bw / 2 + Math.sign(c) * Math.pow(Math.abs(c), 0.4) * bw / 2, by + bh / 2 + Math.sign(sn) * Math.pow(Math.abs(sn), 0.4) * bh / 2]);
  }
  const tail = [[clamp(hx, bx + fs, bx + bw - fs) - fs * 0.35, by + bh - 2], [clamp(hx, bx + fs, bx + bw - fs) + fs * 0.1, by + bh + fs * 0.75], [clamp(hx, bx + fs, bx + bw - fs) + fs * 0.4, by + bh - 2]];
  ctx.fillStyle = '#fffdf7';
  pathOf(ctx, wob(pts, 2, 11, frame), true);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(...tail[0]);
  ctx.lineTo(...tail[1]);
  ctx.lineTo(...tail[2]);
  ctx.fill();
  const lw = Math.max(2, fs * 0.07);
  inkLine(ctx, pts, { w: lw, ink: p.ink, seed: 11, frame, amp: 2.5, closed: true });
  ctx.fillStyle = '#fffdf7';
  ctx.fillRect(tail[0][0] + lw, by + bh - lw * 2, tail[2][0] - tail[0][0] - lw * 2, lw * 3);
  inkLine(ctx, [tail[0], tail[1], tail[2]], { w: lw, ink: p.ink, seed: 12, frame, amp: 2 });
  const total = lines.reduce((m, l) => m + l.split(/\s+/).length, 0);
  const vis = Math.ceil(total * shown);
  let wi = 0;
  ctx.textBaseline = 'middle';
  lines.forEach((l, li) => {
    let x = bx + bw / 2 - ctx.measureText(l).width / 2;
    const y = by + fs * 0.4 + lh * (li + 0.5);
    for (const w of l.split(/\s+/)) {
      ctx.fillStyle = wi < vis ? p.ink : hexA(p.ink, 0.15);
      ctx.fillText(w, x, y);
      x += ctx.measureText(w + ' ').width;
      wi++;
    }
  });
  ctx.restore();
}

function drawCard(api, s, text, a, frame) {
  const { ctx, W, H, p } = api;
  if (a <= 0) return;
  const fs = Math.min(W, H) * (s.portrait ? 0.08 : 0.06);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = hexA(p.paper.length === 7 ? p.paper : '#f5eedf', 0.85);
  ctx.fillRect(0, 0, W, H);
  ctx.font = `700 ${Math.round(fs)}px "Caveat"`;
  ctx.fillStyle = p.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, H / 2);
  const tw = Math.min(W * 0.8, ctx.measureText(text).width);
  inkLine(ctx, [[W / 2 - tw / 2, H / 2 + fs * 0.6], [W / 2 + tw / 2, H / 2 + fs * 0.65]], { w: fs * 0.06, ink: p.ink, seed: 5, frame, amp: 3 });
  ctx.restore();
}

function drawSheet(api, s, tq, frame) {
  const { ctx, W, H, p } = api;
  const names = EMOTIONS;
  const cols = s.portrait ? 5 : 9;
  const rows = Math.ceil(names.length / cols);
  const cw = W / cols;
  const chH = (H * 0.86) / rows;
  const U = Math.min(cw * 0.95, chH * 1.05);
  const c0 = s.chars[0];
  ctx.font = `700 ${Math.round(U * 0.13)}px "Caveat"`;
  ctx.textAlign = 'center';
  names.forEach((name, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = cw * (col + 0.5);
    const y = H * 0.04 + chH * (row + 0.8);
    const ch = { ...c0, w: c0.w * 0.95, h: c0.h * 0.95, seed: c0.seed + i };
    drawCharacter(api, ch, { x, y, pose: { ...BASE }, emotion: name, mouth: 0, round: 0, t: tq + i * 0.37, blink: 1, lookX: 0 }, U * 0.86, frame);
    ctx.fillStyle = p.ink;
    ctx.fillText(name, x, y + U * 0.14);
  });
}
