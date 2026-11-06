# Contributing

Thanks for helping! The fastest way to contribute is a new **style** — one file.
Bug reports, template ideas and videos you made (post them in Discussions) help just as much.

## Setup

```bash
git clone https://github.com/Rudywizz/rudywizz-motion && cd rudywizz-motion
npm install
npx playwright install chromium     # once
npm run doctor                      # ffmpeg ✓ browser ✓ WebGL2 ✓
npm run test:quick                  # renders a still of every style (~1 min)
```

## Add a style

1. Create `skills/rudywizz-motion/styles/<id>/style.js`:

```js
export default {
  id: 'my-style',
  title: 'My Style',
  tagline: 'One line, shown in `list` and the generated skill',
  fonts: [['Fraunces', 900], ['Instrument Serif', 400, 'italic']], // must exist in engine/fonts/fonts.css
  defaults: { text: 'Hello / world', duration: 5, ink: '#ffffff', bg: '#111111' },
  options: { ink: 'Text colour', bg: 'Background colour' },     // documented in the skill

  async setup(api) {
    // runs once: measure text, build offscreen canvases, fetch data (api.asset('data/…'))
    const lines = api.splitLines(api.upper(api.p.text, api.p.lang));
    return { lines };
  },

  frame(api, t, s) {
    const { ctx, W, H, p, ease, prog } = api;
    api.bg(p.bg);                       // respects --alpha and overlay mode
    const e = ease.outExpo(prog(t, 0.2, 1.2));
    // …draw with ctx at time t (seconds, 0..p.duration)
  },
};
```

2. `node skills/rudywizz-motion/engine/cli.mjs still my-style --at 2 --size 540` and look at it. Also try
   `--format 16:9`, `--format 1:1` and a long Turkish text (`--text "Çekoslovakyalılaştıramadıklarımızdan / İğdır"`).
3. `npm run skills` — generates `skills/my-style/SKILL.md` (the agent skill) and updates the JSON Schema.
4. Add a line for it in `scripts/build-gallery.mjs` and run `node scripts/build-gallery.mjs --only my-style`.
5. `npm test` — every style and template must render, and the output must be deterministic.

Helpers worth knowing (all on `api`): `fitSize`, `breakLongWords` (hyphenates words that would
otherwise overflow), `wrap`, `layoutChars`, `spring`, `ease.*`, `rng`, `hash`, `noise1`, `makeGrain`,
`vignette`, `tint`, `offscreen`, `loadImage`.

### Rules
- **Deterministic**: no `Math.random()`, `Date.now()` or real time. Use `api.rng(seed)`, `api.hash(...)`, `api.noise1(...)`.
- Scale sizes with `api.S` (1 at a 1080 short side) so every format works.
- Use `api.bg(color)` instead of clearing the canvas yourself — overlays and `--alpha` depend on it.
- Turkish and other scripts must work: use `api.graphemes`, `api.upper(text, p.lang)`, and fonts that cover latin-ext.
- Keep `setup` heavy and `frame` light.
- Text must never leave the frame: test long words and 4 lines in every format.
- Original work only: no logos, characters, UI or title designs copied from real brands, films or games.
- No network access from styles; load only bundled files through `api.asset(...)` and user media through `api.loadImage(...)`.

## Engine changes
- Cameras: `engine/camera.js` (`CAMERA_PRESETS`).
- Transitions, looks, post: `engine/gl/shaders.js` (+ id maps at the bottom, + `TRANSITIONS`/`LOOKS` in `engine/timeline.js`).
- Grades: `GRADE_PRESETS` in `engine/gl/compositor.js`.

## Licensing of assets
Only add fonts under the SIL OFL (append their license to `engine/fonts/LICENSE-FONTS.txt`) and media you created or that is public domain / CC0, and list them in `THIRD_PARTY_NOTICES.md`.
No new runtime dependencies without discussion — the single dependency (Playwright) is part of why people can trust this tool.

By contributing you agree that your contribution is licensed under the MIT License of this project.
