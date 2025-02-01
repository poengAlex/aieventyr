import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read section.json
const sectionFilePath = path.join(__dirname, 'updated_sections_manual.json')
const sectionData = JSON.parse(fs.readFileSync(sectionFilePath, 'utf8'))
const outputDir = path.join(__dirname, 'output/section')
// Ensure the output directory exists
if (fs.existsSync(outputDir)) {
  //delete folder
  fs.rmSync(outputDir, { recursive: true, force: true })
}
fs.mkdirSync(outputDir, { recursive: true })

// Process each section
sectionData.forEach((section) => {
  // console.log(`Processing section:`, section)
  const { start, stop, id } = section
  const outputFilePath = path.join(outputDir, `${id}.txt`)
  let combinedText = ''

  for (let i = start; i <= stop; i++) {
    if (start === stop && i === stop) {
      //skip
    } else if (start < 0 || stop < 0) {
      //skip
    } else if (stop < start) {
      console.error(`Invalid section: ${section}`)
    } else {
      const inputFilePath = path.join(__dirname, `output/text/page.${i}.txt`)
      if (fs.existsSync(inputFilePath)) {
        const text = fs.readFileSync(inputFilePath, 'utf8')
        combinedText += text + '\n'
      } else {
        console.error(`File not found: ${inputFilePath}`)
      }
    }
  }

  // Write combined text to output file
  fs.writeFileSync(outputFilePath, combinedText, 'utf8')
  // console.log(`Section ${id} written to ${outputFilePath}`)
})
