---
name: lyric-video
description: Lyric Video — Lyrics light up word by word, pulsing on the beat. Renders a video with the rudywizz-motion engine. Use when the user types /lyric-video or asks for this look.
argument-hint: "<text>"
---

# /lyric-video — Lyric Video

Lyrics light up word by word, pulsing on the beat.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "Gece uzun, şehir susmuyor / Beat’i aç, gerisi bende / Her kare kodla çizildi"):

```bash
node "$RM/engine/cli.mjs" still lyric-video --text "$ARGUMENTS" --at 5 --size 540 --out /tmp/lyric-video-check.png   # look first
node "$RM/engine/cli.mjs" render lyric-video --text "$ARGUMENTS" --out lyric-video.mp4
```

Options (`--set key=value`, JSON values allowed):
- `text` — One lyric line per line (or " / ")
- `bpm` — Tempo for the pulse
- `times` — Array of start seconds, one per line (default: evenly spread)
- `credit` — Small artist/track credit ("" to hide)
- `accent` — Colour of the active word

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
