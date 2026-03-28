import fs from 'fs/promises'
import path from 'path'
import ffmpeg from 'fluent-ffmpeg'
import sharp from 'sharp'
import {
  VARIANT_META,
  chunkText,
  copyFile,
  createSectionTitle,
  createPlaceholderCard,
  createStyledDerivative,
  ensureDir,
  fileExists,
  getCanonicalPaths,
  getVariantDisplayTitle,
  getVariantGoal,
  getVariantSourceVariant,
  getWorkPaths,
  listFiles,
  loadModelsConfig,
  loadPipelineConfig,
  loadPrompt,
  loadSections,
  mapSeries,
  optimizeToWebp,
  readJson,
  readText,
  removeDir,
  renderPrompt,
  resolveSelection,
  rootPath,
  slugify,
  splitTextIntoSections,
  writeJson,
  writeText,
} from './shared.mjs'
import { generateImage, generateJson, generateSpeech, generateText } from './openai.mjs'

async function getSectionMap() {
  const sections = await loadSections()
  return new Map(sections.map((section) => [section.id, section]))
}

async function buildBaseStoryMeta(section) {
  return {
    id: section.id,
    index: section.index,
    canonicalTitle: section.canonicalTitle,
    originalTitle: section.originalTitle,
    summary: '',
    availableVariants: [],
  }
}

async function readStoryMeta(storyId) {
  const storyMetaPath = getCanonicalPaths(storyId, 'raw').storyMeta
  if (await fileExists(storyMetaPath)) {
    return readJson(storyMetaPath)
  }
  const section = (await loadSections()).find((item) => item.id === storyId)
  if (!section) throw new Error(`Missing section metadata for ${storyId}`)
  return buildBaseStoryMeta(section)
}

async function writeStoryMeta(storyId, meta) {
  const storyMetaPath = getCanonicalPaths(storyId, 'raw').storyMeta
  await writeJson(storyMetaPath, meta)
}

async function getRawSourceFile(section) {
  const pipelineConfig = await loadPipelineConfig()
  const canonicalSource = rootPath(pipelineConfig.ocrSourceDir, `${section.id}.txt`)
  if (await fileExists(canonicalSource)) return canonicalSource
  throw new Error(`Missing raw source for ${section.id}`)
}

function getGenerationMetadata(model, promptName, extra = {}) {
  return {
    model,
    prompt: promptName,
    generatedAt: new Date().toISOString(),
    ...extra,
  }
}

async function updateVariantMeta(storyId, variant, updater) {
  const paths = getCanonicalPaths(storyId, variant)
  const current = (await fileExists(paths.variantMeta))
    ? await readJson(paths.variantMeta)
    : {
        variant,
        displayTitle: '',
        description: '',
        tone: '',
        characterCount: 0,
        hasAudio: false,
        generation: {},
        paths: {
          text: 'story.txt',
          mainImage: 'main.webp',
          characters: 'characters.json',
          audio: 'audio.mp3',
          sections: 'sections.json',
        },
      }

  const next = await updater(current)
  await writeJson(paths.variantMeta, next)
  return next
}

