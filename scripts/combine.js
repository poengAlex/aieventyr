import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get the current directory name (needed because of ES modules)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Define the directory containing the page files and output file
const inputDir = path.join(__dirname, 'output', 'text')
const outputFile = path.join(__dirname, 'combined.txt')

// Read the directory to get the list of page files
fs.readdir(inputDir, (err, files) => {
  if (err) {
    console.error('Error reading input directory:', err)
    return
  }

  // Filter to only include .txt files and sort them by page number
  const txtFiles = files
    .filter((file) => file.endsWith('.txt'))
    .sort((a, b) => {
      const pageA = parseInt(a.match(/page\.(\d+)/)?.[1] || 0, 10)
      const pageB = parseInt(b.match(/page\.(\d+)/)?.[1] || 0, 10)
      return pageA - pageB
    })

  // Combine the content of all text files with headers
  let combinedContent = ''
  txtFiles.forEach((file) => {
    console.log('Processing file:', file)
    const filePath = path.join(inputDir, file)
    const pageNumber = file.match(/page\.(\d+)/)?.[1] || 'UNKNOWN'
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      combinedContent += `[PAGE ${pageNumber}]\n${content}\n\n`
    } catch (readErr) {
      console.error(`Error reading file ${filePath}:`, readErr)
    }
  })

  // Write the combined content to the output file
  fs.writeFile(outputFile, combinedContent, (err) => {
    if (err) {
      console.error('Error writing to output file:', err)
    } else {
      console.log('Combined text file created at:', outputFile)
    }
  })
})
