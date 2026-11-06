---
name: map-route
description: Map Route — Fly a route across a globe, world map or Turkey; pins + labels. Renders a video with the rudywizz-motion engine. Use when the user types /map-route or asks for this look.
argument-hint: "<text>"
---

# /map-route — Map Route

Fly a route across a globe, world map or Turkey; pins + labels.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default ""):

```bash
node "$RM/engine/cli.mjs" still map-route --text "$ARGUMENTS" --at 5 --size 540 --out /tmp/map-route-check.png   # look first
node "$RM/engine/cli.mjs" render map-route --text "$ARGUMENTS" --out map-route.mp4
```

Options (`--set key=value`, JSON values allowed):
- `route` — Array of places: names (Turkish ok), "lat,lon" strings or {name, lat, lon}
- `mode` — globe | flat | turkey | auto
- `theme` — dark | atlas | light
- `icon` — plane | ship | dot | auto
- `highlight` — Countries (e.g. "Türkiye", "Italy") or provinces to tint
- `text` — Optional title at the top
- `labels` — Show place labels (true/false)

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
