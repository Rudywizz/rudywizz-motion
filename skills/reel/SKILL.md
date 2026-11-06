---
name: reel
description: Director mode — turn the user's clips, photos, places and lines into a finished vertical reel with camera moves, shader transitions, captions, maps and a colour grade, rendered by rudywizz-motion. Use when the user types /reel or asks to edit/montage a reel or short from their footage.
argument-hint: "<what the reel should be> [files…]"
---

# /reel — composition director

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

1. Collect inputs: the user's clips/images (paths), places, text lines, music + BPM, target length (default 15 s), format (default 9:16).
2. Plan an edit on paper first — 4–8 scenes, 1.5–3.5 s each for clips; hook in the first second; one idea per scene.
3. Write `reel.json` next to the assets (schema: section 4 of `$RM/SKILL.md`). Good defaults:
   - clips: `camera: "handheld"` or `"punch-in"`, `speed: "ramp-mid"` on the hero shot
   - transitions: `whip` between energetic shots, `zoom` into reveals, `leak`/`burn` for mood changes, `glitch` on beats
   - text: `captions` overlay on clips; a style scene (`neon-sign`, `inflate`, `beat-cut`…) as opener or closer
   - places: a `map-route` scene as the intro
   - look: `teal-orange` (travel), `kodak` (warm lifestyle), `cyber` (music), `sepia` + `film` (history)
4. Check stills at the middle of each scene (`still reel.json --at <t> --size 540`), fix, then `render reel.json --out reel.mp4` (add `--audio`).
5. Verify duration with ffprobe and deliver.
