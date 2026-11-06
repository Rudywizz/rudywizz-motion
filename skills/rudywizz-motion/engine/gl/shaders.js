// GLSL (WebGL2) sources for the compositor.

export const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const COMMON = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float easeIO(float t) { return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0; }
const float PI = 3.14159265;
`;

// ---------------------------------------------------------------- looks
export const LOOK = COMMON + `
uniform sampler2D uSrc;
uniform vec2 uRes;
uniform float uTime, uReveal, uAmount, uSeed;
uniform int uLook;
uniform vec3 uColA, uColB;

float L(vec2 uv) { return luma(texture(uSrc, uv).rgb); }
float sobel(vec2 uv, float r) {
  vec2 px = r / uRes;
  float tl = L(uv + px * vec2(-1, 1)), t = L(uv + px * vec2(0, 1)), tr = L(uv + px * vec2(1, 1));
  float l = L(uv + px * vec2(-1, 0)), rr = L(uv + px * vec2(1, 0));
  float bl = L(uv + px * vec2(-1, -1)), b = L(uv + px * vec2(0, -1)), br = L(uv + px * vec2(1, -1));
  float gx = -tl - 2.0 * l - bl + tr + 2.0 * rr + br;
  float gy = -bl - 2.0 * b - br + tl + 2.0 * t + tr;
  return length(vec2(gx, gy));
}
// 1 inside a hatch line. dark in 0..1 controls line thickness.
float hatch(vec2 fc, float ang, float spacing, float dark) {
  vec2 d = vec2(cos(ang), sin(ang));
  float wob = (vnoise(fc * 0.02) - 0.5) * 0.6;
  float v = dot(fc, d) / spacing + wob;
  float w = dark * 0.42;
  return 1.0 - smoothstep(w - 0.07, w + 0.07, abs(fract(v) - 0.5));
}

