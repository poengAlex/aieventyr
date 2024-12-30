import 'dotenv/config'
import fs from 'fs/promises'
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // API key from .env
})

async function processChunk(chunk, index) {
  const prompt = `
    Find the correct start and stop page numbers for this json array and return the updated json array.

    The page nrs are listed as [PAGE 1], [PAGE 2], etc. in the text. This is the nrs you should use!

    The titles will be listed before the text starts. There might be some small errors in teh title since this is OCR text.

    Also add a good id that can be used to identify the section in the future. max 10 characters.

    [
  {"start": 3, "stop": 5, "title": "Biografiske oplysninger om P. Chr. Asbjørnsen"},
  {"start": 5, "stop": 6, "title": "Biografiske oplysninger om Jørgen Moe"},
  {"start": 6, "stop": 1, "title": "Forord af Moltke Moe"},
  {"start": 1, "stop": 8, "title": "Om Askeladden som stjal Troldets Sølvænder, Sengetæppe, og Guldharpe"},
  {"start": 8, "stop": 59, "title": "Gjertrudsfuglen"},
  {"start": 59, "stop": 60, "title": "Fugl Dam"},
  {"start": 24, "stop": 39, "title": "Rige Per Kræmmer"},
  {"start": 39, "stop": 42, "title": "Askeladden som kapaad med Troldet"},
  {"start": 42, "stop": 46, "title": "Om Gutten som gik til Nordenvinden og krævede Melet igjen"},
  {"start": 46, "stop": 51, "title": "Jomfru Maria som Gudmor"},
  {"start": 51, "stop": 58, "title": "De tre Prinsesser i Hvidtenland"},
  {"start": 58, "stop": 65, "title": "Somme Kjærringer er slige"},
  {"start": 65, "stop": 6, "title": "Hver synes bedst om sine Børn"},
  {"start": 6, "stop": 6, "title": "En Frierhistorie"},
  {"start": 6, "stop": 7, "title": "De tre Mostre"},
  {"start": 7, "stop": 83, "title": "Enkesønnen"},
  {"start": 83, "stop": 94, "title": "Manddatteren og Kjærringdatteren"},
  {"start": 94, "stop": 98, "title": "Hanen og Hønen i Nøddeskogen"},
  {"start": 98, "stop": 99, "title": "Bjørnen og Ræven: Hvorfor Bjørnen er stubrumpet"},
  {"start": 99, "stop": 101, "title": "Bjørnen og Ræven: Ræven snyder Bjørnen for Julekosten"},
  {"start": 101, "stop": 106, "title": "Gudbrand i Lien"},
  {"start": 106, "stop": 122, "title": "Kari Træstak"},
  {"start": 122, "stop": 133, "title": "Ræven som Gjæter"},
  {"start": 133, "stop": 131, "title": "Smeden som de ikke torde slippe ind i Helvede"},
  {"start": 131, "stop": 132, "title": "Hanen og Hønen"},
  {"start": 132, "stop": 151, "title": "Hanen, Gjøgen, og Aarhanen"},
  {"start": 151, "stop": 154, "title": "Dukken i Græsset"},
  {"start": 154, "stop": 157, "title": "Paal Andrestuen"},
  {"start": 157, "stop": 170, "title": "Soria Moria Slot"},
  {"start": 170, "stop": 177, "title": "Herreper"},
  {"start": 177, "stop": 182, "title": "Vesle Aase Gaasepige"},
  {"start": 182, "stop": 183, "title": "Gutten og Fanden"},
  {"start": 183, "stop": 192, "title": "De syv Folerne"},
  {"start": 192, "stop": 199, "title": "Giske"},
  {"start": 199, "stop": 208, "title": "De tolv Vildænder"},
  {"start": 208, "stop": 209, "title": "Mestertyven"}
]
  `

  const chatCompletion = await client.chat.completions.create({
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: chunk },
    ],
    model: 'gpt-4o',
    response_format: {
      type: 'json_object',
    },
  })

  console.log(`Chunk ${index} processed`, chatCompletion)
  const obj = JSON.parse(chatCompletion.choices[0].message.content)
  //if obj then put in a array
  if (Array.isArray(obj)) {
    return obj
  } else {
    return [obj]
  }
}

async function main() {
  try {
    // Read the content of combined.txt
    const fileContent = await fs.readFile('combined.txt', 'utf-8')

    // Split the content into chunks of 10,000 characters (NB no need the context window is big enough)
    const chunkSize = 16000 * 24
    const chunks = []
    for (let i = 0; i < fileContent.length; i += chunkSize) {
      chunks.push(fileContent.slice(i, i + chunkSize))
    }

    console.log(`Processing ${chunks.length} chunks...`)

    // Process each chunk and collect results
    const results = []
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1} of ${chunks.length}`)
      const chunkResult = await processChunk(chunks[i], i + 1)
      console.log(`Chunk ${i + 1} result:`, chunkResult)
      results.push(...chunkResult)
    }

    // Combine all results into one JSON array
    await fs.writeFile('sections.json', JSON.stringify(results, null, 2))
    console.log('All sections extracted and saved to sections.json')
  } catch (error) {
    console.error('Error:', error.message)
  }
}

main()
