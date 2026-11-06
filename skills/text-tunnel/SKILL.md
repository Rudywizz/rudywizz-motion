---
name: text-tunnel
description: Text Tunnel — Fly down a tunnel built from rings of your words, arrive on the title. Renders a video with the rudywizz-motion engine. Use when the user asks for this look by name.
argument-hint: "<text>"
---

# Text Tunnel

Fly down a tunnel built from rings of your words, arrive on the title.

Find the engine (the sibling `rudywizz-motion` skill folder) and a temp folder both bash and Node agree on:

```bash
RM="${CLAUDE_SKILL_DIR}/../rudywizz-motion"
[ -f "$RM/engine/cli.mjs" ] || RM=$(ls -dt "${CLAUDE_PLUGIN_ROOT}/skills/rudywizz-motion" ~/.claude/plugins/cache/*/rudywizz-motion/*/skills/rudywizz-motion ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion 2>/dev/null | head -1)
TMP=$(node -p "require('os').tmpdir()")
(cd "$RM" && node -e "require.resolve('playwright')" 2>/dev/null) || (cd "$RM" && npm install --no-audit --no-fund)   # first run only
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.
Put the user's text in **single quotes** (write `'\''` for an apostrophe inside it) so the shell never interprets it.

Render (the user's text — `$ARGUMENTS` — goes in `--text`; default "Deeper / into the signal"):

```bash
node "$RM/engine/cli.mjs" still text-tunnel --text '<text>' --at 4 --size 540 --out "$TMP/text-tunnel-check.png"   # look at it first
node "$RM/engine/cli.mjs" render text-tunnel --text '<text>' --out text-tunnel.mp4
```

Options (`--set key=value`, JSON values allowed):
- `colors` — Ring colours, alternating (array of hex)
- `ink` — Title colour
- `bg` — Background colour
- `rings` — Number of rings (10–60)
- `ring` — Text repeated on the rings (default: all lines)

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
