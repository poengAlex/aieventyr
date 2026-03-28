# Aieventyr

Aieventyr is now organized around one canonical content tree under `public/content` and one pipeline under `pipeline/`.

## Canonical content

The app reads only from:

```text
public/content/
  manifest.json
  stories/<storyId>/
    story.json
    <variant>/
      variant.json
      story.txt
      sections.json
      main.webp
      scenes/scene-<n>.webp
      characters.json
      characters/<characterSlug>.webp
      audio.mp3
```

Supported variants:

- `raw`
- `cleaned`
- `simplified`
- `english`
- `child-friendly`
- `modern`

## Pipeline

The new pipeline lives in:

```text
pipeline/
  config/
  prompts/
  lib/
  commands/
  source/
  work/
```

Main configuration:

- `pipeline/config/pipeline.json`
- `pipeline/config/models.json`

Default models:

- Text and structured generation: `gpt-5.2`
- Images: `gpt-image-1.5`
- TTS: `gpt-4o-mini-tts`

## Commands

Run the full canonical pipeline:

```bash
npm run pipeline:all
```

Run the pipeline for one story:

```bash
npm run pipeline:story -- --story=askesv
```

Run the pipeline for one story variant:

```bash
npm run pipeline:variant -- --story=askesv --variant=simplified
```

Useful individual stages:

```bash
npm run pipeline:extract-source
npm run pipeline:split-stories
npm run pipeline:generate-cleaned
npm run pipeline:generate-variants
npm run pipeline:generate-variant-characters
npm run pipeline:generate-variant-main-image-prompts
npm run pipeline:generate-variant-character-images
npm run pipeline:generate-variant-main-images
npm run pipeline:generate-variant-audio
npm run pipeline:build-inline-scenes
npm run pipeline:build-content-manifest
npm run pipeline:validate
npm run pipeline:compare-tts-voices
```

## App

The frontend now has a simpler flow:

- `Library` page for browse, search, and filtering
- `Story` reader page for variant-specific text, section images, character art, and audio
- `About` page with a short project explanation

Legacy runtime version switching is removed. The app no longer reads from `public/v2`, `public/v3`, `public/new`, or `public/output`.

## Verification

Current verification commands:

```bash
npm run lint
npm run build
npm run pipeline:validate
```
