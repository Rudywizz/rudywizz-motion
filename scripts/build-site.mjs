#!/usr/bin/env node
// Builds the GitHub Pages showcase into _site/ from the style metadata, the
// templates and the gallery previews. Nothing is fetched from the network.
//   node scripts/build-site.mjs [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '_site'));
const ENGINE = path.join(ROOT, 'skills', 'rudywizz-motion');
const REPO = 'https://github.com/Rudywizz/rudywizz-motion';
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// --- data -------------------------------------------------------------------
const styles = {};
for (const id of fs.readdirSync(path.join(ENGINE, 'styles')).sort()) {
  const f = path.join(ENGINE, 'styles', id, 'style.js');
  if (fs.existsSync(f)) styles[id] = (await import(pathToFileURL(f).href)).default;
}

const GROUPS = [
  ['kinetic', 'Kinetic type', ['word-stack', 'glitch-title', 'scramble', 'ticker-rows', 'typewriter', 'highlight-quote', 'beat-cut', 'lyric-video', 'murmuration', 'neon-sign', 'inflate', 'ink-bleed', 'halftone-press', 'led-marquee', 'split-flap', 'vhs-memory', 'pixel-quest', 'signal-tune']],
  ['3d', '3D', ['extrude-3d', 'cube-spin', 'particle-sphere', 'text-tunnel', 'retro-grid', 'card-carousel']],
  ['social', 'Social & broadcast', ['lower-third', 'chat-story', 'bar-chart', 'countdown', 'cta-follow', 'captions', 'odometer', 'receipt', 'orbit-ring']],
  ['maps', 'Maps & history', ['map-route', 'history-title', 'parchment-letter']],
];
// extra gallery tiles that are not a style id of their own
const EXTRA = {
  'map-route': [
    ['map-globe', 'map-route · globe', `--set 'route=["Paris","Rome","Istanbul"]'`],
    ['map-atlas', 'map-route · atlas', `--set 'map=atlas'`],
    ['map-turkey', 'map-route · Turkey', `--set 'map=turkey'`],
  ],
};
const IMAGE_TILES = [
  ['look-engrave', 'image · engrave', 'Turn any photo into a moving engraving', 'render image --image photo.jpg --look engrave'],
  ['look-sketch', 'image · sketch', 'Pencil-sketch look with a hand-held camera', 'render image --image photo.jpg --look sketch'],
  ['transitions', '20 transitions', 'whip, burn, ink, liquid, glitch, cube, iris…', 'list'],
];

const tiles = [];
for (const [key, , ids] of GROUPS) {
  for (const id of ids) {
    const s = styles[id];
    if (!s) throw new Error(`build-site: unknown style ${id}`);
    if (EXTRA[id]) {
      for (const [img, name, flag] of EXTRA[id]) tiles.push({ key, img, name, tagline: s.tagline, cmd: `render ${id} ${flag}` });
    } else {
      tiles.push({ key, img: id, name: id, tagline: s.tagline, cmd: `render ${id}` });
    }
  }
  if (key === 'maps') for (const [img, name, tagline, cmd] of IMAGE_TILES) tiles.push({ key, img, name, tagline, cmd });
}
const listed = new Set(GROUPS.flatMap((g) => g[2]));
const missing = Object.keys(styles).filter((id) => !listed.has(id));
if (missing.length) throw new Error(`build-site: add these styles to GROUPS: ${missing.join(', ')}`);
for (const t of tiles) if (!fs.existsSync(path.join(ROOT, 'gallery', `${t.img}.webp`))) throw new Error(`build-site: missing gallery/${t.img}.webp`);

const templates = fs.readdirSync(path.join(ENGINE, 'templates')).filter((f) => f.endsWith('.json')).sort().map((f) => {
  const j = JSON.parse(fs.readFileSync(path.join(ENGINE, 'templates', f), 'utf8'));
  const flow = (j.scenes || []).map((sc) => sc.style || (sc.clip ? 'clip' : sc.image ? 'image' : 'scene'));
  return { id: f.replace(/\.json$/, ''), format: j.format || '9:16', flow: [...new Set(flow)] };
});

// --- page ---------------------------------------------------------------------
const tileHtml = tiles.map((t) => `
      <figure class="tile" data-k="${t.key}">
        <img src="gallery/${t.img}.webp" width="270" height="480" loading="lazy" alt="${esc(t.name)}: ${esc(t.tagline)}">
        <figcaption>
          <b>${esc(t.name)}</b>
          <span>${esc(t.tagline)}</span>
          <button class="copy" data-copy="npx rudywizz-motion ${esc(t.cmd)}" aria-label="Copy command for ${esc(t.name)}" title="npx rudywizz-motion ${esc(t.cmd)}">$ ${esc(t.cmd)}</button>
        </figcaption>
      </figure>`).join('');

