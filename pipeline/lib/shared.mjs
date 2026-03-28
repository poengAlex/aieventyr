import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
export const ROOT_DIR = path.resolve(__dirname, '../..')

export const VARIANT_META = {
  raw: {
    label: 'Original',
    explanation: 'The raw OCR extraction from the source material.',
    imageStyle:
      'Lean into archival Nordic storybook mood, weathered textures, and classical illustration details.',
  },
  cleaned: {
    label: 'Cleaned',
    explanation: 'OCR restored while keeping the original literary voice.',
    imageStyle:
      'Keep the illustration faithful to the historical folktale world, with balanced readability and classic atmosphere.',
  },
  simplified: {
    label: 'Simplified',
    explanation: 'Modern Norwegian with clearer phrasing and easier reading flow.',
    imageStyle:
      'Use approachable storybook illustration with warm light, readable silhouettes, and inviting Nordic scenery.',
  },
  english: {
    label: 'English',
    explanation: 'An English retelling that stays close to the folktale.',
    imageStyle:
      'Use rich fairy-tale illustration with a timeless international storybook feel grounded in Norway.',
  },
  'child-friendly': {
    label: 'Child Friendly',
    explanation: 'A gentler version for younger readers with softer language and mood.',
    imageStyle:
      'Use bright, friendly, playful illustration with soft shapes, expressive faces, and low-fright storytelling.',
  },
  modern: {
    label: 'Modern',
    explanation: 'A contemporary retelling that adapts the story to today while keeping its spirit.',
    imageStyle:
      'Use contemporary Nordic illustration with bolder composition, modern details, and cinematic color contrast.',
  },
}

export function parseArgs(argv) {
  const args = {
    story: undefined,
    variant: undefined,
    force: false,
  }

  for (let index = 0; index < argv.length; index++) {
    const part = argv[index]
    if (part === '--force') args.force = true
    if (part === '--story') args.story = argv[index + 1]
    if (part === '--variant') args.variant = argv[index + 1]
    if (part.startsWith('--story=')) args.story = part.split('=').slice(1).join('=')
    if (part.startsWith('--variant=')) args.variant = part.split('=').slice(1).join('=')
  }

  return args
}

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

export async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export async function readText(filePath) {
  return fs.readFile(filePath, 'utf8')
}

export async function writeText(filePath, value) {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, value, 'utf8')
}

export function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function mapSeries(items, iteratee) {
  const results = []
  for (const item of items) {
    results.push(await iteratee(item))
  }
  return results
}

export function rootPath(...parts) {
  return path.join(ROOT_DIR, ...parts)
}

export async function loadPipelineConfig() {
  return readJson(rootPath('pipeline/config/pipeline.json'))
}

export async function loadModelsConfig() {
  return readJson(rootPath('pipeline/config/models.json'))
}

export async function loadSections() {
  const pipelineConfig = await loadPipelineConfig()
  const sections = await readJson(rootPath(pipelineConfig.sourceSectionsFile))
  return sections.map((section) => ({
    id: section.id,
    index: section.index,
    originalTitle: section.title,
    canonicalTitle: section.title_cleaned || section.title,
    englishTitle: section.title_modern || section.title_cleaned || section.title,
  }))
}

export async function resolveSelection(args = {}) {
  const pipelineConfig = await loadPipelineConfig()
  const sections = await loadSections()
  let selectedSections = sections
  if (args.story) {
    selectedSections = sections.filter(
      (section) => String(section.index) === String(args.story) || section.id === args.story,
    )
  }

  if (!selectedSections.length) {
    throw new Error(`No stories matched selection "${args.story}"`)
  }

  let selectedVariants = pipelineConfig.variants
  if (args.variant) {
    if (!pipelineConfig.variants.includes(args.variant)) {
      throw new Error(`Unknown variant "${args.variant}"`)
    }
    selectedVariants = [args.variant]
  }

  return { pipelineConfig, sections: selectedSections, variants: selectedVariants }
}

export function getCanonicalPaths(storyId, variant) {
  const storyDir = rootPath('public/content/stories', storyId)
  const variantDir = path.join(storyDir, variant)
  return {
    storyDir,
    storyMeta: path.join(storyDir, 'story.json'),
    variantDir,
    variantMeta: path.join(variantDir, 'variant.json'),
    storyText: path.join(variantDir, 'story.txt'),
    mainImage: path.join(variantDir, 'main.webp'),
    charactersMeta: path.join(variantDir, 'characters.json'),
    charactersDir: path.join(variantDir, 'characters'),
    audio: path.join(variantDir, 'audio.mp3'),
  }
}

export function getWorkPaths(storyId, variant) {
  return {
    variantPack: rootPath('pipeline/work/variant-packs', storyId, `${variant}.json`),
    imagePrompt: rootPath('pipeline/work/image-prompts', storyId, `${variant}.txt`),
    scenePrompts: rootPath('pipeline/work/scene-prompts', storyId, `${variant}.json`),
    ttsChunksDir: rootPath('pipeline/work/tts-chunks', storyId, variant),
  }
}

export async function loadPrompt(name) {
  return readText(rootPath('pipeline/prompts', name))
}

export function renderPrompt(template, replacements) {
  return template.replace(/{{(\w+)}}/g, (_, key) => replacements[key] ?? '')
}

