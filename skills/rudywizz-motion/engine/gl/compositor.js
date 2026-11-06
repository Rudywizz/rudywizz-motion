// WebGL2 compositor: scene canvases -> look filter -> camera (with camera blur)
// -> transition -> bloom + grade + lens + film + grain -> screen.
import { VERT, LOOK, CAMERA, TRANSITION, BRIGHT, BLUR, COPY, FINAL, TRANSITION_IDS, LOOK_IDS } from './shaders.js';

export const GRADE_PRESETS = {
  none: {},
  'teal-orange': { sat: 1.12, con: 1.08, gain: [1.02, 1.0, 0.97], shadow: [-0.03, 0.03, 0.07], high: [0.07, 0.03, -0.04], split: 1 },
  kodak: { sat: 1.1, con: 1.06, gain: [1.06, 1.0, 0.9], lift: [0.03, 0.02, 0.0], high: [0.04, 0.02, 0.0], split: 1 },
  fuji: { sat: 0.95, con: 1.04, gain: [0.98, 1.03, 0.98], lift: [0.0, 0.02, 0.03], shadow: [0.0, 0.03, 0.02], split: 1 },
  sepia: { mono: 1, con: 1.1, gain: [1.12, 0.95, 0.72], lift: [0.06, 0.04, 0.02] },
  noir: { mono: 1, con: 1.35, gain: [1.05, 1.05, 1.05] },
  bleach: { sat: 0.55, con: 1.3 },
  cyber: { sat: 1.25, con: 1.1, shadow: [0.06, -0.01, 0.12], high: [-0.02, 0.07, 0.1], split: 1 },
  sunset: { sat: 1.15, con: 1.04, gain: [1.08, 0.96, 0.9], shadow: [0.05, 0.0, 0.07], high: [0.08, 0.04, 0.0], split: 1 },
  matte: { sat: 0.9, con: 0.9, lift: [0.08, 0.08, 0.08] },
};

const LOOK_COLORS = {
  engrave: [[0.93, 0.88, 0.77], [0.2, 0.13, 0.07]],
  sketch: [[0.96, 0.95, 0.92], [0.17, 0.17, 0.19]],
  duotone: [[1.0, 0.82, 0.3], [0.12, 0.08, 0.35]],
  halftone: [[0.96, 0.94, 0.89], [0.08, 0.08, 0.1]],
};

