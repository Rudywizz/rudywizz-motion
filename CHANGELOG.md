# Changelog

All notable changes to this project. Versions follow [Semantic Versioning](https://semver.org).

## Unreleased

### Added
- **6 new templates** for the videos people make most: `black-friday`, `new-year`, `youtube-outro`, `birthday`, `save-the-date`, `podcast-clip`.
- `promo/`: the launch videos (YouTube 16:9, Instagram reel in Turkish, English Short), rendered by rudywizz-motion itself.
- Project website with a filterable live gallery (GitHub Pages, built by `npm run site`).
- Logo (light and dark) in the README.
- **Story styles:** `story-3d` (toy-like 3D characters with a virtual director; `finish` vinyl · clay stop motion · toy bricks) and `doodle-story` (hand-drawn boiling ink, 34 emotions).
- **`presenter`:** your own pixel mascot (a folder of layer PNGs + `rig.json`) or Bit, the built-in robot, hosts any video: lip-synced to your voice lines, blinking, posing, speech bubbles.
- **Voice lines:** `voices` (story styles) and `lines[].voice` (presenter) — each line lasts as long as its audio, mouths follow its loudness and the render mixes the audio in.
- **Code-made music:** `--music <mood>` / `"music"` in a composition (`upbeat`, `chill`, `retro`, `cinematic`) synthesises an original, royalty-free track (drums, bass, pads, arpeggios and a hook; no samples) exactly as long as the video. Voice lines duck it. `rudywizz-motion music <mood>` writes it as a .wav.
- **World maps:** `map-route` now zooms into any country with its states or provinces (`mode: "country"`, auto-detected), finds cities, regions and countries in ~25 languages ("München", "Londres", "Viyana") and takes `"City, Country"` / `"City, State"` to pick between namesakes.

### Fixed
- `map-route` labels used Turkish capitalisation for every language ("PARİS"); they now follow the composition language.
- A scene's own `lang` now wins over the composition's `lang` (mixed-language videos, e.g. an English command inside a Turkish reel).

### Changed
- With voice lines, music (yours or generated) now dips while someone speaks instead of playing at a fixed 35%.
- CI installs ffmpeg with the OS package manager instead of a third-party action.

## 2.1.0 — 2026-11

### Added
- **17 new styles**
  - Kinetic typography: `word-stack`, `typewriter`, `scramble`, `ticker-rows`, `highlight-quote`, `glitch-title`
  - 3D: `extrude-3d`, `cube-spin`, `text-tunnel`, `retro-grid`, `particle-sphere`, `card-carousel`
  - Social & broadcast: `countdown`, `lower-third`, `chat-story`, `bar-chart`, `cta-follow`
- **New templates:** `kinetic-promo`, `quote-card`, `stats-recap`, `chat-reel`, `youtube-intro`, `event-countdown`, `showreel`, `3d-title`
- `rudywizz-motion init` writes a starter composition.
- `--version`, `--strict`, animated `.webp` output.
- A JSON Schema for compositions, so your editor autocompletes styles, options, cameras and transitions.
- `api.breakLongWords` helper: words too long for the frame are hyphenated instead of shrinking to a hairline.
- Smoke tests (`npm test`) and CI on Linux, Windows and macOS; CodeQL and Dependabot.
- `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue forms, PR template, `THIRD_PARTY_NOTICES.md`.

### Changed
- Typos now fail with a "did you mean" hint (style, template, camera, transition, look, grade, scene key, style option, CLI flag) instead of rendering a black scene or a plain fade.
- Numeric flags are range-checked.
- `doctor` checks Node, ffmpeg, Playwright, the browser and WebGL2 separately and prints a fix for each failure.
- The local render server is bound to 127.0.0.1 and every URL carries a random per-run token. The composition is served as a file instead of being put in the URL, so `preview` never passes your text through a shell.
- Agent skills find the engine through `${CLAUDE_SKILL_DIR}` / the plugin cache. They use the OS temp folder, so previews also work on Windows.
- The gallery uses animated WebP (about 6× smaller than the old GIFs).
- `LICENSE` is now the plain MIT text, so GitHub detects it; third-party notices moved to `THIRD_PARTY_NOTICES.md`.

### Fixed
- `inflate`, `pixel-quest` and `history-title` no longer overflow, or become unreadable, with very long words.
- `map-route` labels stay inside the frame while their pin is on screen.
- ffmpeg exiting early no longer crashes the CLI with `EPIPE`.
- `--size abc` no longer crashes with a stack trace.

## 2.0.0 — 2026-11

First public release: WebGL2 compositor with camera moves, 20 shader transitions, colour grades and film effects; 19 styles; map routes (globe, world, Turkey); history pack; image and clip scenes; 5 templates; Claude Code plugin.
