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
        audio.mp3
        scenes/
          scene-1.webp
          scene-2.webp
          ...
        characters.json
        characters/
          <characterSlug>.webp
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

- `audio.mp3`

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
