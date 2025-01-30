import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Directories
const inputDir = path.join(__dirname, '../../public/new/book')
const outputFile = path.join(__dirname, '../../public/new/book.txt')

// Get all page files sorted by number
const files = fs
  .readdirSync(inputDir)
  .filter((file) => file.match(/^page\.\d+\.txt$/))
  .sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)[0], 10)
    const numB = parseInt(b.match(/\d+/)[0], 10)
    return numA - numB
  })

// Join all pages
const content = files.map((file) => fs.readFileSync(path.join(inputDir, file), 'utf8')).join('\n')

// Write to output file
fs.writeFileSync(outputFile, content, 'utf8')

console.log('Book pages joined successfully into book.txt')