void main() {
  vec2 uv = vUv;
  vec4 c = texture(uSrc, uv);
  float l = luma(c.rgb);
  float s = max(0.35, uRes.y / 1920.0);
  vec2 fc = gl_FragCoord.xy / s;

  if (uLook == 1 || uLook == 2) {
    // engrave (1) / sketch (2), drawn on progressively
    float e = smoothstep(0.10, 0.32, sobel(uv, 1.4 * s));
    float d = clamp((1.0 - l) * 1.15, 0.0, 1.0);
    float n = fbm(uv * vec2(3.0, 4.5) + uSeed) * 0.75 + (1.0 - uv.y) * 0.35;
    float r = uReveal * 1.75;
    float rc = smoothstep(n, n + 0.06, r);
    float rh = smoothstep(n + 0.22, n + 0.3, r);
    float rw = smoothstep(n + 0.45, n + 0.7, r);
    vec3 paper = uColA * (0.9 + 0.1 * fbm(fc * 0.015));
    vec3 ink = uColB;
    vec3 col;
    if (uLook == 1) {
      float h1 = hatch(fc, 0.785, 6.5, smoothstep(0.2, 0.8, d));
      float h2 = hatch(fc, -0.785, 6.5, smoothstep(0.45, 0.95, d));
      float h3 = hatch(fc, 0.0, 4.5, smoothstep(0.72, 1.0, d));
      vec3 wash = paper * mix(vec3(0.62, 0.47, 0.3), vec3(1.0), smoothstep(0.0, 1.0, l));
      col = mix(paper, wash, rw * 0.9);
      float inkAmt = max(e * rc, max(h1, max(h2, h3)) * rh);
      col = mix(col, ink, clamp(inkAmt, 0.0, 1.0) * 0.92);
    } else {
      float h1 = hatch(fc + vnoise(fc * 0.05) * 3.0, 1.1, 5.0, smoothstep(0.35, 0.9, d) * 0.8);
      float h2 = hatch(fc, -0.4, 5.0, smoothstep(0.65, 1.0, d) * 0.8);
      col = mix(paper, paper * (0.75 + 0.25 * l), rw * 0.5);
      float inkAmt = max(e * rc * 0.95, max(h1, h2) * rh * 0.6);
      col = mix(col, ink, clamp(inkAmt, 0.0, 1.0));
    }
    o = vec4(col, 1.0);
  } else if (uLook == 3) {
    // oldphoto: sepia, lifted blacks, stains, faded edges
    float k = smoothstep(0.05, 0.95, l);
    vec3 col = vec3(k) * vec3(1.08, 0.9, 0.68) + vec3(0.06, 0.045, 0.02);
    float stain = smoothstep(0.62, 0.8, fbm(uv * 6.0 + uSeed));
    col *= 1.0 - stain * 0.25;
    vec2 q = uv - 0.5;
    col = mix(col, vec3(0.92, 0.86, 0.72), smoothstep(0.35, 0.75, length(q * vec2(1.0, 0.7))) * 0.7);
    o = vec4(mix(c.rgb, col, uAmount), c.a);
  } else if (uLook == 4) {
    o = vec4(mix(uColB, uColA, smoothstep(0.05, 0.95, l)), c.a);
  } else if (uLook == 5) {
    float cell = 9.0;
    mat2 R = mat2(0.7071, -0.7071, 0.7071, 0.7071);
    vec2 g = R * fc / cell;
    vec2 f = fract(g) - 0.5;
    float rad = sqrt(1.0 - l) * 0.62;
    float dot_ = 1.0 - smoothstep(rad - 0.06, rad + 0.06, length(f));
    o = vec4(mix(uColA, uColB, dot_), c.a);
  } else if (uLook == 6) {
    vec3 q = floor(c.rgb * 5.0 + hash(fc) * 0.4) / 5.0;
    o = vec4(q, c.a);
  } else if (uLook == 7) {
    float k = smoothstep(0.12, 0.88, l);
    o = vec4(vec3(k), c.a);
  } else {
    o = c;
  }
}`;

// ---------------------------------------------------------------- camera (+ camera blur)
export const CAMERA = COMMON + `
uniform sampler2D uSrc;
uniform vec2 uRes;
uniform int uN;
uniform vec4 uCA[16]; // x, y, zoom, rot
uniform vec4 uCB[16]; // tiltX, tiltY, -, -

vec2 camUV(vec2 uv, vec4 a, vec4 b) {
  vec2 q = (uv - 0.5) * uRes;
  float f = uRes.y * 1.4;
  float cx = cos(b.x), sx = sin(b.x), cy = cos(b.y), sy = sin(b.y);
  vec3 U = vec3(cy, 0.0, -sy);
  vec3 V = vec3(sy * sx, cx, cy * sx);
  vec3 N = vec3(sy * cx, -sx, cy * cx);
  vec3 C = vec3(0.0, 0.0, f);
  vec3 D = vec3(q, f);
  float den = dot(N, D);
  if (den <= 0.0001) return vec2(-9.0);
  float s = dot(N, C) / den;
  vec3 P = s * D - C;
  vec2 l = vec2(dot(P, U), dot(P, V));
  float cr = cos(-a.w), sr = sin(-a.w);
  l = mat2(cr, sr, -sr, cr) * l / a.z;
  l += vec2(a.x * uRes.x, -a.y * uRes.y);
  return l / uRes + 0.5;
}

void main() {
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 16; i++) {
    if (i >= uN) break;
    vec2 q = camUV(vUv, uCA[i], uCB[i]);
    if (q.x < -5.0) continue;
    acc += texture(uSrc, q);
  }
  o = acc / float(uN);
}`;

// ---------------------------------------------------------------- transitions
export const TRANSITION = COMMON + `
uniform sampler2D uA, uB;
uniform float uP, uSeed;
uniform vec2 uDir, uRes;
uniform int uType;
vec4 A(vec2 q) { return texture(uA, q); }
vec4 B(vec2 q) { return texture(uB, q); }
bool inside(vec2 q) { return q.x >= 0.0 && q.y >= 0.0 && q.x <= 1.0 && q.y <= 1.0; }
vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c) * v; }

