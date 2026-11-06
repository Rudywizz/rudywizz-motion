---
name: bar-chart
description: Bar Chart Race — Race-style bar chart: bars overtake, values count up, axis rescales. Renders a video with the rudywizz-motion engine. Use when the user asks for this look by name.
argument-hint: "<text>"
---

# Bar Chart Race

Race-style bar chart: bars overtake, values count up, axis rescales.

Find the engine (the sibling `rudywizz-motion` skill folder) and a temp folder both bash and Node agree on:

```bash
RM="${CLAUDE_SKILL_DIR}/../rudywizz-motion"
[ -f "$RM/engine/cli.mjs" ] || RM=$(ls -dt "${CLAUDE_PLUGIN_ROOT}/skills/rudywizz-motion" ~/.claude/plugins/cache/*/rudywizz-motion/*/skills/rudywizz-motion ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion 2>/dev/null | head -1)
TMP=$(node -p "require('os').tmpdir()")
(cd "$RM" && node -e "require.resolve('playwright')" 2>/dev/null) || (cd "$RM" && npm install --no-audit --no-fund)   # first run only
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.
Put the user's text in **single quotes** (write `'\''` for an apostrophe inside it) so the shell never interprets it.

Render (the user's text — `$ARGUMENTS` — goes in `--text`; default "Largest cities in Türkiye"):

```bash
node "$RM/engine/cli.mjs" still bar-chart --text '<text>' --at 4 --size 540 --out "$TMP/bar-chart-check.png"   # look at it first
node "$RM/engine/cli.mjs" render bar-chart --text '<text>' --out bar-chart.mp4
```

Options (`--set key=value`, JSON values allowed):
- `items` — Data: [["Label", value], …] (max 10 rows)
- `unit` — Suffix after each value (e.g. "M", "%", " km")
- `note` — Small line under the title
- `source` — Source credit at the bottom
- `colors` — Bar colours, in item order (array of hex)
- `bg` — Background colour
- `ink` — Text colour

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
