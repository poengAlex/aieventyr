# Aieventyr

Aieventyr is a reading app and content-generation pipeline for Norwegian folktales. The project takes OCR-based source text, rewrites it into reader-friendly variants, generates matching images and audio, and serves the result from one canonical content tree under `public/content`.

The current app is built with Quasar, Vue 3, and Pinia. The generation pipeline uses OpenAI for text, image, and speech generation.

## What this repo contains

- `src/`: the Quasar frontend
- `public/content/`: generated story output consumed by the app
- `pipeline/`: the content-generation pipeline, prompts, config, and working files

The app only reads from `public/content`. It does not use older `public/v2`, `public/v3`, `public/new`, or `public/output` layouts.

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Create a `.env` file with:

```bash
OPENAI_API_KEY=your_api_key_here
```

### 3. Run the app

```bash
npm run dev
```

### 4. Build the app

```bash
npm run build
```

## Requirements

- Node.js 18+ (`package.json` allows newer versions too)
- npm
- `ffmpeg` available on the machine
  The audio pipeline uses `fluent-ffmpeg` to concatenate generated speech chunks.
- An OpenAI API key for any generation step

## Project flow

At a high level, the repo has two layers:

1. The pipeline generates canonical story bundles into `public/content`.
2. The frontend reads those bundles and renders the library and story reader.

Generated story variants currently include:

- `simplified`
- `english`
- `child-friendly`
- `modern`

The pipeline also maintains internal stages:

- `raw`
- `cleaned`

Those internal stages are useful for regeneration and debugging, but the reader experience is centered on the four public variants above.

## Canonical output layout

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

The app treats each story variant as an independent bundle with its own:

- text
- main image
- inline scene images
- character list
- character portraits
- audio

## Main commands

### App

```bash
npm run dev
npm run build
npm run lint
```

### Pipeline

```bash
npm run pipeline:all
```

Run the audio-only pipeline:

```bash
npm run pipeline:all-audio
```

Run the pipeline for one story:

```bash
npm run pipeline:story -- --story=askesv
```

Run audio only for one story:

```bash
npm run pipeline:story-audio -- --story=askesv
```

Run the pipeline for one story variant:

```bash
npm run pipeline:variant -- --story=askesv --variant=simplified
```

Run audio only for one story variant:

```bash
npm run pipeline:variant-audio -- --story=askesv --variant=simplified
```

### Individual stages

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

`pipeline:all`, `pipeline:story`, and `pipeline:variant` do not run TTS by default. Audio can be tested and rerun separately with the dedicated audio commands above.

## Documentation

- `docs/architecture.md`
- `docs/pipeline.md`
- `docs/content-contract.md`

## Verification

Useful checks before committing:

```bash
npm run lint
npm run build
npm run pipeline:validate
```
