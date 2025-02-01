import 'dotenv/config'
import fs from 'fs/promises'
import OpenAI from 'openai'
import path from 'path'

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // API key from .env
})

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function generateTextVariant(cleanedText, variantType) {
  const promptMap = {
    simplified: `
      Simplify the following text while keeping the meaning intact. Use modern Norwegian language but change as little as possible to make it easier to understand.
      Text:
      ${cleanedText}
    `,
    child: `
      Rewrite the following text to make it child-friendly. Use simple and modern Norwegian language and ensure it is suitable for a younger audience.
      Text:
      ${cleanedText}
    `,
    english: `
      Translate the following text into English, while retaining the original meaning and storytelling style.
      Text:
      ${cleanedText}
    `,
    modern: `
      Rewrite the following text as if it takes place in today's society. Adapt the setting, characters, and language accordingly while preserving the core story.
      Use modern Norwegian language
      Text:
      ${cleanedText}
    `,
  }

  const prompt = promptMap[variantType]
  if (!prompt) throw new Error(`Invalid variant type: ${variantType}`)

  const chatCompletion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an assistant specializing in rewriting text into various styles. Your task is to rewrite the text according to the specified style. The text input is in old Norwegian (Danish)`,
      },
      { role: 'user', content: prompt },
    ],
    response_format: {
      type: 'text',
    },
  })

  return chatCompletion.choices[0].message.content.trim()
}

async function processSectionVariants(section) {
  const { id, title } = section
  const cleanedTextPath = `output/cleaned/${id}.txt`
  const variantsDir = `output/variants/${id}`

  try {
    // Load cleaned text
    const cleanedText = await fs.readFile(cleanedTextPath, 'utf-8')

    // Create output directory for variants
    await fs.mkdir(variantsDir, { recursive: true })

    const variants = ['simplified', 'child', 'english', 'modern']
    for (const variant of variants) {
      const outputFilePath = path.join(variantsDir, `${variant}.txt`)
      if (!(await fileExists(outputFilePath))) {
        const variantText = await generateTextVariant(cleanedText, variant)
        await fs.writeFile(outputFilePath, variantText, 'utf-8')
        console.log(`Generated ${variant} variant for section ${id}`)
      } else {
        console.log(`${variant} variant for section ${id} already exists. Skipping.`)
      }
    }

    console.log(`Variants generated for section: ${title}`)
  } catch (error) {
    console.error(`Error processing section ${id}:`, error.message)
  }
}

async function processAllSections() {
  try {
    const sections = JSON.parse(await fs.readFile('updated_sections_manual.json', 'utf-8'))
    console.log(`Processing ${sections.length} sections for text variants generation...`)

    for (const section of sections) {
      await processSectionVariants(section)
    }

    console.log('Text variants generation completed for all sections.')
  } catch (error) {
    console.error('Error:', error.message)
  }
}

processAllSections()
