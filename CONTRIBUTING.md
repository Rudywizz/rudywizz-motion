# Contributing

Thanks for helping! The fastest way to contribute is a new **style** — one file.

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

2. `node skills/rudywizz-motion/engine/cli.mjs still my-style --at 2 --size 540` and look at it.
3. `npm run skills` — generates `skills/my-style/SKILL.md` (the `/my-style` command).
4. `node scripts/build-gallery.mjs --only my-style` after adding it to the list in that script.

### Rules
- **Deterministic**: no `Math.random()`, `Date.now()` or real time. Use `api.rng(seed)`, `api.hash(...)`, `api.noise1(...)`.
- Scale sizes with `api.S` (1 at a 1080 short side) so every format works.
- Use `api.bg(color)` instead of clearing the canvas yourself — overlays and `--alpha` depend on it.
- Turkish and other scripts must work: use `api.graphemes`, `api.upper(text, p.lang)`, and fonts that cover latin-ext.
- Keep `setup` heavy and `frame` light.

## Engine changes
- Cameras: `engine/camera.js` (`CAMERA_PRESETS`).
- Transitions, looks, post: `engine/gl/shaders.js` (+ id maps at the bottom, + `TRANSITIONS`/`LOOKS` in `engine/timeline.js`).
- Grades: `GRADE_PRESETS` in `engine/gl/compositor.js`.

## Licensing of assets
Only add fonts under the SIL OFL (append their license to `engine/fonts/LICENSE-FONTS.txt`) and media you created or that is public domain / CC0.
