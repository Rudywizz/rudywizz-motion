// chat-story — a text conversation plays out: the other side "types" (three
// bouncing dots), bubbles spring in, the thread scrolls, "Seen" appears under
// your last message. A generic messaging UI — no app branding.
// One message per line; start a line with ">" for your own (right-hand) side.

function breakLines(api, text, maxW) {
  const { ctx } = api;
  const out = [];
  for (const w of api.wrap(ctx, text, maxW)) {
    if (ctx.measureText(w).width <= maxW) {
      out.push(w);
      continue;
    }
    let cur = '';
    for (const g of api.graphemes(w)) {
      if (cur && ctx.measureText(cur + g + '-').width > maxW) {
        out.push(cur + '-');
        cur = g;
      } else cur += g;
    }
    if (cur) out.push(cur);
  }
  return out.length ? out : [' '];
}

const THEMES = {
  light: { bg: '#eef1f6', dot: 'rgba(20,30,60,0.05)', header: '#ffffff', headerLine: 'rgba(0,0,0,0.08)', them: '#ffffff', themInk: '#12141a', meInk: '#ffffff', name: '#12141a', muted: '#7a8194', chip: 'rgba(20,30,60,0.07)', input: '#ffffff', inputInk: '#9aa1b2', shadow: 'rgba(20,30,60,0.10)' },
  dark: { bg: '#0b0d12', dot: 'rgba(255,255,255,0.035)', header: '#13161d', headerLine: 'rgba(255,255,255,0.06)', them: '#1e222b', themInk: '#eef0f5', meInk: '#ffffff', name: '#ffffff', muted: '#8b92a5', chip: 'rgba(255,255,255,0.07)', input: '#181b23', inputInk: '#6b7285', shadow: 'rgba(0,0,0,0.35)' },
};