export function getVariantSourceVariant(variant) {
  return variant === 'cleaned' ? 'raw' : 'cleaned'
}

export function getVariantGoal(variant) {
  const goals = {
    simplified:
      'Rewrite into clear modern Norwegian, keep the story intact, and make the reading flow easier.',
    english:
      'Translate into vivid natural English while preserving the folktale plot and tone.',
    'child-friendly':
      'Rewrite for younger children with gentler wording, clearer beats, and reduced threat while keeping the story shape.',
    modern:
      'Retell the folktale in contemporary society while preserving the core premise and emotional arc.',
  }
  return goals[variant]
}

export function getVariantDisplayTitle(section, variant) {
  if (variant === 'raw') return section.originalTitle
  if (variant === 'cleaned' || variant === 'simplified' || variant === 'child-friendly') {
    return section.canonicalTitle
  }
  if (variant === 'english') return section.englishTitle
  if (variant === 'modern') return section.canonicalTitle
  return section.canonicalTitle
}

export async function optimizeToWebp(inputBuffer, outputPath) {
  await ensureDir(path.dirname(outputPath))
  await sharp(inputBuffer).webp({ quality: 82 }).toFile(outputPath)
}

export async function createStyledDerivative(inputPath, outputPath, variant) {
  const base = sharp(inputPath)
  const styleMap = {
    raw: { saturation: 0.6, brightness: 0.92, tint: { r: 190, g: 170, b: 140 } },
    cleaned: { saturation: 1.0, brightness: 1.0, tint: { r: 245, g: 238, b: 225 } },
    simplified: { saturation: 1.12, brightness: 1.06, tint: { r: 238, g: 241, b: 214 } },
    english: { saturation: 0.98, brightness: 1.0, tint: { r: 218, g: 229, b: 241 } },
    'child-friendly': { saturation: 1.28, brightness: 1.08, tint: { r: 255, g: 227, b: 214 } },
    modern: { saturation: 1.18, brightness: 1.02, tint: { r: 221, g: 232, b: 232 } },
  }
  const style = styleMap[variant] || styleMap.cleaned
  await ensureDir(path.dirname(outputPath))
  await base
    .modulate({ saturation: style.saturation, brightness: style.brightness })
    .tint(style.tint)
    .webp({ quality: 82 })
    .toFile(outputPath)
}

export async function createPlaceholderCard(outputPath, title, subtitle = '') {
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeSubtitle = subtitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const svg = `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#e8d7b7"/>
          <stop offset="100%" stop-color="#f8f1e4"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="72" fill="url(#bg)"/>
      <circle cx="512" cy="300" r="170" fill="#d4c09b"/>
      <rect x="240" y="520" width="544" height="220" rx="48" fill="#fdf8ee" opacity="0.92"/>
      <text x="512" y="610" font-size="58" text-anchor="middle" font-family="Georgia, serif" fill="#3d3625">${safeTitle}</text>
      <text x="512" y="684" font-size="30" text-anchor="middle" font-family="Georgia, serif" fill="#6d624f">${safeSubtitle}</text>
    </svg>
  `
  await ensureDir(path.dirname(outputPath))
  await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(outputPath)
}

export function splitTextIntoSections(text) {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  const paragraphs = normalized
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.replace(/\s+\n/g, '\n').trim())
    .filter(Boolean)

  if (paragraphs.length <= 1) {
    const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean)
    const chunkSize = Math.max(3, Math.ceil(sentences.length / 3))
    return sentences.reduce((sections, sentence, index) => {
      const sectionIndex = Math.floor(index / chunkSize)
      sections[sectionIndex] ||= []
      sections[sectionIndex].push(sentence)
      return sections
    }, [])
  }

  const targetCount = Math.min(4, Math.max(2, Math.ceil(paragraphs.length / 4)))
  const chunkSize = Math.ceil(paragraphs.length / targetCount)
  const sections = []
  for (let index = 0; index < paragraphs.length; index += chunkSize) {
    sections.push(paragraphs.slice(index, index + chunkSize))
  }
  return sections
}

export function createSectionTitle(text, fallbackIndex) {
  const firstSentence = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)[0]
    ?.replace(/^["'«»]+|["'«»]+$/g, '')
    .trim()

  if (!firstSentence) {
    return `Part ${fallbackIndex + 1}`
  }

  const words = firstSentence.split(' ').slice(0, 7).join(' ')
  return words.length < firstSentence.length ? `${words}...` : words
}

export async function copyFile(source, target) {
  await ensureDir(path.dirname(target))
  await fs.copyFile(source, target)
}

export async function listFiles(dirPath) {
  try {
    return await fs.readdir(dirPath)
  } catch {
    return []
  }
}

export function chunkText(text, maxLength) {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const chunks = []
  let current = ''
  for (const sentence of sentences) {
    if (`${current} ${sentence}`.trim().length <= maxLength) {
      current = `${current} ${sentence}`.trim()
      continue
    }
    if (current) chunks.push(current)
    current = sentence.trim()
  }
  if (current) chunks.push(current)
  return chunks.filter(Boolean)
}

export function extractOutputText(response) {
  const content = (response.output || [])
    .flatMap((item) => item.content || [])
    .find((item) => item.type === 'output_text')
  return content?.text ?? ''
}

export async function removeDir(dirPath) {
  await fs.rm(dirPath, { recursive: true, force: true })
}
