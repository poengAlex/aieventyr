import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Directories
const BOOK_PATH = path.join(__dirname, '../../public/new/book_simple.txt')
const SECTION_PATH = path.join(__dirname, '../../public/sections.json')
const outputDir = path.join(__dirname, '../../public/new/tales')

// const sections = JSON.parse(await fs.readFile(SECTION_PATH, 'utf-8'))

try {
  // Ensure output directory exists
  //delete the directory if it exists
  if (fs.existsSync(outputDir)) {
    fs.rmdirSync(outputDir, { recursive: true })
  }
  await fs.promises.mkdir(outputDir, { recursive: true })

  const book = await fs.promises.readFile(BOOK_PATH, 'utf8')

  // Skip first 355 rows

  // Process sections 1-35 sequentially
  for (let sectionNumber = 1; sectionNumber <= 35; sectionNumber++) {
    // Look for specific section number at start of line
    const sectionPattern = new RegExp(`^${sectionNumber}\\.\\s.*$`, 'm')
    const match = book.match(sectionPattern)

    if (!match) {
      console.log(`Section ${sectionNumber} not found`)
      continue
    }

    const startIndex = match.index
    // Look for next section or end of file
    const nextPattern = new RegExp(`^${sectionNumber + 1}\\.\\s.*$`, 'm')
    const nextMatch = book.match(nextPattern)
    const endIndex = nextMatch ? nextMatch.index : book.length

    let text = book.substring(startIndex, endIndex).trim()

    const outputFilePath = path.join(outputDir, `tale_${sectionNumber}.txt`)
    await fs.promises.writeFile(outputFilePath, text, 'utf8')
    console.log(`Section ${sectionNumber} saved (${text.length} chars)`)
  }
} catch (error) {
  console.error('Error:', error)
  process.exit(1)
}
