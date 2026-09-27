# Pipeline

## Purpose

The pipeline transforms OCR-based folktale source material into canonical reader bundles under `public/content`.

Each story goes through a staged build:

1. source extraction
2. raw story split
3. cleaned text generation
4. variant generation
5. variant character and metadata generation
6. main image prompt generation
7. character image generation
8. main image generation
9. inline scene generation
10. manifest build
11. validation

Audio is generated as its own stage and can be rerun separately.

## Source inputs

The main source inputs are:

- `pipeline/source/sections.json`
  story IDs, indices, and title metadata
- `pipeline/source/ocr/stories/*.txt`
  OCR-derived source text per story

## Config

### `pipeline/config/pipeline.json`

Defines operational behavior such as:

- default variant
- full variant list
- audio-enabled variant list
- image size and quality
- concurrency
- maximum number of characters to generate per story variant
- maximum TTS chunk length
- canonical content directory
- working directory

### `pipeline/config/models.json`

Defines the model layer:

- text generation model and reasoning settings
- image generation model and style suffix
- TTS model, default voice, candidate voices, and speaking instructions

## CLI usage

### Full run

```bash
npm run pipeline:all
```

Runs the full text/image pipeline for all selected stories and variants, then rebuilds the manifest and validates output.

### One story

```bash
npm run pipeline:story -- --story=askesv
```

### One variant for one story

```bash
npm run pipeline:variant -- --story=askesv --variant=simplified
```

### Force regeneration

```bash
npm run pipeline:variant -- --story=askesv --variant=english --force
```

The pipeline skips outputs that already exist unless `--force` is used.

The current texts of the four public variants (`story.txt`, `sections.json`) and their metadata were rewritten by hand. Forcing the text, variant or inline-scene stages replaces them with generated output.

## Stage commands

### Text stages

```bash
npm run pipeline:extract-source
npm run pipeline:split-stories
npm run pipeline:generate-cleaned
npm run pipeline:generate-variants
```

### Metadata and image stages

```bash
npm run pipeline:generate-variant-characters
npm run pipeline:generate-variant-main-image-prompts
npm run pipeline:generate-variant-character-images
npm run pipeline:generate-variant-main-images
npm run pipeline:build-inline-scenes
```

### Audio stages

```bash
npm run pipeline:generate-variant-audio
npm run pipeline:compare-tts-voices
```

`pipeline:generate-variant-audio` is useful when you want to rerun only TTS without touching text or images.

### Output stages

```bash
npm run pipeline:build-content-manifest
npm run pipeline:validate
```

## Stage details

### `extract-source`

Copies OCR source material into the canonical source location used by later stages.

### `split-stories`

Writes the raw story text into the canonical content tree and initializes `story.json` and raw `variant.json`.

### `generate-cleaned`

Uses the text model to repair OCR issues while preserving the original literary voice.

### `generate-variants`

Builds the rewritten variants from the cleaned story text:

- `simplified`
- `english`
- `child-friendly`
- `modern`

### `generate-variant-characters`

Creates:

- variant display title
- description
- tone
- summary
- character list
- character image prompts
- main image prompt

Intermediate data is also written into `pipeline/work/variant-packs/`.

### `generate-variant-main-image-prompts`

Extracts and stores the main image prompt from the generated variant pack.

### `generate-variant-character-images`

Generates per-character images for each selected story variant.

### `generate-variant-main-images`

Generates the main story image for each selected story variant.

### `build-inline-scenes`

Splits the story into sections, generates image prompts per section, renders a unique image for each section, and writes `sections.json`.

This stage also has moderation-safe retries for violent or risky scenes.

### `generate-variant-audio`

Chunks story text, generates speech for each chunk, concatenates the result with `ffmpeg`, and writes `audio.mp3`.

### `build-content-manifest`

Scans generated stories, computes available variants, sets story summaries, and writes `public/content/manifest.json`.

### `validate`

Checks that generated bundles contain the expected files and that variant-scoped assets stay within the variant’s own directory.

## Intermediate files

The pipeline writes useful intermediate output into `pipeline/work/`, including:

- `variant-packs/`
- `image-prompts/`
- `scene-prompts/`
- `tts-chunks/`

These are useful for debugging generation quality, inspecting prompts, and rerunning downstream stages.

## Common workflows

### Generate one new story in the default public variant set

```bash
npm run pipeline:story -- --story=gjertrud
npm run pipeline:generate-variant-audio -- --story=gjertrud
npm run pipeline:build-content-manifest -- --story=gjertrud
npm run pipeline:validate -- --story=gjertrud
```

### Regenerate only the section images for one variant

```bash
npm run pipeline:build-inline-scenes -- --story=askesv --variant=modern --force
```

This also re-splits the text into new sections with generated titles and prompts. To redraw images and keep the sections, use `pipeline:regenerate-scenes`.

### Redraw individual scene images

```bash
npm run pipeline:regenerate-scenes
npm run pipeline:regenerate-scenes -- --story=tolvander
npm run pipeline:regenerate-scenes -- --story=giske --variant=english --scene=3
npm run pipeline:regenerate-scenes -- --story=tolvander --model=gpt-image-2.5-sunburst
```

`--model` overrides `image.model` from `models.json` for this run only. The default is `gpt-image-2.5-flare`; `gpt-image-2.5-sunburst` is slower and more detailed, and the existing art was made with `gpt-image-1.5`.

Redraws single scene images from the `imagePrompt` stored in `sections.json`. Unlike `build-inline-scenes --force`, it doesn't re-split the story text, retitle sections or redraw the other scenes. Without `--scene` it works through `pipeline/config/scene-fixes.json`, the list of illustrations that contradict the current texts, each with a corrected prompt already in `sections.json`.

### Illustrate a whole set overnight

```bash
npm run art:generate -- --dry-run
npm run art:generate -- --story=askesv
npm run art:generate -- --budget=150
```

A separate runner, apart from the stages above. It reads hand-written plans from `pipeline/art/<set>/`, one per story, with the cast, places, cover and pictures tied to paragraphs, plus captions and alt texts. It makes model sheets first and sends them along as reference images, so characters look the same in every picture. Output goes to `pipeline/art-output/<set>/` with an `illustrations.json` per story and a `review.html` for checking. It doesn't touch `public/content`. Details are in `pipeline/art/README.md`.

### Refresh only TTS for one story variant

```bash
npm run pipeline:generate-variant-audio -- --story=askesv --variant=english --force
```

### Compare Norwegian TTS voices

```bash
npm run pipeline:compare-tts-voices
```

Voice samples are written into `pipeline/work/tts-voice-samples/`.
