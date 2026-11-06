---
name: retro-grid
description: Retro Grid — 80s synthwave: neon grid floor, striped sun, chrome title. Renders a video with the rudywizz-motion engine. Use when the user asks for this look by name.
argument-hint: "<text>"
---

# Retro Grid

80s synthwave: neon grid floor, striped sun, chrome title.

Find the engine (the sibling `rudywizz-motion` skill folder) and a temp folder both bash and Node agree on:

```bash
RM="${CLAUDE_SKILL_DIR}/../rudywizz-motion"
[ -f "$RM/engine/cli.mjs" ] || RM=$(ls -dt "${CLAUDE_PLUGIN_ROOT}/skills/rudywizz-motion" ~/.claude/plugins/cache/*/rudywizz-motion/*/skills/rudywizz-motion ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion 2>/dev/null | head -1)
TMP=$(node -p "require('os').tmpdir()")
(cd "$RM" && node -e "require.resolve('playwright')" 2>/dev/null) || (cd "$RM" && npm install --no-audit --no-fund)   # first run only
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.
Put the user's text in **single quotes** (write `'\''` for an apostrophe inside it) so the shell never interprets it.

Render (the user's text — `$ARGUMENTS` — goes in `--text`; default "Night drive / side B"):

```bash
node "$RM/engine/cli.mjs" still retro-grid --text '<text>' --at 4 --size 540 --out "$TMP/retro-grid-check.png"   # look at it first
node "$RM/engine/cli.mjs" render retro-grid --text '<text>' --out retro-grid.mp4
```

Options (`--set key=value`, JSON values allowed):
- `sky` — Sky gradient top → horizon (array of 3 hex)
- `sun` — Sun gradient top → bottom (array of 3 hex)
- `grid` — Grid line colour
- `script` — Colour of the script subtitle
- `speed` — Grid scroll speed multiplier

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
