import 'dotenv/config'
import fs from 'fs/promises'
import OpenAI from 'openai'
import path from 'path'

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // API key from .env
})

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function generateMainImagePrompt(variantText, variantType, title) {
  const prompt = `
    Generate a prompt for a main image for the "${variantType}" version of the section titled "${title}".
    The image should:
    - Reflect the text and mood of the "${variantType}" version.
    - Clearly indicate a Nordic setting with landscapes, architecture, or elements like fjords, snow, and traditional Nordic clothing or objects.
    - Be visually engaging and thematically consistent with the text.

    Text:
    ${variantText}

    Return only the prompt, no additional text.
  `

  const chatCompletion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an assistant specializing in generating DALL-E prompts for main images.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: {
      type: 'text',
    },
  })

  return chatCompletion.choices[0].message.content.trim()
}

async function generateImage(prompt, outputPath) {
  const dalleResponse = await client.images.generate({
    prompt,
    model: 'dall-e-3',
    n: 1,
    size: '1024x1024',
    style: 'vivid',
  })

  const imageUrl = dalleResponse.data[0].url
  const imageData = await fetch(imageUrl).then((res) => res.arrayBuffer())
  await fs.writeFile(outputPath, Buffer.from(imageData))
  console.log(`Image saved to ${outputPath}`)
}

async function processVariantMainImage(section, variantType) {
  const { id, title } = section
  const variantTextPath = `output/variants/${id}/${variantType}.txt`
  const mainImageDir = `output/mainImages`
  const outputFilePath = path.join(mainImageDir, `${id}_${variantType}.png`)

  try {
    if (!(await fileExists(variantTextPath))) {
      console.log(`Variant text for ${variantType} of section ${id} not found. Skipping.`)
      return
    }

    if (!(await fileExists(mainImageDir))) {
      await fs.mkdir(mainImageDir, { recursive: true })
    }

    if (await fileExists(outputFilePath)) {
      console.log(`Main image for ${variantType} of section ${id} already exists. Skipping.`)
      return
    }

    const variantText = await fs.readFile(variantTextPath, 'utf-8')
    const prompt = await generateMainImagePrompt(variantText, variantType, title)
    await generateImage(prompt, outputFilePath)

    console.log(`Main image generated for ${variantType} of section: ${title}`)
    // await delay(30000) // Delay to avoid hitting rate limits
  } catch (error) {
    console.error(`Error generating main image for ${variantType} of section ${id}:`, error.message)
  }
}

async function processAllVariantMainImages() {
  try {
    const sections = JSON.parse(await fs.readFile('updated_sections_manual.json', 'utf-8'))
    const variants = ['simplified', 'child', 'english', 'modern']

    console.log(`Processing main images for ${variants.join(', ')} variants...`)

    for (const section of sections) {
      for (const variant of variants) {
        await processVariantMainImage(section, variant)
      }
    }

    console.log('Main image generation for all variants completed.')
  } catch (error) {
    console.error('Error:', error.message)
  }
}

processAllVariantMainImages()
