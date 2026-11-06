---
name: rudywizz-motion
description: Make cinematic motion-graphics videos from code — kinetic text styles, map route animations (world, globe, Turkey's provinces), sepia history docs that draw images as engravings, and full reels from the user's own clips with camera moves, shader transitions, colour grades and film effects. Use whenever the user asks for an animated video, reel, title card, lyric video, captions, map animation, history/documentary video or a motion graphic.
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
cd <this folder>          # the folder that contains this SKILL.md
npm install               # installs playwright (only dependency)
node engine/cli.mjs doctor   # ffmpeg ✓, browser ✓, WebGL2 ✓
```
If the browser check fails: `npx playwright install chromium` (or set `RM_CHROME=/path/to/chrome`).
If ffmpeg is missing, tell the user how to install it (macOS `brew install ffmpeg`, Windows `winget install ffmpeg`, Linux `apt install ffmpeg`).

## 2. Pick the shape of the job

| User wants | Do this |
|---|---|
| One animated text/title | `render <style> --text "…"` |
| A map / route animation | `render map-route --set 'route=["İstanbul","Konya"]'` |
| Their image drawn as an engraving | `render image --image photo.jpg --look engrave --grade sepia --film 0.6` |
| Camera moves on their clip | `render clip --clip in.mp4 --camera handheld --set speed='"ramp-mid"'` |
| A multi-scene reel / doc / teaser | write a composition JSON (section 4) or start from a template |

Templates: `node engine/cli.mjs templates` → `history-short`, `travel-reel`, `lyric-teaser`, `launch`, `tour`.
Copy one next to the user's assets, edit texts/paths, render it.

## 3. Workflow (always)

1. Decide style(s), text, format (default 9:16 1080×1920), camera, grade.
2. **Check stills first** — cheap and catches layout problems:
   `node engine/cli.mjs still <style|comp.json> --at 2.5 --size 540 --out /tmp/check.png` → open the PNG and look at it. Check 2–3 moments (start, middle, end of each scene).
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

Style options go in `--set key=value` (JSON values: `--set 'route=["A","B"]'`) or as keys of the scene object.

## 6. Troubleshooting
- `unknown place "X"` (map-route): use `"lat,lon"` or `{ "name": "X", "lat": 0, "lon": 0 }`.
- Text clipped by a camera move: lower the camera `amount` or use `drift`/`float`.
- Slow renders: `--size 540` for drafts. Avoid `--motion-blur` above 4 unless the user wants the best quality.
- Output white/empty: run `still` and read the error; `doctor` checks WebGL2.
