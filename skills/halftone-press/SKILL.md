---
name: halftone-press
description: Halftone Press — Two-colour risograph print, rolled on dot by dot. Renders a video with the rudywizz-motion engine. Use when the user types /halftone-press or asks for this look.
argument-hint: "<text>"
---

# /halftone-press — Halftone Press

Two-colour risograph print, rolled on dot by dot.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "Print / is not / dead"):

```bash
node "$RM/engine/cli.mjs" still halftone-press --text "$ARGUMENTS" --at 4 --size 540 --out /tmp/halftone-press-check.png   # look first
node "$RM/engine/cli.mjs" render halftone-press --text "$ARGUMENTS" --out halftone-press.mp4
```

Options (`--set key=value`, JSON values allowed):
- `inkA` — First ink (type)
- `inkB` — Second ink (sun + offset shadow)
- `dot` — Halftone cell size in px at 1080 wide
- `caption` — Small print at the bottom ("" to hide)

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
