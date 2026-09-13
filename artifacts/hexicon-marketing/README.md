# Hexicon marketing refresh verification

- `before-1440.png`: live PocketPowered Hexicon page before this update.
- `hexicon-1440.png`, `hexicon-390.png`, `hexicon-320.png`: the built replacement page at desktop and phone widths.
- `homepage-feature.png`: updated homepage showcase.
- `browser-checks.json`: checks at 1440, 390 and 320 pixels. No horizontal overflow, broken images or browser script errors. Six feature panels, four regions and all five beta enrollment links present. The primary beta anchor scrolls to the enrollment section.

`npm run check` passed: 35 tests, zero failures; Astro reported zero errors/warnings and four existing hints in the unrelated Resonance files. `npm run build` passed. `npm run validate` checked 13 generated HTML pages and their local links. Visual review covered the desktop page, phone hero, native captures, eight campaign cards, homepage feature and social preview. Existing Android/iPhone enrollment routes were preserved; no store enrollment or new app release was performed.
