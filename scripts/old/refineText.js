import 'dotenv/config'
import fs from 'fs/promises'
import fsExtra from 'fs-extra' // For easy folder management
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // API key from .env
})

async function processText(id) {
  const filePath = `output/section/${id}.txt`
  const text = await fs.readFile(filePath, 'utf-8')

  const prompt = `
    The following text is OCR output. Your task is to:
    1. Fix obvious OCR errors while maintaining the original old Norwegian/Danish language style.
    2. Remove headers and footers like "X Asbjørnsen og Moe." or "Norske Folke-Eventyr. Y", where X and Y are page numbers.
    3. Exclude parts that clearly belong to the previous or next story.

    Only return the text, no introduction or explanation needed. Same goes for outtros and notes.
    No unnecessary spaces or line breaks.

    Correct and clean the text below:

    ${text}
  `

  const chatCompletion = await client.chat.completions.create({
    model: 'gpt-4o',
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
  const cleanedFolderPath = 'output/cleaned'

  try {
    // Delete the folder if it exists
    if (await fsExtra.pathExists(cleanedFolderPath)) {
      await fsExtra.remove(cleanedFolderPath)
      console.log(`Deleted existing folder: ${cleanedFolderPath}`)
    }

    // Recreate the folder
    await fsExtra.ensureDir(cleanedFolderPath)
    console.log(`Created new folder: ${cleanedFolderPath}`)
  } catch (error) {
    console.error(`Error setting up cleaned folder: ${error.message}`)
  }
}

async function processSection(section) {
  const { id, title, start } = section

  if (start === -1) {
    console.log(`Skipping section: ${title} (ID: ${id}, Start: -1)`)
    return
  }

  console.log(`Processing section: ${title} (ID: ${id})`)

  try {
    const cleanedText = await processText(id)
    const outputFilePath = `output/cleaned/${id}.txt`
    await fs.writeFile(outputFilePath, cleanedText, 'utf-8')
    console.log(`Cleaned text saved to ${outputFilePath}`)
  } catch (error) {
    console.error(`Error processing section ID: ${id}`, error.message)
  }
}

async function processSections() {
  try {
    const sections = JSON.parse(await fs.readFile('updated_sections_manual.json', 'utf-8'))
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
