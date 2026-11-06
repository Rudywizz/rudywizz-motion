---
name: countdown
description: Countdown — Punchy 3·2·1 with a sweeping ring, then your words land. Renders a video with the rudywizz-motion engine. Use when the user asks for this look by name.
argument-hint: "<text>"
---

# Countdown

Punchy 3·2·1 with a sweeping ring, then your words land.

Find the engine (the sibling `rudywizz-motion` skill folder) and a temp folder both bash and Node agree on:

```bash
RM="${CLAUDE_SKILL_DIR}/../rudywizz-motion"
[ -f "$RM/engine/cli.mjs" ] || RM=$(ls -dt "${CLAUDE_PLUGIN_ROOT}/skills/rudywizz-motion" ~/.claude/plugins/cache/*/rudywizz-motion/*/skills/rudywizz-motion ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion 2>/dev/null | head -1)
TMP=$(node -p "require('os').tmpdir()")
(cd "$RM" && node -e "require.resolve('playwright')" 2>/dev/null) || (cd "$RM" && npm install --no-audit --no-fund)   # first run only
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.
Put the user's text in **single quotes** (write `'\''` for an apostrophe inside it) so the shell never interprets it.

Render (the user's text — `$ARGUMENTS` — goes in `--text`; default "Here / we go"):

```bash
node "$RM/engine/cli.mjs" still countdown --text '<text>' --at 3 --size 540 --out "$TMP/countdown-check.png"   # look at it first
node "$RM/engine/cli.mjs" render countdown --text '<text>' --out countdown.mp4
```

Options (`--set key=value`, JSON values allowed):
- `from` — Number to count down from (1–9)
- `tick` — Seconds per number
- `accent` — Ring, flash and underline colour
- `ink` — Number and text colour
- `bg` — Background colour

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
