---
name: particle-sphere
description: Particle Sphere — A spinning sphere of glowing particles morphs into your words. Renders a video with the rudywizz-motion engine. Use when the user asks for this look by name.
argument-hint: "<text>"
---

# Particle Sphere

A spinning sphere of glowing particles morphs into your words.

Find the engine (the sibling `rudywizz-motion` skill folder) and a temp folder both bash and Node agree on:

```bash
RM="${CLAUDE_SKILL_DIR}/../rudywizz-motion"
[ -f "$RM/engine/cli.mjs" ] || RM=$(ls -dt "${CLAUDE_PLUGIN_ROOT}/skills/rudywizz-motion" ~/.claude/plugins/cache/*/rudywizz-motion/*/skills/rudywizz-motion ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion 2>/dev/null | head -1)
TMP=$(node -p "require('os').tmpdir()")
(cd "$RM" && node -e "require.resolve('playwright')" 2>/dev/null) || (cd "$RM" && npm install --no-audit --no-fund)   # first run only
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.
Put the user's text in **single quotes** (write `'\''` for an apostrophe inside it) so the shell never interprets it.

Render (the user's text — `$ARGUMENTS` — goes in `--text`; default "Ideas / take shape"):

```bash
node "$RM/engine/cli.mjs" still particle-sphere --text '<text>' --at 4 --size 540 --out "$TMP/particle-sphere-check.png"   # look at it first
node "$RM/engine/cli.mjs" render particle-sphere --text '<text>' --out particle-sphere.mp4
```

Options (`--set key=value`, JSON values allowed):
- `colors` — Particle colours, blended left → right (array of hex)
- `bg` — Background colour, or [centre, edge] gradient
- `count` — Number of particles (800–8000)
- `morphAt` — Second at which the sphere starts turning into text

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
