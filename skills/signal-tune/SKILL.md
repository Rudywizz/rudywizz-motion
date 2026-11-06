---
name: signal-tune
description: Signal Tune — Old TV finds the channel: snow, test card, on air. Renders a video with the rudywizz-motion engine. Use when the user types /signal-tune or asks for this look.
argument-hint: "<text>"
---

# /signal-tune — Signal Tune

Old TV finds the channel: snow, test card, on air.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "Now / on air"):

```bash
node "$RM/engine/cli.mjs" still signal-tune --text "$ARGUMENTS" --at 4 --size 540 --out /tmp/signal-tune-check.png   # look first
node "$RM/engine/cli.mjs" render signal-tune --text "$ARGUMENTS" --out signal-tune.mp4
```

Options (`--set key=value`, JSON values allowed):
- `channel` — Channel number shown in the green OSD
- `station` — Label on the test card
- `screen` — On-air background colour
- `bezel` — TV body colour

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
