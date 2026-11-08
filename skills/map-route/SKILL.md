---
name: map-route
description: Map Route — Fly a route across a globe, a world map or any country with its states and provinces; pins + labels. Renders a video with the rudywizz-motion engine. Use when the user asks for this look by name.
argument-hint: "<text>"
---

# Map Route

Fly a route across a globe, a world map or any country with its states and provinces; pins + labels.

Find the engine (the sibling `rudywizz-motion` skill folder) and a temp folder both bash and Node agree on:

```bash
RM="${CLAUDE_SKILL_DIR}/../rudywizz-motion"
[ -f "$RM/engine/cli.mjs" ] || RM=$(ls -dt "${CLAUDE_PLUGIN_ROOT}/skills/rudywizz-motion" ~/.claude/plugins/cache/*/rudywizz-motion/*/skills/rudywizz-motion ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion 2>/dev/null | head -1)
TMP=$(node -p "require('os').tmpdir()")
(cd "$RM" && node -e "require.resolve('playwright')" 2>/dev/null) || (cd "$RM" && npm install --no-audit --no-fund)   # first run only
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.
Put the user's text in **single quotes** (write `'\''` for an apostrophe inside it) so the shell never interprets it.

Render (the user's text — `$ARGUMENTS` — goes in `--text`; default ""):

```bash
node "$RM/engine/cli.mjs" still map-route --text '<text>' --at 5 --size 540 --out "$TMP/map-route-check.png"   # look at it first
node "$RM/engine/cli.mjs" render map-route --text '<text>' --out map-route.mp4
```

Options (`--set key=value`, JSON values allowed):
- `route` — Array of places: any city, region or country in ~25 languages, "City, Country" or "City, State" to disambiguate ("Portland, Maine", "Valencia, Venezuela"), "lat,lon" strings or {name, lat, lon}
- `mode` — globe | flat | country (one country with its states/provinces) | auto
- `country` — Country for mode "country" (name in any language or ISO code, e.g. "Japan", "Almanya", "BR"); auto-detected when every stop is in one country
- `theme` — dark | atlas | light
- `icon` — plane | ship | dot | auto
- `highlight` — Countries (any language, e.g. "Türkiye", "Deutschland") or states/provinces to tint
- `text` — Optional title at the top
- `labels` — Show place labels (true/false)

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
