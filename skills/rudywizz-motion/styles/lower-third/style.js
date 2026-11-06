// lower-third — broadcast name/title strap. An accent bar drops in, the name
// panel wipes open, the role strip follows, a gloss sweeps across, and at the
// end everything wipes back out. Built to be rendered with --alpha and laid
// over footage (or used as an `overlay` on a clip scene).

function fitText(api, lines, { family, weight = 400, maxW, maxH = Infinity, lh = 1.1, max = 400, min = 12 }) {
  // largest size where the text fits; words wrap and over-long words hyphenate
  const { ctx } = api;
  const size = api.fitSize(ctx, lines, { family, weight, maxW, maxH, lineHeight: lh, max, min: 1 });
  if (size >= min) return { lines, size };
  const layout = (sz) => {
    ctx.font = api.font(sz, family, weight);
    const out = [];
    for (const l of lines) {
      for (const w of api.wrap(ctx, l, maxW)) {
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
    }
    return out;
  };
  for (let sz = max; sz > min; sz *= 0.93) {
    const out = layout(Math.floor(sz));
    if (out.length * Math.floor(sz) * lh <= maxH) return { lines: out, size: Math.floor(sz) };
  }
  return { lines: layout(min), size: min };
}

export default {
  id: 'lower-third',
  title: 'Lower Third',
  tagline: 'Broadcast name strap: accent bar, wipe-in panels, gloss, wipe-out',
  fonts: [['Bricolage Grotesque', 800], ['Space Grotesk', 700]],
  defaults: {
    text: 'Deniz Kaya / Motion designer · Istanbul',
    duration: 6,
    accent: '#ff3b5c',
    theme: 'solid',
    position: 'left',
    ink: '#ffffff',
    panel: '#0f1117',
  },
  options: {
    accent: 'Accent bar and role strip colour',
    theme: 'solid | glass | minimal',
    position: 'left | center',
    ink: 'Name text colour',
    panel: 'Name panel colour (solid theme)',
  },

  setup(api) {
    const { ctx, W, H, p, S } = api;
    const lines = api.splitLines(p.text);
    const name = lines[0] || '';
    const role = api.upper(lines.slice(1).join(' · '), p.lang);
    const portrait = H > W;
    const center = p.position === 'center';
    const marginX = W * (portrait ? 0.07 : 0.06);
    const bottom = H * (portrait ? 0.83 : 0.88);
    const pad = 30 * S;
    const barW = center ? 0 : 12 * S;
    const maxW = W - marginX * 2 - barW - pad * 2;

    const nf = fitText(api, [name], { family: 'Bricolage Grotesque', weight: 800, maxW, maxH: 260 * S, lh: 1.08, max: (H > W ? 84 : 72) * S, min: 30 * S });
    ctx.font = api.font(nf.size, 'Bricolage Grotesque', 800);
    const nameW = Math.max(...nf.lines.map((l) => ctx.measureText(l).width));
    const nameLH = nf.size * 1.08;
    const nameH = nf.lines.length * nameLH + pad * 1.15;

    let rf = { lines: [], size: 0 };
    let roleW = 0;
    let roleH = 0;
    const spacing = 0.12;
    if (role) {
      rf = fitText(api, [role], { family: 'Space Grotesk', weight: 700, maxW: maxW * 0.86, maxH: 160 * S, lh: 1.3, max: Math.min(34 * S, nf.size * 0.46), min: 18 * S });
      ctx.font = api.font(rf.size, 'Space Grotesk', 700);
      ctx.letterSpacing = `${(rf.size * spacing).toFixed(2)}px`;
      roleW = Math.max(...rf.lines.map((l) => ctx.measureText(l).width));
      ctx.letterSpacing = '0px';
      roleH = rf.lines.length * rf.size * 1.3 + pad * 0.8;
    }
    const panelW = nameW + pad * 2;
    const stripW = Math.min(roleW + pad * 1.4, W - marginX * 2 - barW);
    const totalH = nameH + (role ? roleH : 0);
    const top = bottom - totalH;
    const x0 = center ? W / 2 - Math.max(panelW, stripW) / 2 : marginX;
    return { name: nf, role: rf, nameW, nameH, nameLH, roleH, panelW, stripW, top, x0, barW, pad, center, spacing, hasRole: !!role };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, S, ease, prog } = api;
    const D = p.duration;
    api.bg(null);

    // a soft moving "footage" backdrop when not rendering transparent
    if (!p.alpha && !p.overlay) {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#1d2a3a');
      g.addColorStop(1, '#3a2a2f');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const blobs = [['#5b8cff', 0.2, 0.3], ['#ff7a59', 0.75, 0.45], ['#38d6b0', 0.4, 0.75]];
      blobs.forEach(([c, bx, by], i) => {
        const x = W * (bx + 0.05 * Math.sin(t * 0.4 + i * 2));
        const y = H * (by + 0.04 * Math.cos(t * 0.33 + i));
        const r = Math.max(W, H) * 0.45;
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, api.rgba(c, 0.45));
        rg.addColorStop(1, api.rgba(c, 0));
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);
      });
      const sh = ctx.createLinearGradient(0, H * 0.55, 0, H);
      sh.addColorStop(0, 'rgba(0,0,0,0)');
      sh.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = sh;
      ctx.fillRect(0, 0, W, H);
    }

    const inBar = ease.outExpo(prog(t, 0.1, 0.5));
    const inPanel = ease.outExpo(prog(t, 0.22, 0.85));
    const inName = ease.outExpo(prog(t, 0.36, 1.0));
    const inRole = ease.outExpo(prog(t, 0.52, 1.1));
    const outRole = ease.inCubic(prog(t, D - 0.75, D - 0.45));
    const outPanel = ease.inCubic(prog(t, D - 0.6, D - 0.25));
    const outBar = ease.inCubic(prog(t, D - 0.38, D - 0.08));
    const panelK = inPanel * (1 - outPanel);
    const stripK = inRole * (1 - outRole);
    const barK = inBar * (1 - outBar);

    const { pad, top, x0, barW, center, nameH } = s;
    const theme = p.theme;
    const px = x0 + barW;

    // accent bar (left) or top rule (center)
    ctx.fillStyle = p.accent;
    if (!center) {
      const fullH = nameH + (s.hasRole ? s.roleH : 0);
      const bh = fullH * barK;
      ctx.fillRect(x0, top + (fullH - bh) / 2, barW, bh);
    }

    // name panel
    const pw = s.panelW * panelK;
    const pxL = center ? W / 2 - pw / 2 : px;
    if (pw > 1) {
      ctx.save();
      if (theme === 'glass') {
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = 30 * S;
        const gg = ctx.createLinearGradient(0, top, 0, top + nameH);
        gg.addColorStop(0, 'rgba(255,255,255,0.26)');
        gg.addColorStop(1, 'rgba(255,255,255,0.10)');
        ctx.fillStyle = gg;
        ctx.fillRect(pxL, top, pw, nameH);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.38)';
        ctx.lineWidth = 1.5 * S;
        ctx.strokeRect(pxL + 0.75 * S, top + 0.75 * S, pw - 1.5 * S, nameH - 1.5 * S);
      } else if (theme !== 'minimal') {
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 36 * S;
        ctx.shadowOffsetY = 10 * S;
        const gg = ctx.createLinearGradient(0, top, 0, top + nameH);
        gg.addColorStop(0, api.mixHex(p.panel, '#ffffff', 0.08));
        gg.addColorStop(1, p.panel);
        ctx.fillStyle = gg;
        ctx.fillRect(pxL, top, pw, nameH);
      }
      ctx.restore();
      if (center) {
        ctx.fillStyle = p.accent;
        ctx.fillRect(pxL, top - 8 * S, pw, 8 * S * barK);
      }
      // name text, clipped to the panel
      ctx.save();
      ctx.beginPath();
      ctx.rect(pxL, top - 4 * S, pw, nameH + 8 * S);
      ctx.clip();
      ctx.font = api.font(s.name.size, 'Bricolage Grotesque', 800);
      ctx.textBaseline = 'middle';
      ctx.textAlign = center ? 'center' : 'left';
      if (theme === 'minimal') {
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 18 * S;
      }
      ctx.fillStyle = p.ink;
      const slide = (1 - inName) * -60 * S + outPanel * -40 * S;
      s.name.lines.forEach((l, i) => {
        const y = top + pad * 0.58 + (i + 0.5) * s.nameLH;
        ctx.fillText(l, (center ? W / 2 : px + pad) + slide, y);
      });
      ctx.restore();
      // gloss sweep
      const gl = prog(t, 1.15, 1.85);
      if (gl > 0 && gl < 1 && theme !== 'minimal') {
        ctx.save();
        ctx.beginPath();
        ctx.rect(pxL, top, pw, nameH);
        ctx.clip();
        const gx = pxL - 200 * S + (pw + 400 * S) * ease.inOutSine(gl);
        const sg = ctx.createLinearGradient(gx - 120 * S, 0, gx + 120 * S, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)');
        sg.addColorStop(0.5, 'rgba(255,255,255,0.22)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg;
        ctx.transform(1, 0, -0.35, 1, 0, 0);
        ctx.fillRect(gx - 120 * S + top * 0.35, top, 240 * S, nameH);
        ctx.restore();
      }
    }

    // role strip
    if (s.hasRole && s.stripW * stripK > 1) {
      const sw = s.stripW * stripK;
      const sy = top + nameH;
      const sx = center ? W / 2 - sw / 2 : px;
      if (theme === 'minimal') {
        ctx.fillStyle = p.accent;
        ctx.fillRect(sx, sy + 2 * S, sw, 4 * S);
      } else {
        ctx.fillStyle = theme === 'glass' ? api.rgba(p.accent, 0.88) : p.accent;
        ctx.fillRect(sx, sy, sw, s.roleH);
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, sy, sw, s.roleH);
      ctx.clip();
      ctx.font = api.font(s.role.size, 'Space Grotesk', 700);
      ctx.letterSpacing = `${(s.role.size * s.spacing).toFixed(2)}px`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = center ? 'center' : 'left';
      ctx.fillStyle = theme === 'minimal' ? p.ink : '#ffffff';
      if (theme === 'minimal') {
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 14 * S;
      }
      const slide = (1 - inRole) * -40 * S;
      s.role.lines.forEach((l, i) => {
        const y = sy + s.pad * 0.4 + (i + 0.5) * s.role.size * 1.3 + (theme === 'minimal' ? 8 * S : 0);
        ctx.fillText(l, (center ? W / 2 : sx + s.pad * 0.7) + slide, y);
      });
      ctx.letterSpacing = '0px';
      ctx.restore();
    }
  },
};
