---
name: split-flap
description: Split Flap — Mechanical departures board flips into your words. Renders a video with the rudywizz-motion engine. Use when the user types /split-flap or asks for this look.
argument-hint: "<text>"
---

# /split-flap — Split Flap

Mechanical departures board flips into your words.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "Next stop / big ideas / gate 7"):

```bash
node "$RM/engine/cli.mjs" still split-flap --text "$ARGUMENTS" --at 4 --size 540 --out /tmp/split-flap-check.png   # look first
node "$RM/engine/cli.mjs" render split-flap --text "$ARGUMENTS" --out split-flap.mp4
```

Options (`--set key=value`, JSON values allowed):
- `title` — Header above the board ("" to hide)
- `cols` — Columns (0 = fit the longest line)
- `ink` — Letter colour
- `accent` — Colour of the header + last row

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