void main() {
  vec2 uv = vUv;
  float p = clamp(uP, 0.0, 1.0);
  float e = easeIO(p);
  float bell = sin(PI * p);
  float asp = uRes.x / uRes.y;
  vec4 res;

  if (uType == 1) { // fade
    res = mix(A(uv), B(uv), smoothstep(0.0, 1.0, p));
  } else if (uType == 2 || uType == 3) { // flash / dip to black
    vec4 w = uType == 2 ? vec4(1.0) : vec4(0.0, 0.0, 0.0, 1.0);
    vec2 qa = (uv - 0.5) / (1.0 + 0.08 * p) + 0.5;
    vec2 qb = (uv - 0.5) / (1.08 - 0.08 * p) + 0.5;
    res = p < 0.5 ? mix(A(qa), w, smoothstep(0.0, 0.5, p)) : mix(w, B(qb), smoothstep(0.5, 1.0, p));
  } else if (uType == 4) { // whip pan with directional blur
    vec4 acc = vec4(0.0);
    float blur = bell * 0.22;
    for (int i = 0; i < 18; i++) {
      float k = (float(i) / 17.0 - 0.5) * blur;
      vec2 qa = uv - uDir * (e + k);
      acc += inside(qa) ? A(qa) : B(qa + uDir);
    }
    res = acc / 18.0;
  } else if (uType == 5) { // zoom through
    vec4 acc = vec4(0.0);
    vec2 c = uv - 0.5;
    float st = bell * 0.3;
    for (int i = 0; i < 14; i++) {
      float k = 1.0 - st * float(i) / 13.0;
      vec2 qa = c * k / (1.0 + e * 3.0) + 0.5;
      vec2 qb = c * k / (1.0 + (1.0 - e) * 1.8) + 0.5;
      acc += mix(A(qa), B(qb), smoothstep(0.4, 0.6, p));
    }
    res = acc / 14.0;
    res.rgb += bell * bell * 0.25;
  } else if (uType == 6) { // spin
    vec4 acc = vec4(0.0);
    vec2 c = (uv - 0.5) * vec2(asp, 1.0);
    for (int i = 0; i < 14; i++) {
      float k = (float(i) / 13.0 - 0.5) * bell * 0.35;
      vec2 ca = rot(c, e * 2.2 + k) / (1.0 + e * 1.5);
      vec2 cb = rot(c, -(1.0 - e) * 2.2 + k) / (1.0 + (1.0 - e) * 1.5);
      acc += mix(A(ca / vec2(asp, 1.0) + 0.5), B(cb / vec2(asp, 1.0) + 0.5), smoothstep(0.4, 0.6, p));
    }
    res = acc / 14.0;
  } else if (uType == 7) { // glitch cut
    vec2 blk = floor(uv * vec2(8.0, 26.0));
    float tick = floor(p * 18.0);
    float sel = step(hash(blk + uSeed + tick * 0.13), p * 1.25 - 0.12);
    vec2 off = vec2((hash(blk.yx + tick) - 0.5) * 0.3 * bell, 0.0) * step(0.55, hash(blk * 1.7 + tick));
    vec2 q = uv + off;
    float sh = 0.025 * bell;
    vec4 base = mix(A(q), B(q), sel);
    float r = mix(A(q + vec2(sh, 0)), B(q + vec2(sh, 0)), sel).r;
    float b = mix(A(q - vec2(sh, 0)), B(q - vec2(sh, 0)), sel).b;
    res = vec4(r, base.g, b, base.a);
    res.rgb += step(0.985, hash(vec2(blk.y, tick))) * bell * 0.6;
  } else if (uType == 8) { // ink bleed wipe
    float n = fbm(uv * vec2(2.5 * asp, 2.5) + uSeed) * 0.9 + (1.0 - uv.y) * 0.15;
    float edge = p * 1.35 - 0.12;
    float m = smoothstep(n - 0.02, n + 0.02, edge);
    float border = smoothstep(0.07, 0.0, abs(edge - n)) * (1.0 - step(0.999, p));
    res = mix(A(uv), B(uv), m);
    res.rgb = mix(res.rgb, vec3(0.03, 0.03, 0.05), border * 0.92);
  } else if (uType == 9) { // film burn
    float n = fbm(uv * vec2(3.2 * asp, 3.2) + uSeed) * 0.85 + 0.25 * length((uv - 0.5) * vec2(asp, 1.0));
    float d = p * 1.4 - n;
    res = A(uv);
    res.rgb = mix(res.rgb, vec3(0.06, 0.02, 0.0), smoothstep(-0.12, -0.02, d) * 0.85);
    vec3 hot = mix(vec3(1.0, 0.35, 0.05), vec3(1.0, 0.95, 0.6), smoothstep(-0.02, 0.02, d)) * 1.6;
    res.rgb = mix(res.rgb, hot, smoothstep(-0.035, 0.0, d) * (1.0 - smoothstep(0.02, 0.05, d)));
    res = mix(res, B(uv), smoothstep(0.02, 0.06, d));
  } else if (uType == 10) { // liquid warp
    float amp = bell * 0.09;
    vec2 off = vec2(fbm(uv * 3.0 + p * 2.0 + uSeed), fbm(uv * 3.0 - p * 2.0 + 7.0)) - 0.5;
    res = mix(A(uv + off * amp), B(uv - off * amp), smoothstep(0.3, 0.7, p));
  } else if (uType == 11) { // iris
    float d = length((uv - 0.5) * vec2(asp, 1.0));
    float r = e * 1.25;
    float m = 1.0 - smoothstep(r - 0.01, r + 0.01, d);
    vec2 qa = (uv - 0.5) / (1.0 + 0.15 * e) + 0.5;
    vec2 qb = (uv - 0.5) / (1.15 - 0.15 * e) + 0.5;
    res = mix(A(qa), B(qb), m);
    res.rgb += smoothstep(0.012, 0.0, abs(d - r)) * 0.8 * bell;
  } else if (uType == 12) { // soft diagonal wipe with light edge
    vec2 dir = normalize(vec2(1.0, 0.55));
    float v = dot(uv - 0.5, dir) + 0.5;
    float edge = p * 1.5 - 0.25;
    float m = 1.0 - smoothstep(edge - 0.04, edge + 0.04, v);
    res = mix(A(uv), B(uv), m);
    res.rgb += smoothstep(0.03, 0.0, abs(v - edge)) * 0.45;
  } else if (uType == 13) { // blinds
    float stripe = fract(uv.y * 14.0 + (uDir.x > 0.0 ? 0.0 : 0.5));
    float m = step(stripe, e * 1.02);
    res = mix(A(uv), B(uv), m);
  } else if (uType == 14) { // pixelate
    float size = max(1.0, bell * 90.0 * (uRes.y / 1920.0));
    vec2 q = (floor(uv * uRes / size) + 0.5) * size / uRes;
    res = mix(A(q), B(q), smoothstep(0.45, 0.55, p));
  } else if (uType == 15) { // light leak
    res = mix(A(uv), B(uv), smoothstep(0.25, 0.75, p));
    vec2 c = (uv - vec2(-0.3 + 1.6 * p, 0.55 + 0.1 * sin(p * 3.0))) * vec2(1.0, 1.7);
    float lg = smoothstep(0.9, 0.0, length(c));
    res.rgb += vec3(1.0, 0.5, 0.2) * lg * bell * 1.4 + vec3(1.0, 0.85, 0.65) * bell * 0.25;
  } else if (uType == 16) { // cube rotate
    float b = 1.0 - e;
    if (uv.x < b) {
      float xa = uv.x / b;
      float sy = 1.0 - 0.32 * e * xa;
      vec2 q = vec2(xa, (uv.y - 0.5) / sy + 0.5);
      res = inside(q) ? A(q) * vec4(vec3(1.0 - 0.55 * e), 1.0) : vec4(0.0, 0.0, 0.0, 1.0);
    } else {
      float xb = (uv.x - b) / max(0.0001, 1.0 - b);
      float sy = 1.0 - 0.32 * (1.0 - e) * (1.0 - xb);
      vec2 q = vec2(xb, (uv.y - 0.5) / sy + 0.5);
      res = inside(q) ? B(q) * vec4(vec3(1.0 - 0.55 * (1.0 - e)), 1.0) : vec4(0.0, 0.0, 0.0, 1.0);
    }
  } else if (uType == 17) { // ripple
    vec2 c = (uv - 0.5) * vec2(asp, 1.0);
    float d = length(c);
    float w = sin(d * 45.0 - p * 28.0) * bell * 0.025;
    vec2 q = uv + normalize(c + 1e-5) * w / vec2(asp, 1.0);
    res = mix(A(q), B(q), smoothstep(0.35, 0.65, p));
  } else if (uType == 18) { // doors
    vec2 qb = (uv - 0.5) / (1.15 - 0.15 * e) + 0.5;
    res = B(qb) * vec4(vec3(0.6 + 0.4 * e), 1.0);
    if (uv.x < 0.5) { vec2 q = uv + vec2(e * 0.5, 0.0); if (q.x < 0.5) res = A(q); }
    else { vec2 q = uv - vec2(e * 0.5, 0.0); if (q.x > 0.5) res = A(q); }
  } else if (uType == 19) { // stretch smear
    vec2 qa = vec2((uv.x - 0.5) / (1.0 + e * 7.0) + 0.5, uv.y);
    vec2 qb = vec2((uv.x - 0.5) / (1.0 + (1.0 - e) * 7.0) + 0.5, uv.y);
    res = mix(A(qa), B(qb), smoothstep(0.42, 0.58, p));
    res.rgb += bell * 0.18;
  } else if (uType == 20) { // luma dissolve
    float la = luma(A(uv).rgb);
    float m = smoothstep(la - 0.08, la + 0.08, p * 1.2 - 0.1);
    res = mix(A(uv), B(uv), m);
  } else {
    res = p < 0.5 ? A(uv) : B(uv);
  }
  o = res;
}`;

// ---------------------------------------------------------------- post
export const BRIGHT = COMMON + `
uniform sampler2D uSrc; uniform float uThr;
void main() { vec3 c = texture(uSrc, vUv).rgb; float l = luma(c); o = vec4(c * smoothstep(uThr, uThr + 0.25, l), 1.0); }`;

export const BLUR = COMMON + `
uniform sampler2D uSrc; uniform vec2 uStep;
void main() {
  vec3 c = texture(uSrc, vUv).rgb * 0.227;
  c += texture(uSrc, vUv + uStep * 1.38).rgb * 0.316; c += texture(uSrc, vUv - uStep * 1.38).rgb * 0.316;
  c += texture(uSrc, vUv + uStep * 3.23).rgb * 0.07; c += texture(uSrc, vUv - uStep * 3.23).rgb * 0.07;
  o = vec4(c, 1.0);
}`;

export const COPY = COMMON + `
uniform sampler2D uSrc; uniform float uScale;
void main() { o = texture(uSrc, vUv) * uScale; }`;

export const FINAL = COMMON + `
uniform sampler2D uScene, uBloom, uOver;
uniform int uHasOver;
uniform vec2 uRes, uWeave;
uniform float uTime, uBloomAmt, uCA, uDist, uVig, uGrain, uLeak, uFilm, uMono, uSat, uCon, uSplit, uScale, uOpaque;
uniform vec3 uLift, uGamma, uGain, uShadow, uHigh;

