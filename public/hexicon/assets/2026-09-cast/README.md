# PHOENIX hero animation

Purpose: show an actual word being spelled and cast with a developed build. The native game stages PHOENIX, scores five equipped relics, and deals 4,922 damage to defeat the Astral Carillon. Both potion slots are filled; the potions remain held.

Source: Hexicon `5742b8f`, Godot 4.7.2, 390 × 844. Curated valid late-region fixture with isolated save, normal animation speed, five relics, two items, 50 gold and Ember on P. The full native cast is recorded; no interface, scoring effect, or damage value was fabricated. Complete run progression is not shown.

- `phoenix-cast.mp4`: 12.23-second silent web loop, 30 fps, H.264, 804,278 bytes.
- `phoenix-cast.gif`: sharing/download version, 15 fps, 1,601,279 bytes.
- `poster.png`: fully staged PHOENIX for loading and reduced motion.

Keep the feature label, headline and description outside the game screen. The shared hero component offers pause/resume, stops offscreen, and waits for explicit Play with reduced motion. The GIF is a download; the same loop plays as MP4 on the page to reduce transfer size and support pausing.

Retake when rune motion, combat UI, scoring, relic effects or guardian art changes. Keep letters, counters, all five relics, both items, enemy health and the final impact visible. The source scripts and exact scoring/frame manifest are in Hexicon `tools/art/capture_marketing_cast.gd`, `tools/art/encode_marketing_cast.py`, and `art/marketing/2026-09-cast/`.

Recaptured after correcting a one-frame enemy rendering flash during tile placement. `first-frame-fix.png` shows the same native frames before and after. Normal timing and actual scoring are preserved.
