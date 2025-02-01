import 'dotenv/config'
import fs from 'fs/promises'
import fsExtra from 'fs-extra'
import OpenAI from 'openai'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Directories
const FOLDER_INPUT = path.join(__dirname, '../../public/new/variants/cleaned')
const FOLDER_OUTPUT = path.join(__dirname, '../../public/new/variants')
const SECTION_PATH = path.join(__dirname, '../../public/sections_new.json')

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'],
})

const promptMap = {
  simplified: (text) => `
    Simplify the following old Norwegian fairytale text while keeping the meaning intact.
    Use modern Norwegian language.
    Use line breaks where needed so the text is easy to read.
    Replace objects, words, meanings and names that are no longer in use with modern equivalents.
    Text:
    ${text}
  `,
  child: (text) => `
    Rewrite the following old Norwegian fairytale text to make it child-friendly.
    Use simple and modern Norwegian language and ensure it is suitable for a 5 year old audience or younger.
    Do not use any words that are too difficult for a child to understand.
    Use line breaks where needed so the text is easy to read.
    Replace objects, words, meanings and names that are no longer in use with modern equivalents that children can understand.
    Feel free to change the fairy tale completely, just keep some elements of the original.
    Text:
    ${text}
  `,
  english: (text) => `
    Translate the following old Norwegian fairytale into English, while retaining everything as much as possible from the norwegian version.
    Use line breaks where needed so the text is easy to read.
    Replace objects, words, meanings and names that are no longer in use in with modern equivalents.
    Text:
    ${text}
  `,
  modern: (text) => `
    Rewrite the following old Norwegian fairytale as if it takes place in today's society. The characters should remain as same as possible and the moral and plot should be preserved as long as that is possible.
    Be creative, do not just replace old objects with modern ones. Change the story a lot!
    Keep something from the original like the plot, moral or main characters.
    Use line breaks where needed so the text is easy to read.
    Use modern Norwegian language.
    Text:
    ${text}
  `,
}

async function generateVariant(text, variant) {
  let temperature = variant === 'modern' || variant === 'child' ? 1.1 : 0.7 //modern/child variant needs higher temperature or else it will only be app makers
  const chatCompletion = await client.chat.completions.create({
    model: 'o1',
    // temperature: temperature, //not supported in chat model
    messages: [
      { role: 'system', content: promptMap[variant](text) },
      { role: 'user', content: text },
    ],
    response_format: { type: 'text' },
  })
  return chatCompletion.choices[0].message.content
}

async function setupOutputFolders() {
  for (const variant of Object.keys(promptMap)) {
    const variantPath = path.join(FOLDER_OUTPUT, variant)
    await fsExtra.ensureDir(variantPath)
  }
}

async function processSection(section) {
  const { index } = section
  if (index > 35) return

  try {
    const inputPath = path.join(FOLDER_INPUT, `tale_${index}.txt`)
    const text = await fs.readFile(inputPath, 'utf-8')

    for (const variant of Object.keys(promptMap)) {
      const outputPath = path.join(FOLDER_OUTPUT, variant, `tale_${index}.txt`)

      // Check if file already exists
      try {
        await fs.access(outputPath)
        console.log(`Skipping ${variant} variant for tale ${index} - already exists`)
        continue
      } catch {
        // File doesn't exist, proceed with generation
        const variantText = await generateVariant(text, variant)
        await fs.writeFile(outputPath, variantText, 'utf-8')
        console.log(`Generated ${variant} variant for tale ${index}`)
      }
    }
  } catch (error) {
    console.error(`Error processing tale ${index}:`, error)
  }
}

async function main() {
  try {
    const sections = JSON.parse(await fs.readFile(SECTION_PATH, 'utf-8'))
    await setupOutputFolders()

    for (const section of sections) {
      if (section.index <= 35) {
        await processSection(section)
      }
    }

    console.log('All variants generated successfully')
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