export default {
  id: 'chat-story',
  title: 'Chat Story',
  tagline: 'A text conversation plays out: typing dots, springy bubbles, auto-scroll',
  fonts: [['Bricolage Grotesque', 400], ['Bricolage Grotesque', 700], ['Bricolage Grotesque', 800]],
  defaults: {
    text: 'are you awake? / >yes why / I just rendered a whole video / with code. no editor. / >wait what / >send it NOW',
    duration: 8,
    name: 'Deniz',
    theme: 'dark',
    accent: '#6c4cf5',
    time: 'Today 23:47',
    seen: 'Seen',
  },
  options: {
    name: 'Contact name in the header',
    theme: 'dark | light',
    accent: 'Your bubble colour',
    time: 'Date chip above the thread ("" to hide)',
    seen: 'Read receipt under your last message ("" to hide)',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    const U = S * (H > W * 1.2 ? 1.45 : 1);
    const T = THEMES[p.theme] || THEMES.dark;
    const colW = Math.min(W * 0.94, H * 0.62);
    const colX = (W - colW) / 2;
    const headerH = 140 * U;
    const inputH = 120 * U;
    const fs = 38 * U;
    const lh = fs * 1.3;
    const padX = 30 * U;
    const padY = 20 * U;
    const maxBW = colW * 0.74;
    ctx.font = api.font(fs, 'Bricolage Grotesque', 400);

    const raw = api.splitLines(p.text);
    const msgs = [];
    let y = headerH + (p.time ? 110 * U : 40 * U);
    let prevMe = null;
    for (const l of raw) {
      const me = l.startsWith('>');
      const txt = l.replace(/^>\s*/, '');
      const lines = breakLines(api, txt, maxBW - padX * 2);
      const w = Math.max(...lines.map((x) => ctx.measureText(x).width)) + padX * 2;
      const h = lines.length * lh + padY * 2 - (lh - fs) * 0.5;
      if (prevMe !== null) y += prevMe === me ? 10 * U : 28 * U;
      const x = me ? colX + colW - 24 * U - w : colX + 24 * U;
      msgs.push({ me, lines, w, h, x, y, chars: txt.length });
      y += h;
      prevMe = me;
    }
    // schedule: the other side types before each of its messages
    let c = 0.45;
    for (const m of msgs) {
      if (!m.me) {
        m.typeAt = c;
        c += 0.75;
      } else c += 0.15;
      m.at = c;
      c += Math.max(0.55, Math.min(1.4, 0.35 + m.chars * 0.028));
    }
    const budget = Math.max(1, p.duration - 0.9);
    const k = Math.min(1, budget / Math.max(0.01, msgs.length ? msgs[msgs.length - 1].at + 0.6 : 1));
    for (const m of msgs) {
      m.at *= k;
      if (m.typeAt != null) m.typeAt *= k;
    }
    const areaBottom = H - inputH - 28 * U;
    const initial = api.graphemes(api.upper(String(p.name || '?'), p.lang))[0] || '?';
    return { T, colW, colX, headerH, inputH, fs, lh, padX, padY, msgs, areaBottom, initial, typeW: 132 * U, typeH: fs + padY * 2 - (lh - fs) * 0.5 };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S, ease, prog } = api;
    const U = S * (H > W * 1.2 ? 1.45 : 1);
    const T = s.T;
    const { colX, colW, headerH } = s;
    api.bg(p.alpha ? null : T.bg);

    if (!p.alpha) {
      if (colW < W - 2) {
        // landscape: darker surround, phone-width column
        ctx.fillStyle = api.mixHex(T.bg, '#000000', 0.35);
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = T.bg;
        ctx.fillRect(colX, 0, colW, H);
      }
      ctx.fillStyle = T.dot;
      const step = 46 * U;
      for (let yy = headerH + step / 2; yy < H; yy += step) {
        for (let xx = colX + step / 2; xx < colX + colW; xx += step) {
          ctx.beginPath();
          ctx.arc(xx, yy, 3 * U, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // which things are visible + typing state
    const vis = s.msgs.filter((m) => t >= m.at);
    const typing = s.msgs.find((m) => m.typeAt != null && t >= m.typeAt && t < m.at);
    // scroll: keep the newest item above the input bar (smooth, a pure function of t)
    let scroll = 0;
    for (const m of s.msgs) {
      const over = m.y + m.h - s.areaBottom;
      if (over <= 0) continue;
      if (m.typeAt != null) scroll = Math.max(scroll, (m.y + s.typeH - s.areaBottom) * ease.inOutCubic(prog(t, m.typeAt, m.typeAt + 0.35)));
      scroll = Math.max(scroll, over * ease.inOutCubic(prog(t, m.at, m.at + 0.35)));
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(colX, headerH, colW, H - headerH - (p.alpha ? 0 : s.inputH));
    ctx.clip();
    ctx.translate(0, -scroll);

    if (p.time && !p.alpha) {
      ctx.font = api.font(24 * U, 'Bricolage Grotesque', 700);
      const tw = ctx.measureText(p.time).width + 36 * U;
      ctx.fillStyle = T.chip;
      api.roundRect(ctx, colX + colW / 2 - tw / 2, headerH + 34 * U, tw, 44 * U, 22 * U);
      ctx.fill();
      ctx.fillStyle = T.muted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.time, colX + colW / 2, headerH + 56 * U);
    }

    const r = 30 * U;
    const small = 7 * U;
    let lastMe = null;
    for (const m of vis) if (m.me) lastMe = m;
    const lastIdx = vis.length - 1;

    for (const m of vis) {
      const a = t - m.at;
      const sp = Math.min(1.08, api.spring(a, { freq: 2.4, damping: 0.55 }));
      const sc = 0.55 + 0.45 * sp;
      const al = Math.min(1, a / 0.12);
      const ox = m.me ? m.x + m.w : m.x;
      const oy = m.y + m.h;
      ctx.save();
      ctx.globalAlpha = al;
      ctx.translate(ox, oy + (1 - Math.min(1, sp)) * 24 * U);
      ctx.scale(sc, sc);
      ctx.translate(-ox, -oy);
      ctx.shadowColor = T.shadow;
      ctx.shadowBlur = 16 * U;
      ctx.shadowOffsetY = 4 * U;
      if (m.me) {
        const g = ctx.createLinearGradient(m.x, m.y, m.x + m.w, m.y + m.h);
        g.addColorStop(0, api.mixHex(p.accent, '#ffffff', 0.12));
        g.addColorStop(1, p.accent);
        ctx.fillStyle = g;
      } else ctx.fillStyle = T.them;
      ctx.beginPath();
      ctx.roundRect(m.x, m.y, m.w, m.h, m.me ? [r, r, small, r] : [r, r, r, small]);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = m.me ? T.meInk : T.themInk;
      ctx.font = api.font(s.fs, 'Bricolage Grotesque', 400);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      m.lines.forEach((l, i) => ctx.fillText(l, m.x + s.padX, m.y + s.padY + s.fs * 0.5 + i * s.lh));
      ctx.restore();
      if (m === lastMe && p.seen && vis.indexOf(m) === lastIdx && !typing) {
        const sa = prog(t, m.at + 0.7, m.at + 1.0);
        if (sa > 0) {
          ctx.globalAlpha = sa;
          ctx.font = api.font(22 * U, 'Bricolage Grotesque', 700);
          ctx.fillStyle = T.muted;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'top';
          ctx.fillText(p.seen, m.x + m.w - 6 * U, m.y + m.h + 10 * U);
          ctx.globalAlpha = 1;
        }
      }
    }

    if (typing) {
      const m = typing;
      const a = Math.min(1, (t - m.typeAt) / 0.2);
      const x = s.colX + 24 * U;
      const y = m.y;
      ctx.globalAlpha = a;
      ctx.fillStyle = T.them;
      ctx.beginPath();
      ctx.roundRect(x, y, s.typeW, s.typeH, [r, r, r, small]);
      ctx.fill();
      for (let j = 0; j < 3; j++) {
        const b = Math.max(0, Math.sin(t * 9 - j * 0.8));
        ctx.fillStyle = api.rgba(T.themInk === '#ffffff' || T.themInk === '#eef0f5' ? '#ffffff' : '#12141a', 0.35 + 0.4 * b);
        ctx.beginPath();
        ctx.arc(x + s.typeW / 2 + (j - 1) * 26 * U, y + s.typeH / 2 - b * 7 * U, 8 * U, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (p.alpha) return;

    // header
    ctx.fillStyle = T.header;
    ctx.fillRect(colX, 0, colW, headerH);
    ctx.fillStyle = T.headerLine;
    ctx.fillRect(colX, headerH - 1.5 * U, colW, 1.5 * U);
    const cy = headerH * 0.55;
    // back chevron
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 5 * U;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(colX + 46 * U, cy - 16 * U);
    ctx.lineTo(colX + 30 * U, cy);
    ctx.lineTo(colX + 46 * U, cy + 16 * U);
    ctx.stroke();
    // avatar
    const ax = colX + 104 * U;
    const ar = 36 * U;
    const ag = ctx.createLinearGradient(ax - ar, cy - ar, ax + ar, cy + ar);
    ag.addColorStop(0, api.mixHex(p.accent, '#ffffff', 0.35));
    ag.addColorStop(1, api.mixHex(p.accent, '#ff5c8a', 0.5));
    ctx.fillStyle = ag;
    ctx.beginPath();
    ctx.arc(ax, cy, ar, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = api.font(34 * U, 'Bricolage Grotesque', 800);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.initial, ax, cy + 1 * U);
    // online dot
    ctx.fillStyle = '#34d27b';
    ctx.strokeStyle = T.header;
    ctx.lineWidth = 4 * U;
    ctx.beginPath();
    ctx.arc(ax + ar * 0.72, cy + ar * 0.72, 9 * U, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // name + status
    const nx = ax + ar + 22 * U;
    const maxNW = colX + colW - nx - 90 * U;
    ctx.textAlign = 'left';
    let nfs = 34 * U;
    ctx.font = api.font(nfs, 'Bricolage Grotesque', 800);
    const nw = ctx.measureText(p.name).width;
    if (nw > maxNW) nfs *= maxNW / nw;
    ctx.font = api.font(nfs, 'Bricolage Grotesque', 800);
    ctx.fillStyle = T.name;
    ctx.fillText(p.name, nx, cy - 16 * U);
    ctx.font = api.font(24 * U, 'Bricolage Grotesque', 400);
    ctx.fillStyle = typing ? p.accent : T.muted;
    ctx.fillText(typing ? 'typing…' : 'online', nx, cy + 20 * U);
    // menu dots
    ctx.fillStyle = T.muted;
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.arc(colX + colW - 44 * U, cy - 14 * U + j * 14 * U, 4 * U, 0, Math.PI * 2);
      ctx.fill();
    }

    // input bar
    const iy = H - s.inputH;
    ctx.fillStyle = T.header;
    ctx.fillRect(colX, iy, colW, s.inputH);
    ctx.fillStyle = T.headerLine;
    ctx.fillRect(colX, iy, colW, 1.5 * U);
    const fieldH = 70 * U;
    const fy = iy + (s.inputH - fieldH) / 2;
    ctx.fillStyle = T.input === T.header ? api.mixHex(T.header, '#888888', 0.12) : T.input;
    api.roundRect(ctx, colX + 26 * U, fy, colW - 130 * U, fieldH, fieldH / 2);
    ctx.fill();
    ctx.fillStyle = T.inputInk;
    ctx.font = api.font(28 * U, 'Bricolage Grotesque', 400);
    ctx.textAlign = 'left';
    ctx.fillText('Message…', colX + 56 * U, fy + fieldH / 2);
    const bx = colX + colW - 62 * U;
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.arc(bx, fy + fieldH / 2, fieldH / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5 * U;
    ctx.beginPath();
    ctx.moveTo(bx, fy + fieldH / 2 + 14 * U);
    ctx.lineTo(bx, fy + fieldH / 2 - 14 * U);
    ctx.moveTo(bx - 12 * U, fy + fieldH / 2 - 2 * U);
    ctx.lineTo(bx, fy + fieldH / 2 - 14 * U);
    ctx.lineTo(bx + 12 * U, fy + fieldH / 2 - 2 * U);
    ctx.stroke();
  },
};
