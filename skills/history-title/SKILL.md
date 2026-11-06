---
name: history-title
description: History Title — Documentary chapter card: gilded year counter + title. Renders a video with the rudywizz-motion engine. Use when the user types /history-title or asks for this look.
argument-hint: "<text>"
---

# /history-title — History Title

Documentary chapter card: gilded year counter + title.

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Render (the user's text goes in `--text`; default "1071 / Bir Kapı Aralanıyor / Anadolu’nun eşiğinde"):

```bash
node "$RM/engine/cli.mjs" still history-title --text "$ARGUMENTS" --at 4 --size 540 --out /tmp/history-title-check.png   # look first
node "$RM/engine/cli.mjs" render history-title --text "$ARGUMENTS" --out history-title.mp4
```

Options (`--set key=value`, JSON values allowed):
- `text` — "<year> / <title> / <subtitle>" — year optional (e.g. "1453", "MÖ 330")
- `from` — Year the counter starts from (default: year − 120)
- `gold` — Three-stop gold gradient for the year

Combine freely with `--camera`, `--grade`, `--bloom`, `--leak`, `--film`, `--format 1:1|4:5|16:9`, `--audio`, `--alpha --out x.mov`.
