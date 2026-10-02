# Content Contract

## Overview

The frontend expects a canonical content tree under `public/content`.

The contract is intentionally file-based so the app can run as a static site without a backend database.

## Directory layout

```text
public/content/
  manifest.json
  stories/
    <storyId>/
      story.json
      <variant>/
        variant.json
        story.txt
        sections.json
        main.webp
        audio.m4a
        scenes/
          scene-1.webp
          scene-2.webp
          ...
        characters.json
        characters/
          <characterSlug>.webp
        glossary.json
        narration.json
  share/
    <storyId>.jpg
    eventyr.jpg
```

## Top-level manifest

`public/content/manifest.json` is the library index.

It contains:

- dataset name
- generation timestamp
- default variant
- supported variants
- generation model metadata
- the story list used by the library page

### Story list item shape

Each item in `manifest.json.stories` includes:

- `id`
- `index`
- `canonicalTitle`
- `originalTitle`
- `summary`
- `availableVariants`
- `coverImage`

## Story metadata

`public/content/stories/<storyId>/story.json` contains story-level data shared across variants:

- `id`
- `index`
- `canonicalTitle`
- `originalTitle`
- `summary`
- `availableVariants`

This file is used by the story reader before a specific variant bundle is loaded.

## Variant bundle

Each variant directory is meant to be self-contained.

### `variant.json`

Contains:

- `variant`
- `displayTitle`
- `description`
- `tone`
- `summary` (optional)
- `characterCount`
- `hasAudio`
- `hasInlineScenes`
- `generation`
- `paths`

### `paths`

The `paths` object tells the frontend where to load the rest of the bundle:

- `text`
- `mainImage`
- `characters`
- `audio`
- `sections`

### `story.txt`

The full text for the selected story variant.

### `characters.json`

An array of variant-specific characters:

- `name`
- `slug`
- `description`
- `visualPrompt`
- `imagePath`

### `glossary.json`

The words a reader of this edition may not know, in the order they first appear. Optional; an edition without one has no word list. An array of:

- `term`: the headword shown with the explanation (`trau`)
- `forms`: every spelling of it that the text uses (`["trauet", "trauene"]`); the reader matches whole words, in any case
- `note`: a short explanation in the edition's language, written for its readers

The reader marks the first appearance of each word and lists them all at the end of the tale. `npm run content:glossary` checks the lists.

### `audio.m4a` and `narration.json`

The edition read aloud, for the editions that are (`variant.json` has `hasAudio: true` and `paths.narration`, and the manifest's story item lists the seconds per edition under `audio`). Made by `npm run narration:generate`. `audio.m4a` is HE-AAC at 32 kbps mono, encoded from the 128 kbps recording in `pipeline/work/narration`. `narration.json` has the reader's name (`voice`), the length in `seconds`, and per paragraph of `story.txt` (split on blank lines, as the reader splits it) its `start` and `end` and its `words`, each `[from, to, start, end]`: where the word is in the paragraph and when it is said, in seconds.

### `sections.json`

An array of reading sections used by the story page:

- `id`
- `title`
- `text`
- `imagePath`
- `imagePrompt`

The frontend currently uses:

- `id`
- `title`
- `text`
- `imagePath`

The pipeline also stores `imagePrompt` for debugging and regeneration transparency.

## Variant semantics

### Public reading variants

- `simplified`
  Modern Norwegian with easier phrasing and reading flow.
- `english`
  English retelling of the folktale.
- `child-friendly`
  Softer wording and lower-fright presentation for younger readers.
- `modern`
  Contemporary adaptation of the folktale premise.

### Internal pipeline variants

- `raw`
  Direct OCR extraction from source material.
- `cleaned`
  OCR-restored text that stays close to the original voice.

These internal variants are useful as pipeline inputs and debugging outputs.

## Frontend expectations

The frontend content layer expects:

- `manifest.json` to exist
- `story.json` to exist for each story
- at least one loadable variant per story
- `variant.json` to point at valid files within the same variant directory

The story page also expects:

- `characters.json`
- `sections.json`
- `main.webp`

If `variant.json.hasAudio` is `true`, it also expects:

- `audio.m4a`

## Validation rules

The pipeline validator currently checks:

- story text exists
- variant metadata exists
- main image exists
- character metadata exists
- section metadata exists
- declared character images exist
- declared scene images exist
- audio exists when `hasAudio` is true
- character image paths stay under `characters/`

## Practical rule of thumb

If you add or change output generation, keep each variant bundle independently usable. A story should be readable even if only one variant directory is copied out of the tree.
