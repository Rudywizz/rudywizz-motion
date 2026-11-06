---
name: inflate
description: Inflate — Y2K chrome balloon letters puff up and bounce. Renders a video with the rudywizz-motion engine. Use when the user asks for this look by name.
argument-hint: "<text>"
---

# Inflate

Y2K chrome balloon letters puff up and bounce.

Find the engine (the sibling `rudywizz-motion` skill folder) and a temp folder both bash and Node agree on:

```bash
RM="${CLAUDE_SKILL_DIR}/../rudywizz-motion"
[ -f "$RM/engine/cli.mjs" ] || RM=$(ls -dt "${CLAUDE_PLUGIN_ROOT}/skills/rudywizz-motion" ~/.claude/plugins/cache/*/rudywizz-motion/*/skills/rudywizz-motion ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion 2>/dev/null | head -1)
TMP=$(node -p "require('os').tmpdir()")
(cd "$RM" && node -e "require.resolve('playwright')" 2>/dev/null) || (cd "$RM" && npm install --no-audit --no-fund)   # first run only
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.
Put the user's text in **single quotes** (write `'\''` for an apostrophe inside it) so the shell never interprets it.

Render (the user's text — `$ARGUMENTS` — goes in `--text`; default "Feel / good"):

```bash
node "$RM/engine/cli.mjs" still inflate --text '<text>' --at 4 --size 540 --out "$TMP/inflate-check.png"   # look at it first
node "$RM/engine/cli.mjs" render inflate --text '<text>' --out inflate.mp4
```

Options (`--set key=value`, JSON values allowed):
- `chrome` — Puff ramp from rim to crown (array of hex)
- `face` — Chrome face gradient top→bottom: sky, horizon, ground (array of hex)
- `bgTop` — Background gradient top
- `bgBottom` — Background gradient bottom

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
