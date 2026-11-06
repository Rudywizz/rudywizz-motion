// pixel-quest — an 8-bit title screen: parallax pixel world, a tiny hero runs
// in place, the title drops in letter by letter with coins popping out.
// Everything is drawn at low resolution and upscaled with hard pixels.

const PAL = { night: '#1d2b53', plum: '#7e2553', rose: '#ff77a8', peach: '#ffccaa', sun: '#ffec27', grass: '#00e436', dirt: '#ab5236', dark: '#000000', white: '#fff1e8', blue: '#29adff' };

// 8x8 hero (original): . empty, k dark, w white, b blue, s skin
const HERO = [
  ['..kkkk..', '.kbbbbk.', 'kbwbbwbk', 'kbkbbkbk', 'kbbbbbbk', '.kbbbbk.', '.kk..kk.', 'kk....kk'],
  ['..kkkk..', '.kbbbbk.', 'kbwbbwbk', 'kbkbbkbk', 'kbbbbbbk', '.kbbbbk.', '..kkkk..', '..k..k..'],
];

export default {
  id: 'pixel-quest',
  title: 'Pixel Quest',
  tagline: '8-bit title screen: the words drop in like a level name',
  fonts: [['Press Start 2P', 400]],
  defaults: {
    text: 'Level up',
    duration: 6,
    pixel: 6,
    subtitle: 'PRESS START',
  },
  options: {
    pixel: 'Size of one game pixel in output px (4–10)',
    subtitle: 'Blinking line under the title ("" to hide)',
  },

  setup(api) {
    const { W, H, p } = api;
    const px = Math.max(3, Math.min(12, p.pixel | 0)) * api.S;
    const lw = Math.round(W / px);
    const lh = Math.round(H / px);
    const low = api.offscreen(lw, lh);
    const g = low.getContext('2d');
    const lines = api.breakLongWords(g, api.splitLines(api.upper(p.text, p.lang)), { family: 'Press Start 2P', maxW: lw - 12, minSize: 8 }).slice(0, 4);
    const fit = (fs) => lines.every((l) => (g.font = api.font(fs, 'Press Start 2P'), g.measureText(l).width <= lw - 12));
    const fs = [24, 16, 8].find(fit) || 8;
    return { low, lw, lh, lines, fs, px };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, hash } = api;
    const { lw, lh, fs } = s;
    const g = s.low.getContext('2d');
    g.imageSmoothingEnabled = false;
    const f = Math.floor(t * 12); // game logic at 12 fps
    const tt = f / 12;
    // sky bands
    const bands = [PAL.night, PAL.plum, PAL.rose, PAL.peach];
    bands.forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(0, Math.floor((lh * 0.76 * i) / bands.length), lw, Math.ceil((lh * 0.76) / bands.length) + 1);
    });
    if (p.alpha) g.clearRect(0, 0, lw, lh);
    // stars
    for (let i = 0; i < 30; i++) {
      if ((f + i) % 9 < 2) continue;
      g.fillStyle = PAL.white;
      g.fillRect(Math.floor(hash(i, 1) * lw), Math.floor(hash(i, 2) * lh * 0.3), 1, 1);
    }
    // sun
    g.fillStyle = PAL.sun;
    const sx = Math.floor(lw * 0.72);
    const sy = Math.floor(lh * 0.5);
    for (let y = -10; y <= 10; y++) {
      const half = Math.floor(Math.sqrt(100 - y * y));
      if (y > 2 && y % 3 === 0) continue;
      g.fillRect(sx - half, sy + y, half * 2, 1);
    }
    // mountains (parallax)
    const mount = (base, amp, step, speed, color, seed) => {
      g.fillStyle = color;
      const off = Math.floor(tt * speed);
      for (let x = 0; x < lw; x++) {
        const wx = x + off;
        const h = Math.floor(amp * (0.5 + 0.5 * Math.sin(wx / step + seed)) * (0.6 + 0.4 * hash(Math.floor(wx / 7), seed)));
        g.fillRect(x, base - h, 1, h + 1);
      }
    };
    mount(Math.floor(lh * 0.72) + 1, lh * 0.2, 9, 2, PAL.plum, 1);
    mount(Math.floor(lh * 0.72) + 1, lh * 0.08, 5, 5, '#5f574f', 2);
    // ground
    const gy = Math.floor(lh * 0.72);
    g.fillStyle = PAL.dirt;
    g.fillRect(0, gy, lw, lh - gy);
    g.fillStyle = PAL.grass;
    g.fillRect(0, gy, lw, 3);
    const off = Math.floor(tt * 14) % 8;
    g.fillStyle = '#7a3a22';
    for (let x = -off; x < lw; x += 8) for (let y = gy + 6; y < lh; y += 8) g.fillRect(x + ((y / 8) % 2) * 4, y, 4, 2);
    // hero running in place
    const frame = HERO[f % 2];
    const hs = 2; // hero pixel scale
    const hx = Math.floor(lw * 0.2);
    const hy = gy - 8 * hs - (f % 2) * hs;
    const C = { k: PAL.dark, w: PAL.white, b: PAL.blue };
    frame.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = C[ch];
      g.fillRect(hx + x * hs, hy + y * hs, hs, hs);
    }));

    // title letters drop in
    g.font = api.font(fs, 'Press Start 2P');
    g.textBaseline = 'top';
    const lineH = fs + Math.max(3, fs / 3);
    const top = Math.floor(lh * 0.25 - (s.lines.length * lineH) / 2);
    let idx = 0;
    const coins = [];
    s.lines.forEach((line, li) => {
      const chars = api.graphemes(line);
      const width = g.measureText(line).width;
      let x = Math.floor(lw / 2 - width / 2);
      for (const ch of chars) {
        const w = g.measureText(ch).width;
        const t0 = 0.3 + idx * 0.12;
        const u = tt - t0;
        if (u >= 0 && ch.trim()) {
          // integer bounce: fall, overshoot, settle
          const fall = Math.min(1, u / 0.25);
          let y = top + li * lineH - Math.floor((1 - fall) * lh * 0.4);
          if (u > 0.25 && u < 0.42) y -= Math.floor(Math.sin(((u - 0.25) / 0.17) * Math.PI) * 4);
          for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) {
            g.fillStyle = PAL.dark;
            g.fillText(ch, x + dx, y + dy);
          }
          g.fillStyle = li % 2 ? PAL.white : PAL.sun;
          g.fillText(ch, x, y);
          if (u > 0.25 && u < 0.9) coins.push([x + w / 2, top + li * lineH - (u - 0.25) * 40, u]);
        }
        x += w;
        idx++;
      }
    });
    for (const [cx, cy, u] of coins) {
      g.fillStyle = Math.floor(u * 12) % 2 ? PAL.sun : '#ffa300';
      g.fillRect(Math.floor(cx) - 1, Math.floor(cy) - 2, Math.floor(u * 12) % 2 ? 3 : 1, 4);
    }
    // HUD
    g.font = api.font(8, 'Press Start 2P');
    g.fillStyle = PAL.white;
    g.fillText('SCORE ' + String(Math.min(999999, idx * 0 + Math.floor(tt * 1234))).padStart(6, '0'), 4, 4);
    g.textAlign = 'right';
    g.fillText('x3', lw - 4, 4);
    g.fillStyle = '#ff004d';
    g.fillRect(lw - 30, 4, 6, 6);
    g.textAlign = 'left';
    if (p.subtitle && f % 12 < 8 && tt > 1) {
      const sub = api.upper(p.subtitle, p.lang);
      g.fillStyle = PAL.white;
      g.fillText(sub, Math.floor(lw / 2 - g.measureText(sub).width / 2), Math.floor(lh * 0.86));
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(s.low, 0, 0, lw, lh, 0, 0, lw * s.px, lh * s.px);
  },
};
