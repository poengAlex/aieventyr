import 'dotenv/config'
import fs from 'fs/promises'
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // API key from .env
})

async function processSection(section, index, book) {
  const prompt = `
    Find the correct start and stop page numbers for this section and return the updated json object.

    The page numbers are listed as [PAGE 1], [PAGE 2], etc., in the text. Use these numbers!

    The title may have minor errors as it comes from OCR text.

    Ignore headers like "Norske Folke-Eventyr. X " and "Y 22 Asbjørnsen og Moe."

    Section: ${JSON.stringify(section)},

    Book: ${book}
  `

  const chatCompletion = await client.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are an assistant helping to locate page numbers for sections in a document.',
      },
      { role: 'user', content: prompt },
    ],
    model: 'gpt-4o',
    response_format: {
      type: 'json_object',
    },
  })

  console.log(`Section ${index + 1} processed`)
  const response = JSON.parse(chatCompletion.choices[0].message.content)
  console.log(`Section ${index + 1} result:`, response)
  return response
}

async function main() {
  try {
    // Read the input JSON array
    const fileContent = await fs.readFile('sections.json', 'utf-8')
    const sections = JSON.parse(fileContent)
    const book = await fs.readFile('combined.txt', 'utf-8')

    console.log(`Processing ${sections.length} sections...`)
    const results = []

    for (let i = 0; i < sections.length; i++) {
      console.log(`Processing section ${i + 1} of ${sections.length}`)
      const updatedSection = await processSection(sections[i], i, book)
      results.push(updatedSection)
    }

    // Write the updated sections to a new file
    await fs.writeFile('updated_sections.json', JSON.stringify(results, null, 2))
    console.log('All sections updated and saved to updated_sections.json')
  } catch (error) {
    console.error('Error:', error.message)
  }
}

main()
