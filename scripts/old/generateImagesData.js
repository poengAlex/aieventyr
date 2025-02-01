import 'dotenv/config'
import fs from 'fs/promises'
import OpenAI from 'openai'
import crypto from 'crypto'

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // API key from .env
})

function generateUniqueId() {
  return crypto.randomBytes(6).toString('hex') // Generates a 12-char unique ID
}

async function generateImageArray(cleanedText, id) {
  const prompt = `
    Analyze the following text and suggest potential images to be included. The images should enhance the text by illustrating key parts of the story or adding visual interest.

    Rules:
    1. Provide an array of objects with the structure:
      { "id": "A unique id of 12 chars", "description": "Description of the image", "insertAfter": "The last sentence before the image is inserted" }
    2. Ensure there is a main image with { "id": "main", "description": "Main image description", "insertAfter": "" }.
    3. Place images logically, typically after around every 20 sentences as a guideline, but prioritize logical placement over strict rules.
    4. Ensure JSON format is returned.
    5.  Return the descriptions in plain JSON format like:
    { "images": [{ "id": "A unique id of 12 chars", "description": "Description of the image", "insertAfter": "The last sentence before the image is inserted" }]}

    id: ${id}

    Text:
    ${cleanedText}
  `

  const chatCompletion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are an assistant specializing in generating structured image suggestions for text content.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: {
      type: 'json_object',
    },
  })

  const res = chatCompletion.choices[0].message.content
  // console.log('Response:', res)

  return JSON.parse(res).images
}

async function processSectionForImages(section) {
  const { id, title } = section
  if (section.start === -1) {
    // console.log(`Skipping section: ${title} (ID: ${id})`)
    return
  }
  const filePath = `output/cleaned/${id}.txt`

  try {
    const cleanedText = await fs.readFile(filePath, 'utf-8')
    // console.log(`Generating image suggestions for section: ${title} (ID: ${id})`)

    const uniqueId = generateUniqueId()

    const imageArray = await generateImageArray(cleanedText, uniqueId)
    const outputFilePath = `output/imagesData/${id}.json`
    await fs.writeFile(outputFilePath, JSON.stringify(imageArray, null, 2), 'utf-8')

    // console.log(`Image suggestions saved to ${outputFilePath}`)
  } catch (error) {
    console.error(`Error processing section ID: ${id}`, error.message)
  }
}

async function processAllSections() {
  try {
    let sections = JSON.parse(await fs.readFile('updated_sections_manual.json', 'utf-8'))
    console.log(`Processing ${sections.length} sections for image suggestions...`)

    //Debug only process the two first sections
    // sections = sections.slice(3, 5)
    await fs.mkdir('output/imagesData', { recursive: true })

    const processingTasks = sections.map(processSectionForImages)
    await Promise.all(processingTasks)

    console.log('Image suggestions generated for all sections.')
  } catch (error) {
    console.error('Error:', error.message)
  }
}

processAllSections()
