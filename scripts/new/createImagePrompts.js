import 'dotenv/config'
import fs from 'fs/promises'
import OpenAI from 'openai'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FOLDER_CLEAN = path.join(__dirname, '../../public/new/variants/cleaned')
const SECTION_PATH = path.join(__dirname, '../../public/sections_new.json')
const OUTPUT_DIR = path.join(__dirname, '../../public/new/data')

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'],
})

async function generateImagePrompts(text, title) {
  const prompt = `
    Analyze the following Norwegian folktale and create JSON output containing:
    1. List of main characters with their description for image generation
    2. A prompt for generating a main image of the different variants of the tale

    Title: ${title}
    Text: ${text}

    Return only valid JSON in this format:
    {
      "characters": [
        {
          "name": "character name",
          "prompt": "detailed visual description for generating character image"
        }
      ],
      "cleanedMainImagePrompt": "detailed prompt for generating a main image illustration of the OCR cleaned version of the the tale",
      "modernMainImagePrompt": "detailed prompt for generating a main image illustration of the modern variant of the tale. Set in today's society",
      "childMainImagePrompt": "detailed prompt for generating a main image illustration of the child-friendly variant of the tale. This should be suitable for a 5 year old audience",
      "simplifiedMainImagePrompt": "detailed prompt for generating a main image illustration of the simplified variant of the tale. Use modern Norwegian language",
      "englishMainImagePrompt": "detailed prompt for generating a main image illustration of the English translated variant of the tale. Retain the original meaning and storytelling style"
    }
  `

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    // temperature: 0.7,
  })

  return JSON.parse(response.choices[0].message.content)
}

async function main() {
  try {
    const sections = JSON.parse(await fs.readFile(SECTION_PATH, 'utf-8'))

    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true })

    for (const section of sections) {
      console.log(`Processing tale ${section.index}...`)
      const inputPath = path.join(FOLDER_CLEAN, `tale_${section.index}.txt`)
      const text = await fs.readFile(inputPath, 'utf-8')

      const result = await generateImagePrompts(text, section.title_cleaned)

      const outputPath = path.join(OUTPUT_DIR, `tale_${section.index}.json`)
      await fs.writeFile(outputPath, JSON.stringify(result, null, 2), 'utf-8')
      console.log(`Completed tale ${section.index}`)
    }

    console.log('Image prompts generated successfully')
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
