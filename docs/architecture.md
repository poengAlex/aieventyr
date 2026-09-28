# Architecture

## Overview

Aieventyr has two main subsystems:

1. A generation pipeline under `pipeline/`
2. A static-reading app under `src/`

The pipeline writes canonical content bundles into `public/content`, and the frontend reads that content directly at runtime.

## Frontend structure

### App shell

- `src/layouts/MainLayout.vue`
  The top-level shell with the site header and route outlet.

### Pages

- `src/pages/IndexPage.vue`
  Library view. Loads the manifest, shows available stories, lets the user choose a preferred variant, and filters read stories.
- `src/pages/StoryPage.vue`
  Reader view. Loads one story bundle, renders hero image, text sections, character gallery, and the cross-variant image carousel. When the story has an illustration set, it renders `IllustratedStory` instead of the sections, and offers `PictureBook`. Audio playback is currently removed.
- `src/components/IllustratedStory.vue`
  Text with the pictures of an illustration set. On wide screens one picture stays beside the text and changes when the reader reaches its paragraph; on narrow screens the pictures sit between the paragraphs. Character names open the character's portrait.
- `src/components/PictureBook.vue`
  Full-screen picture-book mode: one picture and the text that leads up to it per page. Wide screens show an open book, with the picture on the left page and the text on the right; upright phones show one page. Pages turn with a 3D page-turn animation, by tap, arrow keys or a swipe that the page follows. On an upright phone, `RotateHint.vue` first suggests turning the phone sideways and closes once it is turned.
- `src/components/ArtFigure.vue`
  One picture with its caption and a toggle that shows the prompt that made it.
- `src/pages/AboutPage.vue`
  Short explanation of the project and generation approach.

### State

- `src/stores/settings.ts`
  Stores reader preferences and lightweight reading progress:
  - selected variant
  - font size
  - read stories
  - whether read stories are shown in the library

### Content access layer

- `src/logic/content.ts`
  The frontend entry point for generated content. It:
  - loads `manifest.json`
  - loads `story.json`
  - resolves the best available variant for the current user preference
  - loads `variant.json`, `story.txt`, `characters.json`, and `sections.json`
  - caches manifest, story, and variant requests

This module is the key boundary between app code and generated output. If the content tree changes, this is the first place that should be updated.

- `src/logic/art.ts`
  Loads the illustration sets made by `npm run art:generate` from `public/content/art/<set>/`. `child-friendly` has its own set, `simplified` and `english` share `classic`, and `modern` has its own. It reads `index.json` for which stories have pictures, then `<story>/illustrations.<variant>.json`. It places each picture after its paragraph, using the anchor text if the paragraph numbers have shifted, and finds character names in the text.

## Runtime data flow

### Library page

1. Load `/content/manifest.json`
2. Sort stories by `index`
3. Resolve a cover image from the user’s selected variant or a fallback available variant; a cover from the variant's illustration set replaces it when there is one
4. Navigate to `/story/:id`

### Story page

1. Load the manifest
2. Load `/content/stories/<storyId>/story.json`
3. Resolve the best available variant for the user’s selection
4. Load the variant bundle:
   - `variant.json`
   - `story.txt`
   - `characters.json`
   - `sections.json`
5. Load the variant's illustration set, if the story has one
6. Render:
   - hero area
   - with illustrations: paragraphs with the pictures of the set, picture-book mode, and the set's portraits
   - without: section text + inline images, and the variant's character gallery
   - image carousel

## Pipeline structure

The pipeline is organized into five folders:

- `pipeline/config/`
  JSON config for models and pipeline behavior
- `pipeline/prompts/`
  Prompt templates for text and scene generation
- `pipeline/lib/`
  Shared utilities, OpenAI integration, and stage implementations
- `pipeline/commands/`
  Small CLI entrypoints used by npm scripts
- `pipeline/source/`
  Input material such as OCR text and section metadata

There is also a `pipeline/work/` directory for intermediate artifacts such as:

- generated variant packs
- scene prompt packs
- image prompt files
- temporary TTS chunks

## Important design choices

### Canonical content tree

The app reads only from `public/content`. This keeps runtime logic simpler and makes the pipeline responsible for normalization.

### Variant-contained bundles

Each public variant owns its own:

- text
- summary/metadata
- main image
- section images
- character list
- character images
- audio

This avoids hidden fallback assets and makes reruns more predictable.

### Config-driven generation

Model choices and pipeline behavior live in:

- `pipeline/config/models.json`
- `pipeline/config/pipeline.json`

The goal is to keep prompt and model iteration outside stage logic as much as possible.
