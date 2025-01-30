import 'dotenv/config'
import fs from 'fs/promises'
import fsExtra from 'fs-extra' // For easy folder management
import OpenAI from 'openai'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Directories
const FOLDER_OUTPUT = path.join(__dirname, '../../public/new/cleaned')
const FOLDER_INPUT = path.join(__dirname, '../../public/new/tales')
const SECTION_PATH = path.join(__dirname, '../../public/sections_new.json')

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // API key from .env
})

async function processText(text) {
  const prompt = `
    The following text is OCR output. Your task is to:
    1. Fix obvious OCR errors while maintaining the original old Norwegian/Danish language style.
    2. Remove headers and footers like "X Asbjørnsen og Moe." or "Norske Folke-Eventyr. Y", where X and Y are page numbers.
    3. Try to keep the original text structure and formatting.
    4. Remove nr from the headings.

    Only return the text, no introduction or explanation needed. Same goes for outtros and notes.
    No unnecessary spaces or line breaks.

    Correct and clean the text below:

    ${text}
  `

  const chatCompletion = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 16384,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: text },
    ],
    response_format: {
      type: 'text',
    },
  })

  return chatCompletion.choices[0].message.content
}

async function setupCleanedFolder() {
  try {
    // Delete the folder if it exists
    if (await fsExtra.pathExists(FOLDER_OUTPUT)) {
      await fsExtra.remove(FOLDER_OUTPUT)
      console.log(`Deleted existing folder: ${FOLDER_OUTPUT}`)
    }

    // Recreate the folder
    await fsExtra.ensureDir(FOLDER_OUTPUT)
    console.log(`Created new folder: ${FOLDER_OUTPUT}`)
  } catch (error) {
    console.error(`Error setting up cleaned folder: ${error.message}`)
  }
}

async function processSection(section) {
  const { id, title, start, index } = section

  if (start === -1) {
    console.log(`Skipping section: ${title} (ID: ${id}, Start: -1)`)
    return
  }

  console.log(`Processing section: ${title} (ID: ${id})`)

  try {
    const filePath = `${FOLDER_INPUT}/tale_${index}.txt`
    const text = await fs.readFile(filePath, 'utf-8')
    const cleanedText = await processText(text)
    const outputFilePath = `${FOLDER_OUTPUT}/tale_${index}.txt`
    await fs.writeFile(outputFilePath, cleanedText, 'utf-8')
    console.log(`Cleaned text saved to ${outputFilePath}`)
    //Compare the length of the cleaned text with the original text
    console.log(
      `Original text length: ${text.length}, Cleaned text length: ${cleanedText.length}. Delta: ${text.length - cleanedText.length}`,
    )
  } catch (error) {
    console.error(`Error processing section ID: ${id}`, error.message)
  }
}

async function processSections() {
  try {
    const sections = JSON.parse(await fs.readFile(SECTION_PATH, 'utf-8'))
    console.log(`Processing ${sections.length} sections in parallel...`)

    // Set up cleaned folder before processing
    await setupCleanedFolder()

    const processingTasks = sections.map(processSection)
    await Promise.all(processingTasks)

    console.log('All sections processed successfully.')
  } catch (error) {
    console.error('Error:', error.message)
  }
}

processSections()
