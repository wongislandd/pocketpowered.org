# Hero animation — spell, cast, and score

**Purpose:** Show the actual word-building loop with a developed build: choose seven runes, spell **PHOENIX**, cast, watch relics score, and defeat the Astral Carillon for **4,922 damage** in this fixture.

## Usage

- `phoenix-cast.gif`: 390 × 844, 15 fps, looping GIF for sharing.
- `phoenix-cast.mp4`: the same 12.23-second sequence at 30 fps, H.264, silent; preferred website hero.
- `poster.png`: fully staged word before casting; static and reduced-motion fallback.
- `opening.png`: scrambled hand at the start of the capture.
- `result.png`: native reward screen after the cast, retained as verification; excluded from the hero loop.
- `capture.json`: purpose labels, retake state, exact scoring events, damage, frame boundaries, and provenance.

Keep a feature label, headline and short description **outside** the native screenshot/video. The website uses “A word becomes magic.” and “Spell PHOENIX. Watch your relics bring it to life.” Include pause/resume; pause offscreen and default to the poster with reduced motion. Keep the GIF downloadable while using the smaller MP4 for page playback.

## Capture state

Game source: Hexicon main `cafd062`, Godot 4.7.2. A curated late-run fixture uses valid regional history and an isolated test save. It is not a recording of a complete run. The actual native staging commands, dictionary validation, cast command, scoring events, animation, and damage are unmodified. No developer word acceptance is enabled.

- Word: PHOENIX, from seven real rune identities initially shuffled in hand.
- Enhancement: Ember on P.
- Relics, in order: Herbalist, Consonant Comb, Echo Chime, Brass Abacus, Black Cat.
- Items: Spark Flask and Clear Water; both remain held, not used.
- Gold at start: 50.
- Opponent: Astral Carillon, 4,400 HP; actual result 0 HP after 4,922 damage.
- Display: 390 × 844, normal text, normal motion and 1× game speed.

The export removes setup frames and the subsequent reward selection. It preserves the timing of the complete spelling and scoring sequence. The GIF samples the same animation at 15 fps. Both delivery formats omit audio; the native movie-writer PNG sequence and complete PCM output remain in the raw capture folder.

## Retake

From the Hexicon root, create an empty capture directory, then run:

```sh
godot --path godot --fixed-fps 30 --write-movie /absolute/capture/frames/cast.png --script ../tools/art/capture_marketing_cast.gd
python3 tools/art/encode_marketing_cast.py --frames-dir /absolute/capture/frames
```

For a new campaign batch, change the destination in the capture script and pass the matching `--output` directory to the encoder. Keep prior accepted exports. Update the source commit and capture-purpose metadata when changing the fixture. The encoder requires FFmpeg with libx264 and GIF support.

Refresh when combat layout, rune motion, scoring sequence, relic effects or guardian art changes. Inspect staging, a relic contribution, the damage impact, and the final frame before publishing. Verify the captured script reports zero failures and the manifest reflects the actual damage; never edit a number into the video.

## Verification

Native capture completed with zero failures and no script errors. PHOENIX passed the bundled dictionary; the native cast and scoring completed. All five equipped relics appear in actual scoring events. Inspected a timeline contact sheet, the pre-cast poster, and the final frame. Website browser verification is recorded with the companion site change.

### First-frame rendering correction

Recaptured after fixing the enemy view's initialization. Previously, each staging refresh briefly drew the oversized fallback texture on top of the registered atlas, producing a one-frame size pop. The view now initializes its presentation before the first draw. `first-frame-fix.png` compares the same three native frames before and after; the source revision is recorded in `capture.json`. The fixture, 4,922 damage, and 12.23-second timing are unchanged.

Verification: first-frame regression test passed, including reduced motion, entering/idle/defeated states and static fallback preservation. Enemy-health regression: 2,605 checks, zero failures. Native recapture: zero failures. Inspected consecutive frames across tile placement.
