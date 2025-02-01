import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

config() // Load environment variables

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // Ensure this is set in your .env file
})

const imageDir = path.resolve('output/images')
const outputDir = path.resolve('output')

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

async function processPages() {
  try {
    const startPage = 23
    const endPage = 24

    for (let page = startPage; page <= endPage; page++) {
      const imagePath = path.join(imageDir, `page.${page}.jpeg`)
      const outputFilePath = path.join(outputDir, `page${page}.txt`)

      if (fs.existsSync(imagePath)) {
        console.log(`Processing page ${page}...`)

        // Read the image as binary content
        const imageData = fs.readFileSync(imagePath).toString('base64')

        // Send the image data as part of the query
        const chatCompletion = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: `Extract and clean text from this image (Base64 encoded):\n\n${imageData}`,
            },
          ],
        })

        const extractedText = chatCompletion.choices[0].message.content

        // Save the extracted text to a file
        fs.writeFileSync(outputFilePath, extractedText)
        console.log(`Extracted text for page ${page} saved to ${outputFilePath}`)
      } else {
        console.warn(`Image for page ${page} not found.`)
      }
    }
  } catch (error) {
    console.error('Error during processing:', error)
  }
}

// Process pages 23 to 24
processPages()
