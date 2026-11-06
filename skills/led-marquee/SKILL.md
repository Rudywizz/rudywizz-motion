---
name: led-marquee
description: LED Marquee — Corner-shop scrolling LED signs ("kayan yazı"). Renders a video with the rudywizz-motion engine. Use when the user types /led-marquee or asks for this look.
argument-hint: "<text>"
---

# /led-marquee — LED Marquee

Corner-shop scrolling LED signs ("kayan yazı").

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "Hoş geldiniz / Open 24/7 / Çay · Kahve · Tost"):

```bash
node "$RM/engine/cli.mjs" still led-marquee --text "$ARGUMENTS" --at 4 --size 540 --out /tmp/led-marquee-check.png   # look first
node "$RM/engine/cli.mjs" render led-marquee --text "$ARGUMENTS" --out led-marquee.mp4
```

Options (`--set key=value`, JSON values allowed):
- `text` — One board per line (split with " / " or new lines, max 4)
- `colors` — LED colour per board (array of hex)
- `cols` — LED columns per board (wider = smaller dots)

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
