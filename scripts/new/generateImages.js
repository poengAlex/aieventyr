import 'dotenv/config'
import fs from 'fs/promises'
import OpenAI from 'openai'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const INPUT_DIR = path.join(__dirname, '../../public/new/data')
const OUTPUT_DIR = path.join(__dirname, '../../public/new/images')
const CHARACTERS_DIR = path.join(OUTPUT_DIR, 'characters')
const MAIN_IMAGES_DIR = path.join(OUTPUT_DIR, 'main')

const IMAGE_TYPES = {
  CLEANED: 'cleaned',
  MODERN: 'modern',
  CHILD: 'child',
  SIMPLIFIED: 'simplified',
  ENGLISH: 'english',
}

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'],
})

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fileExists(path) {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

async function generateImage(prompt, outputPath) {
  // Check if image already exists
  if (await fileExists(outputPath)) {
    console.log(`Skipping existing image: ${outputPath}`)
    return
  }

  try {
    console.log('Generating image with prompt:', prompt)
    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt: '' + prompt + ' . Use a classic Norwegian look. Do not have any text in the image.',
      n: 1,
      size: '1024x1024',
      style: 'vivid',
      quality: 'hd',
    })

    const imageUrl = response.data[0].url
    const imageResponse = await fetch(imageUrl)
    const buffer = await imageResponse.arrayBuffer()
    await fs.writeFile(outputPath, Buffer.from(buffer))

    // Rate limiting delay
    await delay(1000)
  } catch (error) {
    console.error('Error generating image. Prompt:', prompt)
    // throw error
  }
}

async function processFile(filename) {
  const data = JSON.parse(await fs.readFile(path.join(INPUT_DIR, filename), 'utf-8'))
  const taleNumber = filename.replace('tale_', '').replace('.json', '')

  // Validate JSON format
  if (
    !data.characters ||
    !Array.isArray(data.characters) ||
    !data.cleanedMainImagePrompt ||
    !data.modernMainImagePrompt ||
    !data.childMainImagePrompt ||
    !data.simplifiedMainImagePrompt ||
    !data.englishMainImagePrompt
  ) {
    throw new Error(`Invalid JSON format in file: ${filename}`)
  }

  // Generate character images
  for (const [index, character] of data.characters.entries()) {
    const imagePath = path.join(CHARACTERS_DIR, `tale${taleNumber}_character${index}.png`)
    console.log(`Generating character image for ${character.name}...`)
    await generateImage(character.prompt, imagePath)
  }

  // Generate main images for each variant
  const variants = {
    [IMAGE_TYPES.CLEANED]: data.cleanedMainImagePrompt,
    [IMAGE_TYPES.MODERN]: data.modernMainImagePrompt,
    [IMAGE_TYPES.CHILD]: data.childMainImagePrompt,
    [IMAGE_TYPES.SIMPLIFIED]: data.simplifiedMainImagePrompt,
    [IMAGE_TYPES.ENGLISH]: data.englishMainImagePrompt,
  }

  for (const [variant, prompt] of Object.entries(variants)) {
    const imagePath = path.join(MAIN_IMAGES_DIR, variant, `tale${taleNumber}.png`)
    console.log(`Generating ${variant} main image for tale ${taleNumber}...`)
    await generateImage(prompt, imagePath)
  }
}

async function main() {
  try {
    // Create output directories
    await fs.mkdir(OUTPUT_DIR, { recursive: true })
    await fs.mkdir(CHARACTERS_DIR, { recursive: true })
    await fs.mkdir(MAIN_IMAGES_DIR, { recursive: true })

    // Create variant directories
    for (const variant of Object.values(IMAGE_TYPES)) {
      await fs.mkdir(path.join(MAIN_IMAGES_DIR, variant), { recursive: true })
    }

    // Get all JSON files
    const files = (await fs.readdir(INPUT_DIR)).filter((f) => f.endsWith('.json'))

    // Process each file
    for (const file of files) {
      console.log(`Processing ${file}...`)
      await processFile(file)
      console.log(`Completed ${file}`)
    }

    console.log('All images generated successfully')
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
