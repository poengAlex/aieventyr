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

class RateLimiter {
  constructor(maxRequests, timeWindow) {
    this.maxRequests = maxRequests
    this.timeWindow = timeWindow
    this.tokens = maxRequests
    this.lastRefill = Date.now()
  }

  async acquireToken() {
    while (this.tokens <= 0) {
      const now = Date.now()
      const timePassed = now - this.lastRefill
      if (timePassed >= this.timeWindow) {
        this.tokens = this.maxRequests
        this.lastRefill = now
      } else {
        await delay(100)
      }
    }
    this.tokens--
  }
}

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

const rateLimiter = new RateLimiter(5, 60000) // 5 requests per second

async function generateImage(prompt, outputPath) {
  // Check if image already exists
  if (await fileExists(outputPath)) {
    console.log(`Skipping existing image: ${outputPath}`)
    return
  }

  try {
    await rateLimiter.acquireToken()
    console.log('Generating image with prompt:', prompt)
    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt: '' + prompt + ' . Use a classic Norwegian look. Do not have any text in the image.',
      n: 1,
      size: '1024x1024',
      style: 'vivid',
      quality: 'hd',
    })

    //check if the reponse has errors
    if (response.errors) {
      console.error('Error generating image. Prompt:', prompt)
      console.error(response.errors)
      return
    }

    const imageUrl = response.data[0].url
    if (!imageUrl) {
      console.error('Error generating image. Prompt:', prompt)
      return
    }
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

  // Generate all images in parallel while respecting rate limits
  const imagePromises = []

  // Add character image generation promises
  data.characters.forEach((character, index) => {
    const imagePath = path.join(CHARACTERS_DIR, `tale${taleNumber}_character${index}.png`)
    imagePromises.push(generateImage(character.prompt, imagePath))
  })

  // Add main image variant generation promises
  const variants = {
    [IMAGE_TYPES.CLEANED]: data.cleanedMainImagePrompt,
    [IMAGE_TYPES.MODERN]: data.modernMainImagePrompt,
    [IMAGE_TYPES.CHILD]: data.childMainImagePrompt,
    [IMAGE_TYPES.SIMPLIFIED]: data.simplifiedMainImagePrompt,
    [IMAGE_TYPES.ENGLISH]: data.englishMainImagePrompt,
  }

  Object.entries(variants).forEach(([variant, prompt]) => {
    const imagePath = path.join(MAIN_IMAGES_DIR, variant, `tale${taleNumber}.png`)
    imagePromises.push(generateImage(prompt, imagePath))
  })

  // Wait for all images to be generated
  await Promise.all(imagePromises)
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

    // Process files in parallel
    await Promise.all(
      files.map((file) => {
        console.log(`Processing ${file}...`)
        return processFile(file).then(() => console.log(`Completed ${file}`))
      }),
    )

    console.log('All images generated successfully')
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
