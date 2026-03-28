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
  Reader view. Loads one story bundle, renders hero image, audio, text sections, character gallery, and the cross-variant image carousel.
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

## Runtime data flow

### Library page

1. Load `/content/manifest.json`
2. Sort stories by `index`
3. Resolve a cover image from the user’s selected variant or a fallback available variant
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
5. Render:
   - hero area
   - audio player
   - section text + inline images
   - character gallery
   - all-images carousel across available variants

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
