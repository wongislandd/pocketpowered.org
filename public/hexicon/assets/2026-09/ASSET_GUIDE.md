# Hexicon marketing kit — choose an image by its purpose

Default style: **native screenshot framed by a feature label, benefit headline, and a short description outside the screenshot**. Keep the game UI intact. This is the owner-approved format for future feature images.

## Campaign images

### 01-wordplay — Word combat

- **File:** `campaign/01-wordplay.png`
- **Purpose:** Explain the core hook: spell a word to deal damage.
- **Raw capture:** `source/02-wordplay.png`
- **Retake this state:** Brambleways combat; CHARM staged, C enhanced with Ember, E/L/S held, and three relics equipped.
- **Keep visible:** Enemy, health, staged letters, Damage, Multiplier, relics, and Cast button.
- **Refresh when:** Combat UI, rune art, scoring presentation, or enemy artwork changes.

### 02-characters — Character choice

- **File:** `campaign/02-characters.png`
- **Purpose:** Show that characters change how a run starts.
- **Raw capture:** `source/01-character.png`
- **Retake this state:** Setup page; Bumble / Beekeeper selected and unlocked in the isolated fixture.
- **Keep visible:** Character portrait, name, starting-kit description, and Begin button.
- **Refresh when:** Character art, starting kits, unlock presentation, or selection layout changes.

### 03-journey — The Brambleways — route choices

- **File:** `campaign/03-journey.png`
- **Purpose:** Show branching exploration and the atmosphere of The Brambleways.
- **Raw capture:** `source/map-brambleways.png`
- **Retake this state:** The Brambleways map at the entrance, before choosing the first destination.
- **Keep visible:** Player character, connecting paths, multiple destinations, and inventory.
- **Refresh when:** Map scenery, path layout, encounter icons, or character presentation changes.

### 04-runes — Rune customization

- **File:** `campaign/04-runes.png`
- **Purpose:** Show how players improve their letters and shape a build.
- **Raw capture:** `source/03-runes.png`
- **Retake this state:** Root enhancement target screen with a rune selected, before confirming.
- **Keep visible:** Enhancement description, rune choices, before/after preview, and Enhance button.
- **Refresh when:** Enhancement behavior, tile design, target preview, or selection layout changes.

### 05-relics — Build-making at the shop

- **File:** `campaign/05-relics.png`
- **Purpose:** Show the range of things a player can buy to change a run.
- **Raw capture:** `source/04-shop.png`
- **Retake this state:** Shop with 48 gold, generated stock, equipped relics, and a potion.
- **Keep visible:** Enhancements, runes, relics, packs, items, prices, and purchase controls.
- **Refresh when:** Shop layout, product categories, purchase flow, or item artwork changes.

### 06-mysteries — Optional encounter choice

- **File:** `campaign/06-mysteries.png`
- **Purpose:** Show a concrete discovery and the choice it offers.
- **Raw capture:** `source/05-mystery.png`
- **Retake this state:** The Clear Spring, before selecting its recipe upgrade.
- **Keep visible:** Encounter illustration, situation, reward description, Skip, and disabled positive action.
- **Refresh when:** Encounter art, outcome copy, rewards, or choice controls change.

### 07-bosses — Moonbell Heights — guardian combat

- **File:** `campaign/07-bosses.png`
- **Purpose:** Show Astral Carillon as the regional climax and a distinct combat challenge.
- **Raw capture:** `source/boss-moonbell_heights.png`
- **Retake this state:** Moonbell Heights guardian combat; CHARM staged in a curated presentation fixture.
- **Keep visible:** Guardian portrait and name, health, rule indicators, staged word, and Cast button.
- **Refresh when:** Guardian art, boss rules, combat effects, or combat layout changes.

### 08-collection — Discovery and replay motivation

- **File:** `campaign/08-collection.png`
- **Purpose:** Show the characters, relics, and items players can explore between runs.
- **Raw capture:** `source/06-collection.png`
- **Retake this state:** Collection page with the All filter; fixture character unlocks visible.
- **Keep visible:** Collection title, search/filter controls, and recognizable entry artwork.
- **Refresh when:** Collection layout, discovery rules, character roster, or catalog artwork changes.

## Supporting images

- **hero.png — Website hero — gameplay at a glance:** Pair combat and map imagery beside a separate website headline.
- **social.png — Link preview — introduce Hexicon:** Explain the game when its website link is shared.
- **overview.png — Campaign contact sheet — choose an image:** Compare all eight framed campaign cards and select the right feature.
- **hexicon-marketing-kit.zip — Distribution bundle:** Share the finished campaign images and their usage guide together.

## Additional screen grabs

The manifest labels all 18 raw capture slots, including the arrival, route-choice, and guardian-combat images for each of the four regions. Pick the purpose first, then recreate its screen state in the intended game build. Preserve the old batch and record the new capture’s game commit.

The complete capture register and repeatable tools live in the Hexicon repository: `art/marketing/capture-plan.json`, `tools/art/capture_marketing.gd`, and `tools/art/render_marketing.cjs`. Raw screenshots and editable HTML are versioned there; this download contains the finished PNGs and their usage metadata.