async function createInlineSceneImage({
  mainImagePath,
  characterImagePaths,
  outputPath,
  sceneIndex,
  sectionCount,
  variant,
}) {
  const width = 1400
  const height = 900
  const positions = ['left', 'center', 'right', 'attention']
  const background = sharp(mainImagePath).resize(width, height, {
    fit: 'cover',
    position: positions[sceneIndex % positions.length],
  })

  const tintMap = {
    raw: { r: 166, g: 139, b: 105, alpha: 0.22 },
    cleaned: { r: 240, g: 222, b: 188, alpha: 0.16 },
    simplified: { r: 216, g: 225, b: 175, alpha: 0.18 },
    english: { r: 182, g: 205, b: 227, alpha: 0.18 },
    'child-friendly': { r: 255, g: 214, b: 172, alpha: 0.22 },
    modern: { r: 161, g: 191, b: 191, alpha: 0.18 },
  }
  const tint = tintMap[variant] || tintMap.cleaned

  const composites = [
    {
      input: Buffer.from(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="rgba(18,20,18,0.05)"/>
              <stop offset="100%" stop-color="rgba(18,20,18,0.32)"/>
            </linearGradient>
          </defs>
          <rect width="${width}" height="${height}" fill="url(#fade)"/>
          <rect width="${width}" height="${height}" fill="rgba(${tint.r},${tint.g},${tint.b},${tint.alpha})"/>
          <rect x="56" y="56" width="${width - 112}" height="${height - 112}" rx="42" fill="none" stroke="rgba(255,255,255,0.38)" stroke-width="4"/>
        </svg>
      `),
    },
  ]

  const selectedCharacterImages = characterImagePaths.slice(sceneIndex % 2, sceneIndex % 2 + 2)
  for (let index = 0; index < selectedCharacterImages.length; index++) {
    const cardWidth = 260
    const cardHeight = 320
    const left = width - 356 - index * 196
    const top = 88 + ((sceneIndex + index) % 2) * 120
    const frameSvg = Buffer.from(`
      <svg width="${cardWidth}" height="${cardHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${cardWidth}" height="${cardHeight}" rx="28" fill="rgba(255,252,244,0.92)"/>
      </svg>
    `)
    composites.push({ input: frameSvg, left, top })
    composites.push({
      input: await sharp(selectedCharacterImages[index])
        .resize(cardWidth - 24, cardHeight - 24, { fit: 'cover' })
        .webp()
        .toBuffer(),
      left: left + 12,
      top: top + 12,
    })
  }

  composites.push({
    input: Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${126 + sceneIndex * 28}" cy="${height - 132}" r="${74 + ((sceneIndex + sectionCount) % 2) * 18}" fill="rgba(255,255,255,0.12)"/>
      </svg>
    `),
  })

  await ensureDir(path.dirname(outputPath))
  await background.composite(composites).webp({ quality: 82 }).toFile(outputPath)
}

export async function stageExtractSource(args = {}) {
  const { sections } = await resolveSelection(args)
  await ensureDir(rootPath('pipeline/source/ocr/stories'))
  await mapSeries(sections, async (section) => {
    const target = rootPath('pipeline/source/ocr/stories', `${section.id}.txt`)
    if (!args.force && (await fileExists(target))) return
    const source = await getRawSourceFile(section)
    const text = await readText(source)
    await writeText(target, text.trim())
  })
}

export async function stageSplitStories(args = {}) {
  const { sections } = await resolveSelection(args)
  await mapSeries(sections, async (section) => {
    const source = rootPath('pipeline/source/ocr/stories', `${section.id}.txt`)
    const rawText = await readText(source)
    const paths = getCanonicalPaths(section.id, 'raw')
    if (args.force || !(await fileExists(paths.storyText))) {
      await writeText(paths.storyText, rawText.trim())
    }
    const storyMeta = await buildBaseStoryMeta(section)
    storyMeta.availableVariants = ['raw']
    await writeStoryMeta(section.id, storyMeta)
    await updateVariantMeta(section.id, 'raw', async (meta) => ({
      ...meta,
      displayTitle: section.originalTitle,
      description: VARIANT_META.raw.explanation,
      tone: 'archival',
      hasAudio: false,
      generation: getGenerationMetadata('source-material', 'extract-source'),
    }))
  })
}

export async function stageGenerateCleaned(args = {}) {
  const { sections } = await resolveSelection(args)
  const models = await loadModelsConfig()
  const promptTemplate = await loadPrompt('cleaned.md')
  await mapSeries(sections, async (section) => {
    const sourcePaths = getCanonicalPaths(section.id, 'raw')
    const targetPaths = getCanonicalPaths(section.id, 'cleaned')
    if (!args.force && (await fileExists(targetPaths.storyText))) return

    const rawText = await readText(sourcePaths.storyText)
    const prompt = renderPrompt(promptTemplate, {
      title: section.originalTitle,
      text: rawText,
    })
    const { text } = await generateText({
      model: models.text.model,
      system: 'You clean OCR text for a literary archive.',
      user: prompt,
      verbosity: models.text.verbosity,
      reasoningEffort: models.text.reasoningEffort,
    })
    await writeText(targetPaths.storyText, text.trim())
    await updateVariantMeta(section.id, 'cleaned', async (meta) => ({
      ...meta,
      displayTitle: section.canonicalTitle,
      description: VARIANT_META.cleaned.explanation,
      tone: 'restored',
      hasAudio: false,
      generation: getGenerationMetadata(models.text.model, 'cleaned.md'),
    }))
    const storyMeta = await readStoryMeta(section.id)
    storyMeta.availableVariants = [...new Set([...storyMeta.availableVariants, 'cleaned'])]
    await writeStoryMeta(section.id, storyMeta)
  })
}

