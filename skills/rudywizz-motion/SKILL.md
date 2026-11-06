---
name: rudywizz-motion
description: Make cinematic motion-graphics videos from code — kinetic typography, 3D titles, map route animations (world, globe, Turkey's provinces), social templates (lower thirds, captions, chat stories, countdowns, bar chart races, follow CTAs), sepia history docs that draw images as engravings, and full reels from the user's own clips with camera moves, shader transitions, colour grades and film effects. Use whenever the user asks for an animated video, reel, short, intro, title card, lyric video, captions, lower third, map animation, data animation, history/documentary video or a motion graphic.
---

# rudywizz-motion

A deterministic renderer: every frame is computed (headless Chromium + WebGL2) and piped to ffmpeg,
so the same input always gives the same video. This folder is self-contained:

```
engine/      cli.mjs (entry), host.js, timeline.js, camera.js, gl/ (shaders), data/ (maps), fonts/
styles/      one folder per style (style.js)
templates/   ready-made compositions (JSON)
assets/demo/ original demo illustrations (CC0)
```

## 1. One-time setup (check before the first render)

```bash
RM="${CLAUDE_SKILL_DIR}"                       # the folder that contains this SKILL.md
[ -f "$RM/engine/cli.mjs" ] || RM=$(ls -dt "${CLAUDE_PLUGIN_ROOT}/skills/rudywizz-motion" ~/.claude/plugins/cache/*/rudywizz-motion/*/skills/rudywizz-motion ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion 2>/dev/null | head -1)
TMP=$(node -p "require('os').tmpdir()")       # a temp dir bash and Node agree on (also on Windows)
cd "$RM" && npm install --no-audit --no-fund   # installs playwright (the only dependency)
node engine/cli.mjs doctor                    # Node ✓ ffmpeg ✓ browser ✓ WebGL2 ✓ — each ✗ prints its fix
```
Run renders from the user's folder with `node "$RM/engine/cli.mjs" …` so relative paths resolve there.
If the browser check fails: `npx playwright install chromium` (or set `RM_CHROME=/path/to/chrome`).
If ffmpeg is missing, tell the user how to install it (macOS `brew install ffmpeg`, Windows `winget install ffmpeg`, Linux `apt install ffmpeg`).

## 2. Pick the shape of the job

| User wants | Do this |
|---|---|
| One animated text/title | `render <style> --text "…"` |
| A map / route animation | `render map-route --set 'route=["İstanbul","Konya"]'` |
| Their image drawn as an engraving | `render image --image photo.jpg --look engrave --grade sepia --film 0.6` |
| Camera moves on their clip | `render clip --clip in.mp4 --camera handheld --set speed='"ramp-mid"'` |
| A transparent overlay for their editor (lower third, captions, CTA) | `render lower-third --text "Name / Role" --alpha --out name.mov` |
| A multi-scene reel / doc / teaser / intro | `init reel.json` or start from a template, then edit (section 4) |

Templates: `node engine/cli.mjs templates` lists them all with a one-line description.
Copy one next to the user's assets (`cp "$RM/templates/<name>.json" .`), edit texts/paths, render it.

## 3. Workflow (always)

1. Decide style(s), text, format (default 9:16 1080×1920), camera, grade.
2. **Check stills first** — cheap and catches layout problems:
   `node "$RM/engine/cli.mjs" still <style|comp.json> --at 2.5 --size 540 --out "$TMP/check.png"` → open the PNG and look at it. Check 2–3 moments (start, middle, end of each scene). Read any `warning`/`error` lines: they name typos and suggest the right key.
3. Render: `node engine/cli.mjs render … --out out.mp4`
4. Verify: `ffprobe -v error -show_entries format=duration -of csv=p=0 out.mp4` and grab a frame or two.
5. Deliver the file with one line of context.

Rules of thumb
- Short text wins: 1–6 words per line, max ~4 lines. Use `" / "` or `\n` for line breaks.
- Turkish casing is automatic when the text has ğ/ş/ı/İ; otherwise pass `--lang tr` for Turkish text (i → İ).
- Renders are CPU-heavy: ~0.2–0.5 s per 1080p frame. Preview at `--size 540` and do the final at 1080.
- Never download images/clips from the web without the user's say-so; use their files.
- Transparent overlays: `--alpha --out file.mov` (ProRes 4444) or `.webm`.
- Music: `--audio song.mp3` and `--bpm N` so `beat-cut`, `lyric-video` and the `beat-punch` camera hit the beat.

## 4. Composition JSON

```json
{
  "format": "9:16",
  "lang": "tr",
  "bpm": 96,
  "audio": "song.mp3",
  "look": { "grade": "teal-orange", "bloom": 0.3, "grain": 0.05, "leak": 0.2, "aberration": 0.3,
            "vignette": 0.3, "film": 0, "weave": 0, "distortion": 0 },
  "motionBlur": 1,
  "scenes": [
    { "style": "map-route", "route": ["İstanbul", "Kapadokya"], "duration": 6, "camera": "drift",
      "transition": { "type": "whip", "duration": 0.45, "dir": "left" } },
    { "clip": "beach.mp4", "in": 3.2, "duration": 2.5, "speed": "ramp-mid", "camera": "handheld",
      "overlay": { "style": "captions", "text": "Kaş, Antalya" },
      "transition": { "type": "burn", "duration": 0.8 } },
    { "image": "portrait.jpg", "look": { "type": "engrave", "reveal": 3 }, "duration": 4, "camera": "push-in" },
    { "style": "neon-sign", "text": "See you / soon", "duration": 3 }
  ],
  "overlays": [ { "style": "captions", "text": "…", "from": 0, "to": 5 } ]
}
```
- Scene types: `style` (any style id + its options), `image` (`image` path, or `layers: [{src, depth}]` for 2.5D parallax), `clip` (`clip`, `in`, `speed`: number | `ramp-in` | `ramp-out` | `ramp-mid`), `color`.
- Paths are relative to the JSON file.
- `transition` sits on the scene it leaves. The next scene starts `duration` seconds before this one ends.
- `overlay` = a style drawn on top of that scene (moves with its camera). `overlays` = fixed on top of everything, ungraded.
- Camera: preset name or `{ "preset": "drift", "amount": 0.6, "shake": 0.5, "keys": [{ "at": 0, "zoom": 1 }, { "at": 1, "zoom": 1.3, "ease": "outExpo" }] }`.

## 5. Catalogue

**Cameras** — `static, drift, push-in, pull-out, punch-in, crash-zoom, whip-from-left, whip-from-right, whip-from-top, spin-in, rise, orbit, tilt-reveal, tilt-left, tilt-right, vertigo, handheld, float, beat-punch`. Camera motion is motion-blurred automatically.

**Transitions** — `cut, fade, flash, dip, whip, zoom, spin, glitch, ink, burn, liquid, iris, wipe, blinds, pixelate, leak, cube, ripple, doors, stretch, luma`.

**Looks** (images/clips) — `engrave` (ink draws on → hatching → sepia wash), `sketch`, `oldphoto`, `duotone`, `halftone`, `posterize`, `noir`. Options: `{ "type": "engrave", "reveal": 3, "delay": 0.2, "paper": "#ece0c4", "ink": "#33210f" }`.

**Grades** — `none, teal-orange, kodak, fuji, sepia, noir, bleach, cyber, sunset, matte` (+ `gradeAmount` 0–1).

**Styles** — run `node engine/cli.mjs list` for the live list. Each style's options are documented at the top of `styles/<id>/style.js` (`defaults` + `options`).

| Style | What it does | Key options |
|---|---|---|
| map-route | Route flight on globe / flat map / Turkey provinces, pins + labels | `route`, `mode` globe·flat·turkey·auto, `theme` dark·atlas·light, `icon`, `highlight` |
| history-title | Gilded year counter + chapter title | text `"1453 / Title / Subtitle"`, `from` |
| parchment-letter | Burnt parchment, handwriting + quill + wax seal | `place`, `signature`, `seal` |
| murmuration | Starling flock folds into the words | `birds`, sky colours |
| led-marquee | Shop/minibus LED "kayan yazı" boards | one board per line, `colors` |
| receipt | Thermal printer prints the message, tears off | `header`, `items`, `total`, `date` |
| ink-bleed | Ink drops spread into the letters | `ink`, `paper` |
| halftone-press | Two-colour risograph print | `inkA`, `inkB`, `dot` |
| signal-tune | Old TV: snow → test card → on air | `channel`, `station` |
| inflate | Y2K chrome balloon letters | `chrome`, `face` |
| orbit-ring | Text rings around a planet | one ring per line |
| beat-cut | One stamped word per beat, Swiss poster | `bpm`, `offset` |
| lyric-video | Lyrics light up word by word on the beat | `bpm`, `times`, `credit` |
| captions | Reel captions, active word on a pill (use `--alpha`) | `times`, `maxWords`, `pill`, `position` |
| split-flap | Departures board flips (Turkish drum) | `title`, `cols` |
| neon-sign | Neon tubes on brick, one faulty | `colors`, `broken` |
| odometer | Rolling digits count to a number | text `"10000 takipçi"`, `prefix`, `suffix` |
| pixel-quest | 8-bit title screen | `pixel`, `subtitle` |
| vhs-memory | Home-video tape look | `date`, `clock` |
| **Kinetic type** | | |
| word-stack | Justified poster stack, each line slams in full-width | `accent`, `beat`, `kicker` |
| typewriter | Types key by key with a blinking cursor | `theme` paper·terminal, `speed`, `prompt` |
| scramble | Random glyphs decode into the text | `font` mono·display, `resolve`, `hud` |
| ticker-rows | Giant rows scroll in alternating directions | `rows`, `tilt`, `speed`, `accent` |
| highlight-quote | Quote fades in, a marker sweeps the key words | `author`, `highlight` (words), `marker` |
| glitch-title | RGB split + datamosh settle into a clean title | `subtitle`, `colors`, `every` |
| **3D** | | |
| extrude-3d | Chunky extruded letters swing in and turn | `face`, `side`, `bg`, `depth` |
| cube-spin | Cube turns face to face, one line per face | `colors`, `ink`, `floor` |
| text-tunnel | Fly through rings of text to the title | line 1 = title, `rings`, `ring`, `colors` |
| retro-grid | Synthwave grid, striped sun, chrome title | line 1 chrome, rest script, `sky`, `sun`, `speed` |
| particle-sphere | Particle sphere morphs into the words | `count`, `morphAt`, `colors` |
| card-carousel | 3D ring of cards lands on the last line | `images` (local files), `turns`, `colors` |
| **Social & broadcast** | | |
| countdown | 3·2·1 with ring sweeps, then the text | `from`, `tick`, `accent` |
| lower-third | News/YouTube name strap (use `--alpha`) | line 1 name, line 2 role, `theme` solid·glass·minimal, `position` |
| chat-story | Messaging chat with typing dots | one message per line, `>` = me, `name`, `theme` |
| bar-chart | Bar chart race, values count up | `items: [["A",10],…]`, `unit`, `note`, `source` |
| cta-follow | Cursor clicks Follow, check + confetti | line 1 handle, line 2 button, line 3 subtitle, `done` |

Style options go in `--set key=value` (JSON values: `--set 'route=["A","B"]'`) or as keys of the scene object.

## 6. Troubleshooting
- `unknown place "X"` (map-route): use `"lat,lon"` or `{ "name": "X", "lat": 0, "lon": 0 }`.
- Text clipped by a camera move: lower the camera `amount` or use `drift`/`float`.
- Slow renders: `--size 540` for drafts. Avoid `--motion-blur` above 4 unless the user wants the best quality.
- Output white/empty: run `still` and read the error; `doctor` checks WebGL2.
- Windows PowerShell / cmd mangle `--set 'route=["A","B"]'`: write the options to a file and use `--params opts.json`, or use a composition JSON.
- English text that contains a Turkish name (ı, ş…) gets Turkish casing automatically; pass `--lang en` to stop that.
