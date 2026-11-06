---
name: ink-bleed
description: Ink Bleed — Ink drops land, spread and merge into the words. Renders a video with the rudywizz-motion engine. Use when the user types /ink-bleed or asks for this look.
argument-hint: "<text>"
---

# /ink-bleed — Ink Bleed

Ink drops land, spread and merge into the words.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "Slow / is / smooth"):

```bash
node "$RM/engine/cli.mjs" still ink-bleed --text "$ARGUMENTS" --at 4 --size 540 --out /tmp/ink-bleed-check.png   # look first
node "$RM/engine/cli.mjs" render ink-bleed --text "$ARGUMENTS" --out ink-bleed.mp4
```

Options (`--set key=value`, JSON values allowed):
- `paper` — Paper colour
- `ink` — Ink colour
- `splatter` — Small satellite splashes around each drop (true/false)

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