export async function stageGenerateVariants(args = {}) {
  const { sections, variants } = await resolveSelection(args)
  const models = await loadModelsConfig()
  const promptTemplate = await loadPrompt('rewrite-variant.md')
  await mapSeries(sections, async (section) => {
    for (const variant of variants.filter((item) => !['raw', 'cleaned'].includes(item))) {
      const sourceVariant = getVariantSourceVariant(variant)
      const sourceText = await readText(getCanonicalPaths(section.id, sourceVariant).storyText)
      const targetPaths = getCanonicalPaths(section.id, variant)
      if (!args.force && (await fileExists(targetPaths.storyText))) continue
      const prompt = renderPrompt(promptTemplate, {
        variant,
        variantGoal: getVariantGoal(variant),
        title: getVariantDisplayTitle(section, sourceVariant),
        text: sourceText,
      })
      const { text } = await generateText({
        model: models.text.model,
        system: 'You rewrite folktales while keeping them coherent and readable.',
        user: prompt,
        verbosity: models.text.verbosity,
        reasoningEffort: models.text.reasoningEffort,
      })
      await writeText(targetPaths.storyText, text.trim())
      await updateVariantMeta(section.id, variant, async (meta) => ({
        ...meta,
        displayTitle: getVariantDisplayTitle(section, variant),
        description: VARIANT_META[variant].explanation,
        tone: variant,
        hasAudio: false,
        generation: getGenerationMetadata(models.text.model, 'rewrite-variant.md'),
      }))
      const storyMeta = await readStoryMeta(section.id)
      storyMeta.availableVariants = [...new Set([...storyMeta.availableVariants, variant])]
      await writeStoryMeta(section.id, storyMeta)
    }
  })
}

export async function stageGenerateVariantCharacters(args = {}) {
  const { sections, variants } = await resolveSelection(args)
  const models = await loadModelsConfig()
  const pipelineConfig = await loadPipelineConfig()
  const promptTemplate = await loadPrompt('variant-pack.md')
  await mapSeries(sections, async (section) => {
    for (const variant of variants) {
      const paths = getCanonicalPaths(section.id, variant)
      const work = getWorkPaths(section.id, variant)
      if (!args.force && (await fileExists(paths.charactersMeta)) && (await fileExists(work.variantPack))) continue

      const text = await readText(paths.storyText)
      const prompt = renderPrompt(promptTemplate, {
        storyId: section.id,
        originalTitle: section.originalTitle,
        variant,
        variantLabel: VARIANT_META[variant].label,
        variantExplanation: VARIANT_META[variant].explanation,
        text,
        maxCharacters: String(pipelineConfig.maxCharactersPerVariant),
      })

      const { json } = await generateJson({
        model: models.text.model,
        system:
          'You produce structured story metadata for a reading application. Keep outputs concise and high quality.',
        user: prompt,
        verbosity: models.text.verbosity,
        reasoningEffort: models.text.reasoningEffort,
      })

      const characters = (json.characters || []).map((character) => ({
        name: character.name,
        slug: character.slug || slugify(character.name),
        description: character.description,
        visualPrompt: character.visualPrompt,
        imagePath: `characters/${character.slug || slugify(character.name)}.webp`,
      }))

      const variantPack = {
        displayTitle: json.displayTitle || getVariantDisplayTitle(section, variant),
        description: json.description || VARIANT_META[variant].explanation,
        tone: json.tone || variant,
        summary: json.summary || '',
        mainImagePrompt: json.mainImagePrompt,
        characters,
      }

      await writeJson(work.variantPack, variantPack)
      await writeJson(paths.charactersMeta, characters)
      await updateVariantMeta(section.id, variant, async (meta) => ({
        ...meta,
        displayTitle: variantPack.displayTitle,
        description: variantPack.description,
        tone: variantPack.tone,
        characterCount: characters.length,
        summary: variantPack.summary,
        hasAudio: meta.hasAudio ?? false,
        generation: getGenerationMetadata(models.text.model, 'variant-pack.md'),
      }))
    }
  })
}

