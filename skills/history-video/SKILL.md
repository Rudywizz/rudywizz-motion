---
name: history-video
description: Sepia documentary pack — year title cards, antique atlas route maps, the user's portraits/paintings drawn as engravings, handwritten letters with wax seals, old-film grade. Use when the user types /history-video or wants a history / documentary style video or reel.
argument-hint: "<topic, year, places, images…>"
---

# /history-video — documentary pack

Find the engine (it is the sibling `rudywizz-motion` skill folder):

```bash
RM=$(ls -d "${CLAUDE_PLUGIN_ROOT:-/nonexistent}/skills/rudywizz-motion" ~/.claude/skills/rudywizz-motion .claude/skills/rudywizz-motion ../rudywizz-motion 2>/dev/null | head -1)
```
Read `$RM/SKILL.md` once for setup, the workflow (check stills → render → verify) and the full catalogue.

Start from `$RM/templates/history-short.json` and adapt it:

| Beat | Scene |
|---|---|
| Date + title | `{ "style": "history-title", "text": "1071 / Malazgirt / Anadolu'nun kapısı" }` |
| Where | `{ "style": "map-route", "theme": "atlas", "route": ["Malazgirt", "Konya"], "camera": "tilt-reveal" }` |
| Who | `{ "image": "<user's portrait or painting>", "look": { "type": "engrave", "reveal": 3 }, "camera": "push-in" }` |
| Voice | `{ "style": "parchment-letter", "text": "…", "place": "…, 1897", "signature": "…", "seal": "…" }` |

Global look: `{ "grade": "sepia", "film": 0.6, "weave": 1, "grain": 0.07, "vignette": 0.5 }`; transitions `burn`, `ink`, `leak`.
Images should be the user's own or public-domain works; the engrave look works best on portraits with clear light and shadow.
Keep facts as the user gives them — do not invent dates or quotes.
