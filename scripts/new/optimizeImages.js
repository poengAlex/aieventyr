import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const IMAGES_DIR = path.join(__dirname, '../../public/new/images')
const OPTIMIZED_DIR = path.join(__dirname, '../../public/new/images-optimized')

async function fileExists(path) {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

async function optimizeImage(inputPath, outputPath) {
  // Skip if optimized version exists
  if (await fileExists(outputPath)) {
    console.log(`Skipping existing optimized image: ${outputPath}`)
    return
  }

  try {
    await sharp(inputPath).webp({ quality: 80 }).toFile(outputPath)

    console.log(`Optimized: ${inputPath} -> ${outputPath}`)
  } catch (error) {
    console.error(`Error optimizing ${inputPath}:`, error)
  }
}

async function processDirectory(inputDir, outputDir) {
  await fs.mkdir(outputDir, { recursive: true })

  const entries = await fs.readdir(inputDir, { withFileTypes: true })

  for (const entry of entries) {
    const inputPath = path.join(inputDir, entry.name)
    const outputPath = path.join(outputDir, entry.name.replace('.png', '.webp'))

    if (entry.isDirectory()) {
      await processDirectory(inputPath, outputPath)
    } else if (entry.isFile() && entry.name.endsWith('.png')) {
      await optimizeImage(inputPath, outputPath)
    }
  }
}

async function main() {
  try {
    console.log('Starting image optimization...')
    await processDirectory(IMAGES_DIR, OPTIMIZED_DIR)
    console.log('Image optimization completed')
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