function hexToVec(h) {
  const n = parseInt(String(h).replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export class Compositor {
  constructor(canvas, W, H) {
    this.W = W;
    this.H = H;
    canvas.width = W;
    canvas.height = H;
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false, alpha: true, antialias: false });
    if (!gl) throw new Error('WebGL2 is not available in this browser');
    this.gl = gl;
    const buf = gl.createBuffer();
    this.buf = buf;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.P = {
      look: this.program(LOOK),
      cam: this.program(CAMERA),
      tr: this.program(TRANSITION),
      bright: this.program(BRIGHT),
      blur: this.program(BLUR),
      copy: this.program(COPY),
      final: this.program(FINAL),
    };
    const mk = (w, h) => this.target(w, h);
    this.src = [this.texture(), this.texture()];
    this.over = this.texture();
    this.look = [mk(W, H), mk(W, H)];
    this.cam = [mk(W, H), mk(W, H)];
    this.trans = mk(W, H);
    const bw = Math.max(1, Math.round(W / 4));
    const bh = Math.max(1, Math.round(H / 4));
    this.bloomA = mk(bw, bh);
    this.bloomB = mk(bw, bh);
    this.accum = mk(W, H);
  }

  program(fs) {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader compile failed: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Program link failed: ' + gl.getProgramInfoLog(p));
    p.loc = {};
    return p;
  }

  texture(w, h) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return t;
  }

  target(w, h) {
    const gl = this.gl;
    const tex = this.texture(w, h);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb, w, h };
  }

  upload(tex, canvas) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  }

  /** Run program p into target (null = screen) with uniforms + textures. */
  pass(p, target, uniforms = {}, textures = {}, blend = false) {
    const gl = this.gl;
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
    gl.viewport(0, 0, target ? target.w : this.W, target ? target.h : this.H);
    if (blend) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
    } else gl.disable(gl.BLEND);
    let unit = 0;
    for (const [name, tex] of Object.entries(textures)) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(this.loc(p, name), unit++);
    }
    for (const [name, v] of Object.entries(uniforms)) {
      const l = this.loc(p, name);
      if (l == null) continue;
      if (typeof v === 'number') gl.uniform1f(l, v);
      else if (v && v.int != null) gl.uniform1i(l, v.int);
      else if (v.length === 2) gl.uniform2fv(l, v);
      else if (v.length === 3) gl.uniform3fv(l, v);
      else gl.uniform4fv(l, v);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  loc(p, name) {
    if (!(name in p.loc)) p.loc[name] = this.gl.getUniformLocation(p, name);
    return p.loc[name];
  }

  /** scene: { canvas, look, lookOpts, reveal, cams: [{x,y,zoom,rot,tx,ty}], seed, time } */
  renderScene(slot, scene) {
    this.upload(this.src[slot], scene.canvas);
    let tex = this.src[slot];
    const lookId = LOOK_IDS[scene.look] ?? 0;
    if (lookId) {
      const lo = scene.lookOpts || {};
      const [ca, cb] = LOOK_COLORS[scene.look] || [[1, 1, 1], [0, 0, 0]];
      this.pass(this.P.look, this.look[slot], {
        uRes: [this.W, this.H],
        uTime: scene.time || 0,
        uReveal: scene.reveal ?? 1,
        uAmount: lo.amount ?? 1,
        uSeed: (scene.seed || 1) * 1.37,
        uLook: { int: lookId },
        uColA: lo.paper ? hexToVec(lo.paper) : ca,
        uColB: lo.ink ? hexToVec(lo.ink) : cb,
      }, { uSrc: tex });
      tex = this.look[slot].tex;
    }
    const cams = scene.cams.slice(0, 16);
    const A = new Float32Array(64);
    const B = new Float32Array(64);
    cams.forEach((c, i) => {
      A.set([c.x, c.y, c.zoom, c.rot], i * 4);
      B.set([c.tx, c.ty, 0, 0], i * 4);
    });
    const gl = this.gl;
    gl.useProgram(this.P.cam);
    gl.uniform4fv(this.loc(this.P.cam, 'uCA'), A);
    gl.uniform4fv(this.loc(this.P.cam, 'uCB'), B);
    this.pass(this.P.cam, this.cam[slot], { uRes: [this.W, this.H], uN: { int: cams.length } }, { uSrc: tex });
    return this.cam[slot];
  }

  /**
   * Compose one (sub)frame.
   * f = { a: scene, b: scene|null, tr: {type, dir, p}|null, overlay: canvas|null, post: {...}, time, scale, accumulate }
   */
  frame(f) {
    let out = this.renderScene(0, f.a);
    if (f.b && f.tr) {
      const B = this.renderScene(1, f.b);
      this.pass(this.P.tr, this.trans, {
        uP: f.tr.p,
        uSeed: f.seed || 1,
        uDir: f.tr.dir || [-1, 0],
        uRes: [this.W, this.H],
        uType: { int: TRANSITION_IDS[f.tr.type] ?? 1 },
      }, { uA: out.tex, uB: B.tex });
      out = this.trans;
    }
    const post = f.post || {};
    const bloom = post.bloom ?? 0;
    if (bloom > 0) {
      this.pass(this.P.bright, this.bloomA, { uThr: post.bloomThreshold ?? 0.72 }, { uSrc: out.tex });
      for (let k = 0; k < 2; k++) {
        const sp = 1 + k * 1.5;
        this.pass(this.P.blur, this.bloomB, { uStep: [sp / this.bloomA.w, 0] }, { uSrc: this.bloomA.tex });
        this.pass(this.P.blur, this.bloomA, { uStep: [0, sp / this.bloomA.h] }, { uSrc: this.bloomB.tex });
      }
    }
    if (f.overlay) this.upload(this.over, f.overlay);
    const g = { sat: 1, con: 1, mono: 0, lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], shadow: [0, 0, 0], high: [0, 0, 0], split: 0, ...(GRADE_PRESETS[post.grade] || {}) };
    const k = post.gradeAmount ?? 1;
    const mixv = (v, d) => (Array.isArray(v) ? v.map((x, i) => d[i] + (x - d[i]) * k) : d + (v - d) * k);
    this.pass(this.P.final, f.accumulate ? this.accum : null, {
      uRes: [this.W, this.H],
      uWeave: f.weave || [0, 0],
      uTime: f.time || 0,
      uBloomAmt: bloom,
      uCA: post.aberration ?? 0,
      uDist: (post.distortion ?? 0) + (f.lens || 0),
      uVig: post.vignette ?? 0,
      uGrain: post.grain ?? 0,
      uLeak: post.leak ?? 0,
      uFilm: post.film ?? 0,
      uMono: mixv(g.mono, 0),
      uSat: mixv(g.sat, 1),
      uCon: mixv(g.con, 1),
      uSplit: mixv(g.split, 0),
      uLift: mixv(g.lift, [0, 0, 0]),
      uGamma: mixv(g.gamma, [1, 1, 1]),
      uGain: mixv(g.gain, [1, 1, 1]),
      uShadow: g.shadow,
      uHigh: g.high,
      uScale: f.scale ?? 1,
      uOpaque: post.opaque ? 1 : 0,
      uHasOver: { int: f.overlay ? 1 : 0 },
    }, { uScene: out.tex, uBloom: bloom > 0 ? this.bloomA.tex : out.tex, uOver: this.over }, !!f.accumulate);
  }

  clearAccum() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.accum.fb);
    gl.viewport(0, 0, this.W, this.H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  presentAccum() {
    this.pass(this.P.copy, null, { uScale: 1 }, { uSrc: this.accum.tex });
  }
}
