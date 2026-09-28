# Architecture

## Overview

Aieventyr has two main subsystems:

1. A generation pipeline under `pipeline/`
2. A static-reading app under `src/`

The pipeline writes canonical content bundles into `public/content`, and the frontend reads that content directly at runtime.

## Frontend structure

The site is built for reading: a library of covers, and a story page that is mostly text and pictures. The interface has few words, and they follow the chosen edition (English for the English texts, Norwegian for the rest).

### Look

- `src/css/app.scss`
  The design tokens (paper, ink, fjord teal, lingonberry, honey, moss), the Literata serif for text and headings, the system sans for controls, night mode (`body--dark`), and one accent per edition (`.edition-child-friendly`, `.edition-classic`, `.edition-modern`). The illustration styles in `pipeline/art/*/style.json` use the same palette.
- `src/App.vue` loads Literata from `@fontsource-variable/literata`, so the font is served with the site.

### App shell

- `src/layouts/MainLayout.vue`
  A bare layout. It switches night mode on and off and keeps the browser's theme colour in step. Pages draw their own bars.

### Pages

- `src/pages/IndexPage.vue`
  The library: a heading, the edition switch, a "continue reading" card for a story left halfway, and a shelf of covers with title and reading time.
- `src/pages/StoryPage.vue`
  The reader. A slim bar with the way back, the title once it has scrolled away, the `Aa` settings and a reading-progress line. Then the cover, title, reading time, edition switch and the picture-book button; the text with its pictures; and at the end the cast, the next tale and the original title. It remembers how far the reader has come and marks the story read at the end.
- `src/pages/AboutPage.vue`
  A few lines on where the tales come from and what the four editions are.
- `src/pages/ErrorNotFound.vue`
  The page for unknown addresses.

### Components

- `src/components/StoryCard.vue` – one cover on the shelf.
- `src/components/EditionSwitch.vue` – the four editions as a segmented switch.
- `src/components/ReadingSettings.vue` – the `Aa` menu: text size, day or night, edition.
- `src/components/IllustratedStory.vue`
  Text with the pictures of an illustration set. On wide screens one picture stays beside the text and changes when the reader reaches its paragraph; on narrow screens the pictures sit between the paragraphs. Character names open the character's portrait.
- `src/components/ArtFigure.vue`
  One picture with its caption, and a small button that shows the prompt that made it.
- `src/components/CharacterDialog.vue`
  A character's portrait and description, with the model sheet one tap away, and arrows to the next character.
- `src/components/PictureBook.vue`
  Full-screen picture-book mode: one picture and the text that leads up to it per page. Wide screens show an open book, with the picture on the left page and the text on the right; upright phones show one page. Pages turn with a 3D page-turn animation, by tap, arrow keys or a swipe that the page follows. On an upright phone, `RotateHint.vue` first suggests turning the phone sideways and closes once it is turned. It opens only for stories with new pictures.
- `src/components/FullscreenImageDialog.vue` – a picture on its own, full screen.

### State

- `src/stores/settings.ts`
  Reader preferences and progress, kept in local storage:
  - the chosen edition (`variant`)
  - text size
  - night mode
  - which stories have been read, per edition
  - where the reader last stopped (`lastRead`), for "continue reading"

### Texts

- `src/logic/i18n.ts`
  The interface words in Norwegian and English, the edition names, and reading time (150 words a minute for the children's edition, 200 for the rest).

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
  Loads the illustration sets made by `npm run art:generate` from `public/content/art/<set>/`. `child-friendly` has its own set, `simplified` and `english` share `classic`, and `modern` has its own. It reads `index.json` for which stories have pictures, then `<story>/illustrations.<variant>.json`, and builds `srcset` lists from the web sizes the runner wrote. It places each picture after its paragraph, using the anchor text if the paragraph numbers have shifted, and finds character names in the text. Until a story has new pictures, `fallbackArt` shows the older section pictures in the same reader.

## Runtime data flow

### Library page

1. Load `/content/manifest.json` (titles and word counts per edition are in it)
2. Sort stories by `index`
3. Show each story's cover from the edition's illustration set, or the variant's older `main.webp` until there is one
4. Navigate to `/story/:id` (with `?resume=1` from "continue reading")

### Story page

1. Load the manifest
2. Load `/content/stories/<storyId>/story.json`
3. Resolve the best available variant for the user's selection
4. Load the variant bundle (`variant.json`, `story.txt`, `characters.json`, `sections.json`) and the variant's illustration set, if the story has one
5. Render the head, then the text with the new pictures, or with the older section pictures until the new ones exist
6. Offer the picture book when the story has new pictures
7. On scroll, update the progress line, save the reading position, and mark the story read at the end

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

This avoids hidden fallback assets and makes reruns more predictable.

### Config-driven generation

Model choices and pipeline behavior live in:

- `pipeline/config/models.json`
- `pipeline/config/pipeline.json`

The goal is to keep prompt and model iteration outside stage logic as much as possible.
