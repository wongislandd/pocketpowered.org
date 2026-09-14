# Character choice refresh — September 13, 2026

Purpose: show that characters change how a run starts. Native Bumble / Beekeeper setup screen at 390×844, seed 12, normal text, reduced motion, isolated save and curated unlocks. Shows quantity badges, story card, pagination and Begin. Captured from UI commit 5538f7c; the manifest records its full hash.

Recapture: `godot --path godot --script res://../tools/art/capture_marketing.gd -- --character-only`. Frame with `node tools/art/render_marketing.cjs --character-refresh` (Playwright and Sharp required). No marketing text overlays the native screenshot.

`source/01-character.png` is the untouched native capture. `campaign/02-characters.png` is the framed sharing card. `overview.png` and the distribution ZIP combine this refresh with the seven unchanged September cards; their older provenance remains in the inherited manifest. The combat hero and social composition contain no character selector and were retained.