export async function stageGenerateVariantMainImagePrompts(args = {}) {
  const { sections, variants } = await resolveSelection(args)
  await mapSeries(sections, async (section) => {
    for (const variant of variants) {
      const work = getWorkPaths(section.id, variant)
      if (!args.force && (await fileExists(work.imagePrompt))) continue
      const pack = await readJson(work.variantPack)
      await writeText(work.imagePrompt, pack.mainImagePrompt.trim())
    }
  })
}

async function writeImageFromResponse(response, outputPath) {
  const b64 = response.data?.[0]?.b64_json
  if (!b64) throw new Error('Image response did not include b64_json')
  const buffer = Buffer.from(b64, 'base64')
  await optimizeToWebp(buffer, outputPath)
}

function characterImagePrompt(character, variant, models) {
  return `${character.visualPrompt}\n\nVariant style: ${VARIANT_META[variant].imageStyle}\n\n${models.image.styleSuffix}`
}

function mainImagePrompt(prompt, variant, models) {
  return `${prompt}\n\nVariant style: ${VARIANT_META[variant].imageStyle}\n\n${models.image.styleSuffix}`
}

export async function stageGenerateVariantCharacterImages(args = {}) {
  const { sections, variants } = await resolveSelection(args)
  const models = await loadModelsConfig()
  const pipelineConfig = await loadPipelineConfig()
  await mapSeries(sections, async (section) => {
    for (const variant of variants) {
      const paths = getCanonicalPaths(section.id, variant)
      const characters = await readJson(paths.charactersMeta)
      await ensureDir(paths.charactersDir)
      for (const character of characters) {
        const outputPath = path.join(paths.variantDir, character.imagePath)
        if (!args.force && (await fileExists(outputPath))) continue
        const response = await generateImage({
          model: models.image.model,
          prompt: characterImagePrompt(character, variant, models),
          size: pipelineConfig.defaultImageSize,
          quality: pipelineConfig.defaultImageQuality,
        })
        await writeImageFromResponse(response, outputPath)
      }
    }
  })
}

export async function stageGenerateVariantMainImages(args = {}) {
  const { sections, variants } = await resolveSelection(args)
  const models = await loadModelsConfig()
  const pipelineConfig = await loadPipelineConfig()
  await mapSeries(sections, async (section) => {
    for (const variant of variants) {
      const paths = getCanonicalPaths(section.id, variant)
      const work = getWorkPaths(section.id, variant)
      if (!args.force && (await fileExists(paths.mainImage))) continue
      const prompt = await readText(work.imagePrompt)
      const response = await generateImage({
        model: models.image.model,
        prompt: mainImagePrompt(prompt, variant, models),
        size: pipelineConfig.defaultImageSize,
        quality: pipelineConfig.defaultImageQuality,
      })
      await writeImageFromResponse(response, paths.mainImage)
    }
  })
}

function chooseInstructions(variant, models) {
  return variant === 'english' ? models.tts.englishInstructions : models.tts.norwegianInstructions
}

async function mergeAudioChunks(chunkFiles, outputFile) {
  await ensureDir(path.dirname(outputFile))
  const fileListPath = `${outputFile}.txt`
  const content = chunkFiles.map((file) => `file '${file}'`).join('\n')
  await fs.writeFile(fileListPath, content, 'utf8')

  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(fileListPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy'])
      .save(outputFile)
      .on('end', resolve)
      .on('error', reject)
  })

  await fs.unlink(fileListPath)
}

export async function stageGenerateVariantAudio(args = {}) {
  const { sections, variants } = await resolveSelection(args)
  const models = await loadModelsConfig()
  const pipelineConfig = await loadPipelineConfig()
  await mapSeries(sections, async (section) => {
    for (const variant of variants.filter((item) => pipelineConfig.audioVariants.includes(item))) {
      const paths = getCanonicalPaths(section.id, variant)
      if (!args.force && (await fileExists(paths.audio))) continue
      const text = await readText(paths.storyText)
      const chunks = chunkText(text, pipelineConfig.maxTtsInputLength)
      const work = getWorkPaths(section.id, variant)
      await removeDir(work.ttsChunksDir)
      await ensureDir(work.ttsChunksDir)
      const chunkFiles = []
      for (let index = 0; index < chunks.length; index++) {
        const chunkPath = path.join(work.ttsChunksDir, `${index}.mp3`)
        const audio = await generateSpeech({
          model: models.tts.model,
          voice: models.tts.defaultVoice,
          input: chunks[index],
          instructions: chooseInstructions(variant, models),
        })
        const buffer = Buffer.from(await audio.arrayBuffer())
        await fs.writeFile(chunkPath, buffer)
        chunkFiles.push(chunkPath)
      }
      await mergeAudioChunks(chunkFiles, paths.audio)
      await updateVariantMeta(section.id, variant, async (meta) => ({
        ...meta,
        hasAudio: true,
        generation: {
          ...meta.generation,
          audio: getGenerationMetadata(models.tts.model, 'tts', {
            voice: models.tts.defaultVoice,
          }),
        },
      }))
    }
  })
}

