// odometer — rolling digit drums count up to your number: fast digits blur,
// slow ones tick, then a pop and a confetti burst. "12500 downloads" -> 12,500.

export default {
  id: 'odometer',
  title: 'Odometer',
  tagline: 'Rolling digit drums count up to your number',
  fonts: [['Unbounded', 900], ['Instrument Serif', 400, 'italic']],
  defaults: {
    text: '12500 downloads',
    duration: 6,
    from: 0,
    prefix: '',
    suffix: '',
    bg: '#101014',
    card: '#1d1d24',
    ink: '#ffffff',
    accent: '#3dff9b',
  },
  options: {
    text: 'A number followed by a label, e.g. "10000 takipçi"',
    from: 'Start value',
    prefix: 'Text before the number, e.g. "$" or "+"',
    suffix: 'Text after the number, e.g. "%" or "K"',
    accent: 'Label bar + confetti colour',
  },

  setup(api) {
    const { ctx, W, p } = api;
    const m = String(p.text).match(/-?[\d.,]+/);
    const to = m ? Number(m[0].replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')) : 100;
    const label = api.upper(String(p.text).replace(m ? m[0] : '', '').trim(), p.lang);
    const from = Number(p.from) || 0;
    const digits = String(Math.floor(Math.max(Math.abs(to), Math.abs(from)))).length;
    const sep = p.lang === 'tr' || /[ğşıçöü]/i.test(p.text) ? '.' : ',';
    // layout slots: digits + group separators
    const slots = [];
    for (let k = digits - 1; k >= 0; k--) {
      slots.push({ kind: 'd', k });
      if (k > 0 && k % 3 === 0) slots.push({ kind: 's' });
    }
    const n = slots.length + (p.prefix ? 1 : 0) + (p.suffix ? 1 : 0);
    const cw = Math.min(W * 0.17, (W * 0.88) / (n - slots.filter((s) => s.kind === 's').length * 0.55));
    ctx.font = api.font(cw * 1.1, 'Unbounded', 900);
    return { to, from, label, slots, sep, cw, burst: Array.from({ length: 70 }, (_, i) => ({ a: api.hash(i, 1) * Math.PI * 2, v: 0.4 + api.hash(i, 2), r: api.hash(i, 3) })) };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, ease, prog, S } = api;
    api.bg(p.bg);
    const D = p.duration;
    const e = ease.outQuart(prog(t, 0.3, D * 0.68));
    const v = api.lerp(s.from, s.to, e);
    const done = prog(t, D * 0.68, D * 0.68 + 0.35);
    const pop = 1 + 0.08 * Math.sin(done * Math.PI);
    const cw = s.cw;
    const ch = cw * 1.45;
    const fs = cw * 1.05;
    const sepW = cw * 0.45;
    const totalW = s.slots.reduce((a, sl) => a + (sl.kind === 's' ? sepW : cw), 0) + (p.prefix ? cw : 0) + (p.suffix ? cw : 0);
    const cy = H * 0.45;
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.scale(pop, pop);
    ctx.translate(-W / 2, -cy);
    let x = W / 2 - totalW / 2;
    ctx.font = api.font(fs, 'Unbounded', 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const plain = (str) => {
      ctx.fillStyle = p.ink;
      ctx.fillText(str, x + cw / 2, cy);
      x += cw;
    };
    if (p.prefix) plain(p.prefix);
    // speed estimate for motion blur
    const v2 = api.lerp(s.from, s.to, ease.outQuart(prog(t + 1 / p.fps, 0.3, D * 0.68)));
    const speed = Math.abs(v2 - v) * p.fps;
    for (const sl of s.slots) {
      if (sl.kind === 's') {
        ctx.fillStyle = api.rgba(p.ink, 0.6);
        ctx.fillText(s.sep, x + sepW / 2, cy + ch * 0.22);
        x += sepW;
        continue;
      }
      const pw = Math.pow(10, sl.k);
      const show = Math.max(Math.abs(v), Math.abs(s.to) * done) >= pw || sl.k === 0;
      // card
      const cg = ctx.createLinearGradient(0, cy - ch / 2, 0, cy + ch / 2);
      cg.addColorStop(0, '#000000');
      cg.addColorStop(0.2, p.card);
      cg.addColorStop(0.8, p.card);
      cg.addColorStop(1, '#000000');
      ctx.fillStyle = cg;
      api.roundRect(ctx, x + 4 * S, cy - ch / 2, cw - 8 * S, ch, 14 * S);
      ctx.fill();
      if (show) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, cy - ch / 2, cw, ch);
        ctx.clip();
        const dv = Math.abs(v) / pw;
        const digit = Math.floor(dv) % 10;
        // only roll during the last part of each step (odometer carry), units roll continuously
        let frac = dv - Math.floor(dv);
        if (sl.k > 0) frac = Math.max(0, (frac - 0.9) / 0.1);
        const colSpeed = speed / pw; // digits per second for this drum
        const blur = Math.min(16 * S, colSpeed * 0.9 * S);
        if (blur > 0.6) ctx.filter = `blur(${blur.toFixed(1)}px)`;
        ctx.fillStyle = p.ink;
        for (let d = -1; d <= 2; d++) {
          ctx.fillText(String((digit + d + 10) % 10), x + cw / 2, cy + (d - frac) * ch);
        }
        ctx.filter = 'none';
        ctx.restore();
      }
      // drum shading + hinge
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + 4 * S, cy - 1.5 * S, cw - 8 * S, 3 * S);
      x += cw;
    }
    if (p.suffix) plain(p.suffix);
    ctx.restore();

    // label + bar
    const lb = ease.outExpo(prog(t, 0.5, 1.4));
    ctx.font = `italic 400 ${Math.round(64 * S)}px "Instrument Serif"`;
    ctx.textAlign = 'center';
    ctx.fillStyle = api.rgba(p.ink, 0.85 * lb);
    ctx.fillText(api.lower(s.label, p.lang), W / 2, cy + ch * 0.85);
    ctx.fillStyle = p.accent;
    const bw = W * 0.5 * e;
    ctx.fillRect(W / 2 - bw / 2, cy + ch * 0.85 + 50 * S, bw, 6 * S);

    // confetti
    if (done > 0) {
      const u = t - D * 0.68;
      for (const c of s.burst) {
        const dist = c.v * W * 0.55 * ease.outCubic(Math.min(1, u / 1.2));
        const x2 = W / 2 + Math.cos(c.a) * dist;
        const y2 = cy + Math.sin(c.a) * dist * 0.7 + u * u * 300 * S;
        ctx.save();
        ctx.translate(x2, y2);
        ctx.rotate(u * 8 * c.r + c.a);
        ctx.globalAlpha = Math.max(0, 1 - u / 2);
        ctx.fillStyle = c.r < 0.33 ? p.accent : c.r < 0.66 ? p.ink : '#ff4d8d';
        ctx.fillRect(-8 * S, -4 * S, 16 * S, 8 * S);
        ctx.restore();
      }
    }
    ctx.textAlign = 'left';
  },
};
