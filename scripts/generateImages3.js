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

async function generateImageStyle(cleanedText) {
  const prompt = `
    Based on the following text, generate a concise image style description.
    Use elements such as shading, linework, palette, proportions, and lighting.

    Text:
    ${cleanedText}

    Return the style in plain text.
  `

  const chatCompletion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an assistant specializing in generating consistent image styles.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: {
      type: 'text',
    },
  })

  return chatCompletion.choices[0].message.content
}

async function generateCharacterDescription(cleanedText, imageArray) {
  const prompt = `
    Based on the following text and image array, describe the main characters in detail:
    - Include physical appearance, clothing, and context.
    - Ensure names match exactly as they appear in the image array.

    Text:
    ${cleanedText}

    Array of images:
    ${JSON.stringify(imageArray)}

    Return in JSON format:
    { "characters": [{ "name": "Character Name", "description": "Detailed character description" }] }
  `

  const chatCompletion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an assistant specializing in creating character descriptions.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: {
      type: 'json_object',
    },
  })

  return JSON.parse(chatCompletion.choices[0].message.content).characters
}

async function generateImagePrompt(character, imageStyle, story) {
  const prompt = `
    Generate a prompt for an image of "${character.name}" based on:
    - Character description: ${character.description}
    - Style: ${imageStyle}

    Ensure:
    - The image includes only the described character.
    - No text or multiple instances of the character in the image.

    Story:
    ${story}
  `

  const chatCompletion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an assistant specializing in generating DALL-E image prompts.',
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

async function processSectionImages(section) {
  const { id, title } = section
  const jsonFilePath = `output/imagesData/${id}.json`
  const outputDir = `output/imagesGen/${id}`

  try {
    const imageArray = JSON.parse(await fs.readFile(jsonFilePath, 'utf-8'))

    if (!existsSync(outputDir)) await fs.mkdir(outputDir, { recursive: true })

    const cleanedText = await fs.readFile(`output/cleaned/${id}.txt`, 'utf-8')

    // Generate or read the image style
    const styleFilePath = path.join(outputDir, 'style.txt')
    let imageStyle
    if (!existsSync(styleFilePath)) {
      imageStyle = await generateImageStyle(cleanedText)
      await fs.writeFile(styleFilePath, imageStyle, 'utf-8')
      console.log(`Style saved for section ${id}.`)
    } else {
      imageStyle = await fs.readFile(styleFilePath, 'utf-8')
    }

    // Generate or read character descriptions
    const charactersFilePath = path.join(outputDir, 'characters.json')
    let characters
    if (!existsSync(charactersFilePath)) {
      characters = await generateCharacterDescription(cleanedText, imageArray)
      await fs.writeFile(charactersFilePath, JSON.stringify({ characters }, null, 2), 'utf-8')
      console.log(`Characters description saved for section ${id}.`)
    } else {
      characters = JSON.parse(await fs.readFile(charactersFilePath, 'utf-8')).characters
    }

    // Generate images
    for (const character of characters) {
      const outputFilePath = path.join(outputDir, `${character.name}.png`)
      if (!existsSync(outputFilePath)) {
        const prompt = await generateImagePrompt(character, imageStyle, cleanedText)
        await generateImage(prompt, outputFilePath)
        console.log(`Generated image for character: ${character.name}`)
        await delay(30000) // Delay to avoid hitting rate limits
      } else {
        console.log(`Image for character ${character.name} already exists. Skipping.`)
      }
    }

    console.log(`Completed section: ${title}`)
  } catch (error) {
    console.error(`Error processing section ${id}:`, error.message)
  }
}

async function processAllSections() {
  try {
    const sections = JSON.parse(await fs.readFile('updated_sections_manual.json', 'utf-8'))
    console.log(`Processing ${sections.length} sections for image generation...`)

    for (const section of sections) {
      await processSectionImages(section)
    }

    console.log('Image generation completed for all sections.')
  } catch (error) {
    console.error('Error:', error.message)
  }
}

processAllSections()
