import { fromPath } from 'pdf2pic'
import Tesseract from 'tesseract.js'
import path from 'path'
import fs from 'fs/promises'

async function convertPdfToImages(pdfPath, imageOutputDir) {
  const pdf2pic = fromPath(pdfPath, {
    density: 300, // Image quality
    saveFilename: 'page', // Base name for saved images
    savePath: imageOutputDir,
    format: 'jpeg', // Output format
    width: null, // Maintain original aspect ratio
    height: null,
  })

  try {
    const images = await pdf2pic.bulk(-1) // Process all pages
    console.log(`Converted PDF to images:`)
    images.forEach((img, index) => console.log(`Page ${index + 1}: ${img.path}`))
    return images.map((img) => img.path) // Return paths to converted images
  } catch (error) {
    console.error('Error during PDF conversion:', error)
    throw error
  }
}

async function extractTextFromImages(imagePaths, textOutputDir) {
  const allText = []

  for (const imagePath of imagePaths) {
    console.log(`Processing: ${imagePath}`)
    try {
      //Danish is 'dan', Norwegian is 'nor'
      const result = await Tesseract.recognize(imagePath, 'dan') // 'nor' for Norwegian
      const text = result.data.text
      console.log(`Extracted Text from ${path.basename(imagePath)}:`)

      const textFileName = path.basename(imagePath, '.jpeg') + '.txt'
      const textFilePath = path.join(textOutputDir, textFileName)
      await fs.writeFile(textFilePath, text, 'utf-8')
      console.log(`Extracted text saved to: ${textFilePath}`)

      allText.push(text)
    } catch (error) {
      console.error(`Error processing ${imagePath}:`, error)
    }
  }

  return allText.join('\n\n')
}

async function processPdf(pdfPath, imageOutputDir, textOutputDir, joinedTextFile) {
  try {
    // Ensure directories exist
    await fs.mkdir(imageOutputDir, { recursive: true })
    await fs.mkdir(textOutputDir, { recursive: true })

    // Convert PDF to images
    const imagePaths = await convertPdfToImages(pdfPath, imageOutputDir)

    // Extract text from images
    const combinedText = await extractTextFromImages(imagePaths, textOutputDir)

    // Save combined text to a single file
    await fs.writeFile(joinedTextFile, combinedText, 'utf-8')
    console.log(`Combined text saved to: ${joinedTextFile}`)
  } catch (error) {
    console.error('Error:', error)
  }
}

// Example usage
const pdfPath = 'public/norskefolkeeven01moegoog.pdf'
const imageOutputDir = 'output/images'
const textOutputDir = 'output/text'
const joinedTextFile = 'output/joined.txt'
processPdf(pdfPath, imageOutputDir, textOutputDir, joinedTextFile)
