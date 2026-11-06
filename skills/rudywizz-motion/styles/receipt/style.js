// receipt — a thermal printer feeds a paper slip line by line, your message
// printed in big type between the receipt furniture, then the slip is torn off.

export default {
  id: 'receipt',
  title: 'Receipt',
  tagline: 'Thermal printer feeds out your message, then tears it off',
  fonts: [['Courier Prime', 400], ['Courier Prime', 700]],
  defaults: {
    text: 'Small wins / count too',
    duration: 7,
    header: 'MOTION STORE',
    items: [['IDEA', '1'], ['COFFEE', '2'], ['FOCUS', '∞']],
    total: 'PRICELESS',
    date: '01.01.2026  09:41',
    footer: 'THANK YOU · COME AGAIN',
    table: '#cfc8bc',
    paper: '#fbfaf5',
    ink: '#24211d',
  },
  options: {
    header: 'Store name at the top',
    items: 'Array of [label, value] rows printed above the message',
    total: 'Value on the TOTAL row',
    date: 'Date/time line (fixed string so renders are reproducible)',
    footer: 'Last line before the barcode',
    table: 'Background colour',
  },

  setup(api) {
    const { ctx, W, H, p } = api;
    const S = api.S;
    const pw = W * 0.66;
    const pad = pw * 0.08;
    const inner = pw - pad * 2;
    const up = (x) => api.upper(String(x), p.lang);
    const L = []; // { kind, text, size, bold, h }
    const small = 30 * S;
    const add = (o) => L.push(o);
    add({ kind: 'space', h: small * 1.2 });
    add({ kind: 'text', text: up(p.header), size: small * 1.25, bold: true, align: 'center' });
    add({ kind: 'text', text: p.date, size: small * 0.9, align: 'center' });
    add({ kind: 'rule' });
    for (const it of p.items || []) add({ kind: 'row', left: up(it[0]), right: String(it[1]), size: small });
    add({ kind: 'rule' });
    // the message: big, bold, wrapped
    // hero size: as big as possible while the longest word still fits on one line
    const allWords = api.words(up(p.text).replace(/\n/g, ' '));
    const big = api.fitSize(ctx, allWords, { family: 'Courier Prime', weight: 700, maxW: inner, max: 112 * S });
    const lines = [];
    ctx.font = api.font(big, 'Courier Prime', 700);
    for (const para of api.splitLines(up(p.text))) lines.push(...api.wrap(ctx, para, inner));
    for (const l of lines) add({ kind: 'text', text: l, size: big, bold: true, align: 'center', hero: true });
    add({ kind: 'rule' });
    add({ kind: 'row', left: 'TOTAL', right: up(p.total), size: small * 1.15, bold: true });
    add({ kind: 'space', h: small * 0.6 });
    add({ kind: 'text', text: up(p.footer), size: small * 0.85, align: 'center' });
    add({ kind: 'barcode', h: small * 2.6 });
    add({ kind: 'space', h: small * 1.6 });
    let y = 0;
    for (const l of L) {
      l.h = l.h ?? (l.kind === 'rule' ? small * 1.1 : (l.size || small) * (l.hero ? 1.05 : 1.45));
      l.y = y;
      y += l.h;
    }
    return { L, total: y, pw, pad, inner, grain: api.makeGrain(W, H, p.seed + 9) };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, ease, prog, S, hash } = api;
    api.bg(p.table);
    const D = p.duration;
    const slotY = H * 0.82; // paper rises out of a printer at the bottom
    const px = (W - s.pw) / 2;

    // feed: paper length that has come out of the slot
    const printEnd = D * 0.72;
    const feed = s.total * ease.inOutSine(prog(t, 0.25, printEnd));
    // tear + drop
    const tearT = D * 0.8;
    const tear = ease.inCubic(prog(t, tearT, D));
    const lift = tear * H * 0.22;
    const tilt = tear * 0.05;

    // fit: zoom out when the slip gets longer than the screen
    const zoom = Math.min(1, (slotY - 90 * S) / s.total);
    const z = api.lerp(1, zoom, ease.inOutCubic(prog(t, printEnd * 0.45, printEnd)));
    ctx.translate(W / 2, slotY);
    ctx.scale(z, z);
    ctx.translate(-W / 2, -slotY);

    // paper (shadow first)
    ctx.save();
    ctx.translate(px + s.pw / 2, slotY - lift);
    ctx.rotate(tilt);
    ctx.translate(-(px + s.pw / 2), -slotY);
    if (!p.alpha) {
      ctx.fillStyle = 'rgba(40,30,20,0.18)';
      ctx.fillRect(px + 16 * S, slotY - feed + 12 * S, s.pw, feed);
    }
    ctx.beginPath();
    ctx.rect(px, slotY - feed, s.pw, feed);
    ctx.fillStyle = p.paper;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // torn zig-zag edge at the top once torn
    if (tear > 0) {
      ctx.fillStyle = p.table;
      ctx.beginPath();
      ctx.moveTo(px - 2, slotY + 2);
      for (let x = 0; x <= s.pw; x += 14 * S) ctx.lineTo(px + x, slotY - (hash(x, 3) * 10 + 2) * S);
      ctx.lineTo(px + s.pw + 2, slotY + 2);
      ctx.fill();
    }
    // printed lines: the top of the slip is what came out first
    for (const l of s.L) {
      const y = slotY - feed + l.y;
      if (l.y > feed - l.h * 0.5) continue; // not past the print head yet
      ctx.fillStyle = p.ink;
      ctx.textBaseline = 'middle';
      const cy = y + l.h / 2;
      if (l.kind === 'text') {
        ctx.font = api.font(l.size, 'Courier Prime', l.bold ? 700 : 400);
        ctx.textAlign = l.align || 'left';
        ctx.globalAlpha = 0.86 + hash(l.y, 1) * 0.14;
        ctx.fillText(l.text, l.align === 'center' ? W / 2 : px + s.pad, cy);
      } else if (l.kind === 'row') {
        ctx.font = api.font(l.size, 'Courier Prime', l.bold ? 700 : 400);
        ctx.textAlign = 'left';
        ctx.fillText(l.left, px + s.pad, cy);
        ctx.textAlign = 'right';
        ctx.fillText(l.right, px + s.pw - s.pad, cy);
        // dot leaders
        const lw = ctx.measureText(l.left).width;
        ctx.textAlign = 'left';
        ctx.globalAlpha = 0.6;
        for (let x = px + s.pad + lw + 14 * S; x < px + s.pw - s.pad - ctx.measureText(l.right).width - 14 * S; x += 14 * S) ctx.fillRect(x, cy + l.size * 0.2, 3 * S, 3 * S);
      } else if (l.kind === 'rule') {
        ctx.globalAlpha = 0.8;
        for (let x = px + s.pad; x < px + s.pw - s.pad; x += 18 * S) ctx.fillRect(x, cy, 10 * S, 2.5 * S);
      } else if (l.kind === 'barcode') {
        let x = px + s.pad * 1.6;
        let k = 0;
        while (x < px + s.pw - s.pad * 1.6) {
          const w = (1 + Math.floor(hash(k, 42) * 3)) * 2.4 * S;
          if (k % 2 === 0) ctx.fillRect(x, y + l.h * 0.1, w, l.h * 0.8);
          x += w;
          k++;
        }
      }
      ctx.globalAlpha = 1;
    }
    // thermal fade near the head
    const fade = ctx.createLinearGradient(0, slotY, 0, slotY - 60 * S);
    fade.addColorStop(0, 'rgba(0,0,0,0.14)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(px, slotY - 60 * S, s.pw, 60 * S);
    ctx.restore();
    ctx.restore();

    // printer body (on top of the paper)
    if (!p.alpha) {
      ctx.fillStyle = 'rgba(30,25,20,0.25)';
      api.roundRect(ctx, px - 60 * S, slotY + 30 * S, s.pw + 140 * S, 300 * S, 30 * S);
      ctx.fill();
      ctx.fillStyle = '#34343a';
      api.roundRect(ctx, px - 70 * S, slotY - 4 * S, s.pw + 140 * S, 300 * S, 28 * S);
      ctx.fill();
      ctx.fillStyle = '#26262b';
      api.roundRect(ctx, px - 70 * S, slotY + 110 * S, s.pw + 140 * S, 190 * S, 28 * S);
      ctx.fill();
      ctx.fillStyle = '#0d0d10';
      ctx.fillRect(px - 10 * S, slotY - 4 * S, s.pw + 20 * S, 14 * S);
      // status LED
      const on = t < printEnd ? (Math.floor(t * 6) % 2 ? '#33e07a' : '#1a6b3c') : '#33e07a';
      ctx.fillStyle = on;
      ctx.beginPath();
      ctx.arc(px + s.pw + 30 * S, slotY + 60 * S, 9 * S, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!p.alpha) s.grain(ctx, api.frameOf(t), 0.05);
  },
};
