import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const INPUT_DIR = path.join(__dirname, '../../public/output')
const REJECTED_DIR = path.join(__dirname, '../../public/new/rejected')

async function fileExists(path) {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

async function convertToWebp(inputPath) {
  const webpPath = `${inputPath}.webp`

  // Skip if webp version exists
  if (await fileExists(webpPath)) {
    console.log(`Skipping existing webp: ${webpPath}`)
    return
  }

  try {
    await sharp(inputPath).webp({ quality: 80 }).toFile(webpPath)

    console.log(`Converted: ${inputPath} -> ${webpPath}`)
  } catch (error) {
    console.error(`Error converting ${inputPath}:`, error)
  }
}

async function processDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      await processDirectory(fullPath)
    } else if (entry.isFile() && /\.(png|jpg|jpeg)$/i.test(entry.name)) {
      await convertToWebp(fullPath)
    }
  }
}

async function main() {
  try {
    console.log('Starting WebP conversion...')
    await processDirectory(INPUT_DIR)
    await processDirectory(REJECTED_DIR)
    console.log('WebP conversion completed')
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
