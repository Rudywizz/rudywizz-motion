---
name: murmuration
description: Murmuration — A starling flock folds into your words. Renders a video with the rudywizz-motion engine. Use when the user types /murmuration or asks for this look.
argument-hint: "<text>"
---

# /murmuration — Murmuration

A starling flock folds into your words.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "Flock together"):

```bash
node "$RM/engine/cli.mjs" still murmuration --text "$ARGUMENTS" --at 4 --size 540 --out /tmp/murmuration-check.png   # look first
node "$RM/engine/cli.mjs" render murmuration --text "$ARGUMENTS" --out murmuration.mp4
```

Options (`--set key=value`, JSON values allowed):
- `birds` — Number of birds (1000–5000)
- `skyTop` — Sky colour at the top
- `skyMid` — Sky colour in the middle
- `skyLow` — Sky colour at the horizon
- `bird` — Bird colour

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