export async function stageBuildContentManifest(args = {}) {
  const { sections } = await resolveSelection(args)
  const pipelineConfig = await loadPipelineConfig()
  const models = await loadModelsConfig()
  const stories = []
  for (const section of sections) {
    const storyMeta = await readStoryMeta(section.id)
    const simplifiedVariantPath = getCanonicalPaths(section.id, pipelineConfig.defaultVariant).variantMeta
    if (await fileExists(simplifiedVariantPath)) {
      const simplifiedVariant = await readJson(simplifiedVariantPath)
      storyMeta.summary = simplifiedVariant.summary || simplifiedVariant.description || storyMeta.summary
    }
    if (!storyMeta.summary) {
      const simplifiedTextPath = getCanonicalPaths(section.id, pipelineConfig.defaultVariant).storyText
      if (await fileExists(simplifiedTextPath)) {
        const fallbackText = (await readText(simplifiedTextPath)).replace(/\s+/g, ' ').trim()
        storyMeta.summary = `${fallbackText.slice(0, 140).trim()}...`
      }
    }
    storyMeta.availableVariants = pipelineConfig.variants.filter((variant) =>
      !!variant,
    )
    await writeStoryMeta(section.id, storyMeta)
    stories.push({
      id: storyMeta.id,
      index: storyMeta.index,
      canonicalTitle: storyMeta.canonicalTitle,
      originalTitle: storyMeta.originalTitle,
      summary: storyMeta.summary,
      availableVariants: storyMeta.availableVariants,
      coverImage: `stories/${storyMeta.id}/${pipelineConfig.defaultVariant}/main.webp`,
    })
  }

  const manifest = {
    name: 'Aieventyr',
    generatedAt: new Date().toISOString(),
    defaultVariant: pipelineConfig.defaultVariant,
    supportedVariants: pipelineConfig.variants,
    generation: {
      textModel: models.text.model,
      imageModel: models.image.model,
      ttsModel: models.tts.model,
      ttsVoice: models.tts.defaultVoice,
    },
    stories,
  }

  await writeJson(rootPath('public/content/manifest.json'), manifest)
}

export async function stageValidateContent(args = {}) {
  const { sections, variants } = await resolveSelection(args)
  const issues = []
  for (const section of sections) {
    const storyMeta = await readStoryMeta(section.id)
    if (!storyMeta.summary) {
      issues.push(`Story ${section.id} is missing summary`)
    }
    for (const variant of variants) {
      const paths = getCanonicalPaths(section.id, variant)
      if (!(await fileExists(paths.storyText))) issues.push(`Missing story text: ${section.id}/${variant}`)
      if (!(await fileExists(paths.variantMeta))) issues.push(`Missing variant meta: ${section.id}/${variant}`)
      if (!(await fileExists(paths.mainImage))) issues.push(`Missing main image: ${section.id}/${variant}`)
      if (!(await fileExists(paths.charactersMeta))) issues.push(`Missing characters: ${section.id}/${variant}`)
      const sectionsFile = path.join(paths.variantDir, 'sections.json')
      if (!(await fileExists(sectionsFile))) issues.push(`Missing sections: ${section.id}/${variant}`)
      const variantMeta = (await fileExists(paths.variantMeta)) ? await readJson(paths.variantMeta) : null
      const characters = (await fileExists(paths.charactersMeta)) ? await readJson(paths.charactersMeta) : []
      const sectionsData = (await fileExists(sectionsFile)) ? await readJson(sectionsFile) : []
      for (const character of characters) {
        const fullImagePath = path.join(paths.variantDir, character.imagePath)
        if (!(await fileExists(fullImagePath))) {
          issues.push(`Missing character image: ${section.id}/${variant}/${character.imagePath}`)
        }
        if (!character.imagePath.startsWith('characters/')) {
          issues.push(`Cross-variant image path detected: ${section.id}/${variant}/${character.imagePath}`)
        }
      }
      if (variantMeta?.hasAudio && !(await fileExists(paths.audio))) {
        issues.push(`Missing audio: ${section.id}/${variant}`)
      }
      for (const scene of sectionsData) {
        const scenePath = path.join(paths.variantDir, scene.imagePath)
        if (!(await fileExists(scenePath))) {
          issues.push(`Missing inline scene image: ${section.id}/${variant}/${scene.imagePath}`)
        }
      }
    }
  }

  if (issues.length) {
    throw new Error(`Content validation failed:\n${issues.join('\n')}`)
  }
}

