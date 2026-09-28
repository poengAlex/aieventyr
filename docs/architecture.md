# Architecture

## Overview

Aieventyr has two main subsystems:

1. A generation pipeline under `pipeline/`
2. A static-reading app under `src/`

The pipeline writes canonical content bundles into `public/content`, and the frontend reads that content directly at runtime.

## Frontend structure

The site is set like a printed storybook. The library is a title page and a table of contents; a tale opens like a chapter, and on wide screens as an open book with the picture on the left page and the text on the right. The interface has few words, and they follow the chosen edition (English for the English texts, Norwegian for the rest).

### Look

- `src/css/app.scss`
  The tokens (cream paper, black ink, rules, and one printing colour per edition: `.edition-child-friendly`, `.edition-classic`, `.edition-modern`), a faint paper grain, night mode (`body--dark`, the same book by lamplight), and the shared pieces: letter-spaced capitals (`.caps`, `.caps-link`), Roman numerals (`.numeral`), pictures framed as plates (`.plate`), the printer's ornament (`.ornament`) and the two-page spread (`.spread`, `.left-page`, `.right-page`). The illustration styles in `pipeline/art/*/style.json` describe printed-book plates on the same cream paper, each edition leaning on its printing colour.
- `src/App.vue` loads EB Garamond from `@fontsource-variable/eb-garamond`, so the font is served with the site. It is the only typeface.

### App shell

- `src/layouts/MainLayout.vue`
  A bare layout. It switches night mode on and off and keeps the browser's theme colour in step. Pages draw their own bars.

### Pages

- `src/pages/IndexPage.vue`
  The library: a title page with the edition switch, and a table of contents with each tale's number, title and reading time. On wide screens the left page shows the cover of the tale under the pointer, or of the tale left halfway, with a link to continue where the reader stopped; on phones that plate sits between the title page and the contents.
- `src/pages/StoryPage.vue`
  The reader. A slim bar with the way back to the contents, the title once it has scrolled away, the `Aa` settings and a reading-progress line. The tale opens like a chapter: number, title, reading time, edition switch and the picture-book link; then the text, opening with a large initial and small capitals; and at the end the cast, the next tale and the original title. It remembers how far the reader has come, marks the story read at the end, and "continue where you left off" reopens a tale in the edition it was read in.
- `src/pages/AboutPage.vue`
  A few lines on where the tales come from and what the four editions are.
- `src/pages/ErrorNotFound.vue`
  The page for unknown addresses.

### Components

- `src/components/ContentsEntry.vue` – one line of a table of contents: number, title, dotted leader and minutes.
- `src/components/CoverPlate.vue` – a tale's cover framed as a plate, with its number and title.
- `src/components/EditionSwitch.vue` – the four editions as small-capital links.
- `src/components/ReadingSettings.vue` – the `Aa` menu: text size, day or night, edition.
- `src/components/IllustratedStory.vue`
  Text with the pictures of an illustration set. From 1024px it is an open book: the picture for the passage being read stays on the left page and changes when the reader reaches its paragraph. Below that the pictures sit between the paragraphs. Paragraphs are indented as in a book, and the first opens with a large initial and small capitals (`openingPieces` in `src/logic/art.ts`). Character names open the character's portrait.
- `src/components/ArtFigure.vue`
  One picture as a plate, with its caption and a small button that shows the prompt that made it.
- `src/components/CharacterDialog.vue`
  A character's portrait and description, with the model sheet one tap away, and links to the next character.
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
  - where the reader last stopped (`lastRead`), for "continue where you left off"

### Texts

- `src/logic/i18n.ts`
  The interface words in Norwegian and English, the edition names, reading time (150 words a minute for the children's edition, 200 for the rest) and Roman numerals for the tale numbers.

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
3. List the tales as a table of contents, with covers from the edition's illustration set, or the variant's older `main.webp` until there is one
4. Navigate to `/story/:id` (with `?resume=1` from "continue where you left off")

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