const tplHtml = templates.map((t) => `
        <li><code>${esc(t.id)}</code><span class="fmt">${esc(t.format)}</span><span class="flow">${t.flow.map(esc).join(' → ')}</span></li>`).join('');

const filters = [['all', `All ${tiles.length}`], ...GROUPS.map(([k, label]) => [k, label])]
  .map(([k, label], i) => `<button class="chip" data-f="${k}" aria-pressed="${i === 0}">${esc(label)}</button>`).join('');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>rudywizz motion · cinematic motion graphics from code</title>
<meta name="description" content="${Object.keys(styles).length} animated styles and ${templates.length} templates: kinetic typography, 3D titles, lower thirds, chat stories, maps. Open-source CLI + Claude Code skills. MP4, transparent MOV/WebM, GIF, WebP.">
<meta property="og:title" content="rudywizz motion">
<meta property="og:description" content="Cinematic motion graphics, rendered from code. Open source, MIT.">
<meta property="og:image" content="https://rudywizz.github.io/rudywizz-motion/social-preview.jpg">
<meta property="og:url" content="https://rudywizz.github.io/rudywizz-motion/">
<meta name="twitter:card" content="summary_large_image">
<meta name="color-scheme" content="dark">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<style>
@font-face{font-family:Brico;src:url(fonts/bricolage-800.woff2) format('woff2');font-weight:800;font-display:swap}
@font-face{font-family:Grotesk;src:url(fonts/space-grotesk-400.woff2) format('woff2');font-weight:400;font-display:swap}
@font-face{font-family:Grotesk;src:url(fonts/space-grotesk-700.woff2) format('woff2');font-weight:700;font-display:swap}
@font-face{font-family:Mono;src:url(fonts/jetbrains-mono-400.woff2) format('woff2');font-weight:400;font-display:swap}
:root{--bg:#0b0d10;--bg2:#12151a;--line:#232831;--ink:#e6f2ef;--dim:#9aa7a4;--coral:#ff6b5a;--teal:#14b8a6;--r:14px}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.55 Grotesk,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}
code,.copy,pre{font-family:Mono,ui-monospace,monospace}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}
header{position:sticky;top:0;z-index:5;background:rgba(11,13,16,.82);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
header .wrap{display:flex;align-items:center;gap:16px;height:60px}
header img{height:30px;width:auto}
header nav{margin-left:auto;display:flex;gap:18px;font-size:14px}
header nav a{text-decoration:none;color:var(--dim)}
header nav a:hover{color:var(--ink)}
.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;font-weight:700;text-decoration:none;border:1px solid var(--line);background:var(--bg2);font-size:15px}
.btn.primary{background:var(--coral);border-color:var(--coral);color:#140605}
.btn:hover{filter:brightness(1.08)}
.hero{padding:64px 0 28px;text-align:center}
.hero h1{font:800 clamp(38px,6.4vw,78px)/1.02 Brico,Grotesk,sans-serif;letter-spacing:-.02em;margin:0 0 18px}
.hero h1 em{font-style:normal;color:var(--coral)}
.hero p.lead{max-width:720px;margin:0 auto 26px;color:var(--dim);font-size:clamp(16px,2vw,19px)}
.cta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:34px}
.reel{border-radius:var(--r);overflow:hidden;border:1px solid var(--line);box-shadow:0 30px 80px -30px rgba(255,107,90,.35);max-width:960px;margin:0 auto}
.reel img{display:block;width:100%;height:auto;aspect-ratio:16/9}
.facts{display:flex;justify-content:center;gap:28px;flex-wrap:wrap;margin:26px 0 0;color:var(--dim);font-size:14px}
.facts b{color:var(--ink);font:800 22px Brico,sans-serif;display:block}
section{padding:56px 0;scroll-margin-top:50px}
h2{font:800 clamp(28px,3.6vw,42px)/1.1 Brico,sans-serif;margin:0 0 10px;letter-spacing:-.01em}
.sub{color:var(--dim);margin:0 0 24px}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:22px}
.chip{font:700 14px Grotesk,sans-serif;color:var(--dim);background:var(--bg2);border:1px solid var(--line);border-radius:999px;padding:7px 14px;cursor:pointer}
.chip[aria-pressed=true]{color:#06100e;background:var(--teal);border-color:var(--teal)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}
.tile{margin:0;background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column}
.tile img{display:block;width:100%;height:auto;aspect-ratio:9/16;background:#000}
.tile figcaption{padding:12px;display:flex;flex-direction:column;gap:4px;flex:1}
.tile b{font-size:15px}
.tile span{color:var(--dim);font-size:13px;line-height:1.4;flex:1}
.copy{margin-top:8px;text-align:left;font-size:11px;color:var(--teal);background:#0b0f10;border:1px solid var(--line);border-radius:8px;padding:7px 8px;cursor:copy;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%}
.copy.ok{color:var(--coral)}
.tile[hidden]{display:none}
pre{background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);padding:18px 20px;overflow-x:auto;font-size:14px;line-height:1.7;margin:0}
pre .c{color:#66736f}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}
.card{background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);padding:20px}
.card h3{margin:0 0 6px;font-size:17px}
.card p{margin:0;color:var(--dim);font-size:14.5px}
.tpl{list-style:none;margin:0;padding:0;border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.tpl li{display:grid;grid-template-columns:150px 54px 1fr;gap:12px;padding:11px 16px;border-top:1px solid var(--line);font-size:14px;align-items:center}
.tpl li:first-child{border-top:0}
.tpl code{color:var(--coral)}
.tpl .fmt{color:var(--teal);font-size:12px}
.tpl .flow{color:var(--dim)}
footer{border-top:1px solid var(--line);padding:30px 0 50px;color:var(--dim);font-size:14px}
footer .wrap{display:flex;gap:16px;flex-wrap:wrap;justify-content:space-between}
@media (max-width:640px){
  header nav a.hide-s{display:none}
  .tpl li{grid-template-columns:1fr auto}.tpl .flow{grid-column:1/-1}
  .grid{grid-template-columns:repeat(2,1fr);gap:10px}
  .copy{display:none}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style>
</head>
<body>
<header><div class="wrap">
  <a href="./" aria-label="rudywizz motion home"><img src="logo-dark.svg" alt="rudywizz motion" width="168" height="30"></a>
  <nav>
    <a href="#gallery">Gallery</a>
    <a href="#install">Install</a>
    <a class="hide-s" href="#templates">Templates</a>
    <a class="hide-s" href="${REPO}/blob/main/skills/rudywizz-motion/SKILL.md">Docs</a>
    <a href="${REPO}">GitHub</a>
  </nav>
</div></header>

<main>
<div class="wrap hero">
  <h1>Motion graphics,<br><em>rendered from code.</em></h1>
  <p class="lead">Kinetic typography, 3D titles, lower thirds, chat stories, charts and map flights. One command gives you an MP4, a transparent MOV/WebM for your editor, a GIF or a WebP. No After Effects, no AI video model: every frame is drawn by code, so every render is exact and repeatable.</p>
  <div class="cta">
    <a class="btn primary" href="${REPO}">★ Star on GitHub</a>
    <a class="btn" href="#install">Get started</a>
  </div>
  <div class="reel"><img src="gallery/hero.webp" width="640" height="360" alt="Showreel: kinetic type, 3D titles, maps and transitions"></div>
  <div class="facts">
    <div><b>${Object.keys(styles).length}</b>styles</div>
    <div><b>${templates.length}</b>templates</div>
    <div><b>20</b>shader transitions</div>
    <div><b>19</b>camera moves</div>
    <div><b>0</b>telemetry</div>
    <div><b>MIT</b>license</div>
  </div>
</div>

<section id="gallery"><div class="wrap">
  <h2>Gallery</h2>
  <p class="sub">Every preview is a real render. Click a command to copy it.</p>
  <div class="chips" role="group" aria-label="Filter styles">${filters}</div>
  <div class="grid">${tileHtml}
  </div>
</div></section>

<section id="install"><div class="wrap">
  <h2>Install</h2>
  <p class="sub">Needs Node 18+ and ffmpeg. Works on Windows, macOS and Linux.</p>
  <div class="cols">
    <div>
<pre><span class="c"># CLI</span>
git clone ${REPO}
cd rudywizz-motion
npm install
npx playwright install chromium
npx rudywizz-motion doctor

<span class="c"># first video</span>
npx rudywizz-motion render glitch-title --text "Hello / world"</pre>
    </div>
    <div>
<pre><span class="c"># Claude Code plugin</span>
/plugin marketplace add Rudywizz/rudywizz-motion
/plugin install rudywizz-motion@rudywizz

<span class="c"># any agent that reads skills</span>
npx skills add Rudywizz/rudywizz-motion

<span class="c"># then just ask</span>
"a 16:9 YouTube intro for my channel,
 glitchy, then a lower third with my name"</pre>
    </div>
  </div>
</div></section>

<section id="templates"><div class="wrap">
  <h2>Templates</h2>
  <p class="sub">Whole edits in one command: <code>npx rudywizz-motion render stats-recap</code>. Copy the JSON and make it yours.</p>
  <ul class="tpl">${tplHtml}
  </ul>
</div></section>

<section><div class="wrap">
  <h2>Why it looks better</h2>
  <p class="sub">A real compositor, not a text-animation toy.</p>
  <div class="cols">
    <div class="card"><h3>Frame-perfect</h3><p>Each frame is computed at t = frame / fps and piped to ffmpeg. No screen recording, no dropped frames. Same seed, same video (checked in CI).</p></div>
    <div class="card"><h3>WebGL2 compositor</h3><p>Camera moves with motion blur, shader transitions, bloom, lens, light leaks, film damage and colour grades on every scene.</p></div>
    <div class="card"><h3>Every format</h3><p>9:16, 1:1, 4:5 and 16:9 at any size. Text is fitted, wrapped and hyphenated so it never leaves the frame.</p></div>
    <div class="card"><h3>Transparent output</h3><p>Render with <code>--alpha</code> to ProRes 4444 or VP9 and drop titles onto footage in Premiere, Resolve, Final Cut or CapCut.</p></div>
    <div class="card"><h3>Your footage</h3><p>Clips and photos get speed ramps, hand-held camera, captions, parallax layers, sketch and engraving looks.</p></div>
    <div class="card"><h3>Safe to run</h3><p>No network, no telemetry, one dependency. The local render server is bound to 127.0.0.1 behind a random per-run token.</p></div>
  </div>
</div></section>
</main>

<footer><div class="wrap">
  <span>rudywizz motion v${esc(pkg.version)} · MIT · made by <a href="https://github.com/Rudywizz">Rudywizz</a></span>
  <span><a href="${REPO}">GitHub</a> · <a href="${REPO}/releases">Releases</a> · <a href="${REPO}/discussions">Discussions</a> · <a href="${REPO}/blob/main/README.tr.md">Türkçe</a></span>
</div></footer>

<script>
document.querySelectorAll('.chip').forEach(function (c) {
  c.addEventListener('click', function () {
    document.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
    var f = c.dataset.f;
    document.querySelectorAll('.tile').forEach(function (t) { t.hidden = f !== 'all' && t.dataset.k !== f; });
  });
});
document.querySelectorAll('.copy').forEach(function (b) {
  b.addEventListener('click', function () {
    var done = function () { var o = b.textContent; b.textContent = 'Copied ✓'; b.classList.add('ok'); setTimeout(function () { b.textContent = o; b.classList.remove('ok'); }, 1200); };
    if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy).then(done, function () {});
  });
});
</script>
</body>
</html>
`;

// --- write --------------------------------------------------------------------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'gallery'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
for (const f of fs.readdirSync(path.join(ROOT, 'gallery'))) if (f.endsWith('.webp')) fs.copyFileSync(path.join(ROOT, 'gallery', f), path.join(OUT, 'gallery', f));
fs.copyFileSync(path.join(ROOT, '.github', 'logo', 'logo-dark.svg'), path.join(OUT, 'logo-dark.svg'));
fs.copyFileSync(path.join(ROOT, '.github', 'social-preview.jpg'), path.join(OUT, 'social-preview.jpg'));
fs.copyFileSync(path.join(ROOT, '.github', 'logo', 'favicon.svg'), path.join(OUT, 'favicon.svg'));
const FONTS = path.join(ENGINE, 'engine', 'fonts');
for (const [src, dst] of [
  ['bricolage-grotesque-latin-800-normal.woff2', 'bricolage-800.woff2'],
  ['space-grotesk-latin-400-normal.woff2', 'space-grotesk-400.woff2'],
  ['space-grotesk-latin-700-normal.woff2', 'space-grotesk-700.woff2'],
  ['jetbrains-mono-latin-400-normal.woff2', 'jetbrains-mono-400.woff2'],
]) fs.copyFileSync(path.join(FONTS, src), path.join(OUT, 'fonts', dst));
console.log(`site → ${path.relative(ROOT, OUT) || OUT}  (${tiles.length} tiles, ${templates.length} templates)`);