export async function stageBuildInlineScenes(args = {}) {
  const { sections, variants } = await resolveSelection(args)
  for (const section of sections) {
    for (const variant of variants) {
      const paths = getCanonicalPaths(section.id, variant)
      const variantMeta = (await fileExists(paths.variantMeta)) ? await readJson(paths.variantMeta) : null
      if (!variantMeta) continue
      const text = await readText(paths.storyText)
      const characters = (await fileExists(paths.charactersMeta)) ? await readJson(paths.charactersMeta) : []
      const sectionGroups = splitTextIntoSections(text)
      const sceneDir = path.join(paths.variantDir, 'scenes')
      await ensureDir(sceneDir)
      const characterImagePaths = []
      for (const character of characters) {
        const imagePath = path.join(paths.variantDir, character.imagePath)
        if (await fileExists(imagePath)) {
          characterImagePaths.push(imagePath)
        }
      }
      const sceneEntries = []
      for (let index = 0; index < sectionGroups.length; index++) {
        const sectionText = sectionGroups[index].join('\n\n').trim()
        const sceneFileName = `scenes/scene-${index + 1}.webp`
        const absoluteScenePath = path.join(paths.variantDir, sceneFileName)
        await createInlineSceneImage({
          mainImagePath: paths.mainImage,
          characterImagePaths,
          outputPath: absoluteScenePath,
          sceneIndex: index,
          sectionCount: sectionGroups.length,
          variant,
        })
        sceneEntries.push({
          id: `section-${index + 1}`,
          title: createSectionTitle(sectionText, index),
          text: sectionText,
          imagePath: sceneFileName,
        })
      }
      await writeJson(path.join(paths.variantDir, 'sections.json'), sceneEntries)
      await updateVariantMeta(section.id, variant, async (meta) => ({
        ...meta,
        characterCount: characters.length,
        hasInlineScenes: true,
        paths: {
          ...meta.paths,
          sections: 'sections.json',
        },
      }))
    }
  }
}

export async function stageCompareTtsVoices() {
  const models = await loadModelsConfig()
  const sampleText =
    'Det var en gang en liten gutt som gikk over fjellet i kveldssol og tenkte at verden var større enn han hadde trodd.'
  const outputDir = rootPath('pipeline/work/tts-voice-samples')
  await ensureDir(outputDir)
  for (const voice of models.tts.voiceCandidates) {
    const audio = await generateSpeech({
      model: models.tts.model,
      voice,
      input: sampleText,
      instructions: models.tts.norwegianInstructions,
    })
    const buffer = Buffer.from(await audio.arrayBuffer())
    await fs.writeFile(path.join(outputDir, `${voice}.mp3`), buffer)
  }
}

export async function runPipelineAll(args = {}) {
  await stageExtractSource(args)
  await stageSplitStories(args)
  await stageGenerateCleaned(args)
  await stageGenerateVariants(args)
  await stageGenerateVariantCharacters(args)
  await stageGenerateVariantMainImagePrompts(args)
  await stageGenerateVariantCharacterImages(args)
  await stageGenerateVariantMainImages(args)
  await stageGenerateVariantAudio(args)
  await stageBuildInlineScenes(args)
  await stageBuildContentManifest(args)
  await stageValidateContent(args)
}

export async function runPipelineStory(args = {}) {
  await runPipelineAll(args)
}

export async function runPipelineVariant(args = {}) {
  await runPipelineAll(args)
}
