# Hexicon content counts

Purpose: give the homepage and Hexicon page a shared, concrete overview of build variety beside the native cast hero. Values live in `src/data/hexicon-stats.json`; both placements use `HexiconStats.astro`.

Verified against `PocketPowered/hexicon` main at `de9a81c4f205e1995c7ec51fd215b6897f246ebd`.

- **86 relics:** catalog relics in the default expansion, excluding `wordplay.gd`'s retired Balanced Scales, Tree Ring, and Rescue Bell. Includes unlockable relics.
- **28 items:** `catalog.item_pool` for the default expansion.
- **11 rune enhancements:** eight non-Porcelain types and three independently offered conditions (Shiny, Sturdy, Fleeting), matching `generation.effects` for current rules. Fragile is part of Crystal's risk, not a separate current enhancement offer. Individual run eligibility can narrow the pool.
- **10 characters:** all entries in `pouches-v1.json`, including unlockable characters.

Refresh when the active catalog, default expansion, retired relic list, enhancement generation rules, or character roster changes. Count current playable content, not legacy-only definitions. Update this source revision with the counts. Do not advertise combinatorial totals as playable content counts.

Screenshots document desktop and mobile placement outside the gameplay frame.

Verification: all 35 existing tests passed; Astro check reported zero errors and warnings (four existing hints). Production build and generated-link validation passed for 13 pages. Browser checks on both pages at 1440, 390 and 320 pixels confirmed all four counts and no horizontal overflow. Mobile placement was visually inspected.