void main() {
  vec2 uv = vUv + uWeave;
  vec2 c0 = uv - 0.5;
  vec2 q = 0.5 + c0 * (1.0 + uDist * dot(c0, c0)) / (1.0 + uDist * 0.25);
  vec2 dir = q - 0.5;
  vec4 base = texture(uScene, q);
  float ca = uCA * 0.012;
  vec3 col = vec3(texture(uScene, q + dir * ca).r, base.g, texture(uScene, q - dir * ca).b);
  float a = base.a;
  if (uOpaque > 0.5) { col *= a; a = 1.0; }
  col += texture(uBloom, q).rgb * uBloomAmt;

  // grade
  float l = luma(col);
  col = mix(vec3(l), col, uSat);
  col = mix(col, vec3(l), uMono);
  col = (col - 0.5) * uCon + 0.5;
  col = pow(max(col * uGain + uLift * (1.0 - col), 0.0), 1.0 / uGamma);
  float l2 = luma(col);
  col += (uShadow * (1.0 - smoothstep(0.0, 0.55, l2)) + uHigh * smoothstep(0.45, 1.0, l2)) * uSplit;

  float fr = floor(uTime * 24.0);
  // light leaks
  if (uLeak > 0.0) {
    vec2 p1 = vec2(0.15 + 0.5 * sin(uTime * 0.31), 0.8 + 0.15 * cos(uTime * 0.23));
    vec2 p2 = vec2(0.9 + 0.2 * cos(uTime * 0.27), 0.25 + 0.2 * sin(uTime * 0.19));
    float g1 = smoothstep(0.75, 0.0, length((uv - p1) * vec2(1.0, 1.6)));
    float g2 = smoothstep(0.65, 0.0, length((uv - p2) * vec2(1.3, 1.0)));
    col += (vec3(1.0, 0.45, 0.15) * g1 + vec3(1.0, 0.2, 0.35) * g2) * uLeak * (0.7 + 0.3 * sin(uTime * 1.3));
  }
  // overlays sit on top of the grade (titles/captions stay clean)
  if (uHasOver == 1) {
    vec4 ov = texture(uOver, vUv);
    col = mix(col, ov.rgb, ov.a);
    a = max(a, ov.a);
  }
  // old film: flicker, scratches, dust
  if (uFilm > 0.0) {
    col *= 1.0 + (hash(vec2(fr, 3.1)) - 0.5) * 0.12 * uFilm;
    for (int i = 0; i < 3; i++) {
      float x = hash(vec2(fr, float(i) * 7.3));
      float on = step(0.55, hash(vec2(fr, float(i) * 1.9)));
      col = mix(col, vec3(0.95, 0.9, 0.8), on * uFilm * 0.5 * smoothstep(0.0012, 0.0, abs(uv.x - x)));
    }
    float dust = step(0.9993, hash(floor(uv * uRes / 3.0) + fr * 1.7));
    col = mix(col, vec3(0.08, 0.06, 0.04), dust * uFilm);
    float hair = step(0.9997, hash(floor(uv * uRes / 9.0) + fr));
    col *= 1.0 - hair * uFilm * 0.6;
  }
  // vignette
  float v = smoothstep(0.85, 0.25, length(c0 * vec2(1.0, uRes.y / uRes.x * 0.62)));
  col *= mix(1.0, v, uVig);
  // grain
  float g = hash(vUv * uRes + fract(uTime * 13.7) * 100.0) - 0.5;
  col += g * uGrain * (0.6 + 0.4 * (1.0 - luma(col)));
  o = vec4(clamp(col, 0.0, 1.0), a) * uScale;
}`;

export const TRANSITION_IDS = {
  cut: 0, fade: 1, flash: 2, dip: 3, whip: 4, zoom: 5, spin: 6, glitch: 7, ink: 8, burn: 9, liquid: 10,
  iris: 11, wipe: 12, blinds: 13, pixelate: 14, leak: 15, cube: 16, ripple: 17, doors: 18, stretch: 19, luma: 20,
};
export const LOOK_IDS = { none: 0, engrave: 1, sketch: 2, oldphoto: 3, duotone: 4, halftone: 5, posterize: 6, noir: 7 };
