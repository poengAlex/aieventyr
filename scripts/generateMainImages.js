import 'dotenv/config'
import fs from 'fs/promises'
import OpenAI from 'openai'
import path from 'path'
import { existsSync } from 'fs'

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // API key from .env
})

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function generateMainImagePrompt(cleanedText, imageStyle, title) {
  const prompt = `
    Create a prompt for the main image of the section titled "${title}".
    The image should:
    - Represent the theme of the section as described in the text.
    - Be visually engaging, with elements relevant to the story.
    - Use the provided image style for consistency.

    Text:
    ${cleanedText}

    Image Style:
    ${imageStyle}

    Return only the prompt, no additional text.
  `

  const chatCompletion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are an assistant specializing in generating DALL-E image prompts for main images.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: {
      type: 'text',
    },
  })

  return chatCompletion.choices[0].message.content
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

async function processMainImage(section) {
  const { id, title } = section
  const mainImageDir = `output/mainImages`
  const outputFilePath = path.join(mainImageDir, `${id}.png`)

  try {
    if (!existsSync(mainImageDir)) {
      await fs.mkdir(mainImageDir, { recursive: true })
    }

    if (existsSync(outputFilePath)) {
      console.log(`Main image for section ${id} already exists. Skipping.`)
      return
    }

    const cleanedText = await fs.readFile(`output/cleaned/${id}.txt`, 'utf-8')
    const styleFilePath = `output/imagesGen/${id}/style.txt`
    if (!existsSync(styleFilePath)) {
      throw new Error(`Image style file not found for section ${id}`)
    }
    const imageStyle = await fs.readFile(styleFilePath, 'utf-8')

    const prompt = await generateMainImagePrompt(cleanedText, imageStyle, title)
    await generateImage(prompt, outputFilePath)

    console.log(`Main image generated for section: ${title}`)
    // await delay(30000) // Delay to avoid hitting rate limits
  } catch (error) {
    console.error(`Error generating main image for section ${id}:`, error.message)
  }
}

async function processAllSectionsForMainImages() {
  try {
    const sections = JSON.parse(await fs.readFile('updated_sections_manual.json', 'utf-8'))
    console.log(`Processing ${sections.length} sections for main image generation...`)

    for (const section of sections) {
      await processMainImage(section)
    }

    console.log('Main image generation completed for all sections.')
  } catch (error) {
    console.error('Error:', error.message)
  }
}

processAllSectionsForMainImages()
