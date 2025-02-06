import 'dotenv/config'
import fs from 'fs/promises'
import fsExtra from 'fs-extra'
import OpenAI from 'openai'
import { fileURLToPath } from 'url'
import path from 'path'
import ffmpeg from 'fluent-ffmpeg'
import { exec } from 'child_process'
import { promisify } from 'util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Directories
const VARIANTS_INPUT = path.join(__dirname, '../../public/v3/variants')
const TTS_OUTPUT = path.join(__dirname, '../../public/new/tts')

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'],
})

const voiceMap = {
  simplified: 'coral',
  child: 'nova',
  english: 'echo',
  modern: 'sage',
}

function splitTextIntoChunks(text, maxLength = 4096) {
  const chunks = []
  let currentChunk = ''

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence
    } else {
      if (currentChunk) chunks.push(currentChunk.trim())
      currentChunk = sentence
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim())
  return chunks
}

async function generateTTS(text, variant, index) {
  try {
    const chunks = splitTextIntoChunks(text)
    const chunkFiles = []

    for (let i = 0; i < chunks.length; i++) {
      const mp3 = await client.audio.speech.create({
        model: 'tts-1',
        voice: voiceMap[variant],
        input: chunks[i],
      })

      const chunkPath = path.join(TTS_OUTPUT, variant, `tale_${index}_chunk${i}.mp3`)
      const buffer = Buffer.from(await mp3.arrayBuffer())
      await fs.writeFile(chunkPath, buffer)
      chunkFiles.push(chunkPath)
      console.log(`Generated TTS chunk ${i + 1}/${chunks.length} for ${variant} tale ${index}`)
    }

    if (chunkFiles.length > 1) {
      const outputPath = path.join(TTS_OUTPUT, variant, `tale_${index}.mp3`)
      await mergeMp3Files(chunkFiles, outputPath)
      // Cleanup chunk files
      await Promise.all(chunkFiles.map((file) => fs.unlink(file)))
    } else if (chunkFiles.length === 1) {
      const outputPath = path.join(TTS_OUTPUT, variant, `tale_${index}.mp3`)
      await fs.rename(chunkFiles[0], outputPath)
    }

    console.log(`Completed TTS for ${variant} tale ${index}`)
  } catch (error) {
    console.error(`Error generating TTS for ${variant} tale ${index}:`, error)
  }
}

async function mergeMp3Files(inputFiles, outputFile) {
  return new Promise((resolve, reject) => {
    const command = ffmpeg()

    inputFiles.forEach((file) => {
      command.input(file)
    })

    command.on('error', reject).on('end', resolve).mergeToFile(outputFile)
  })
}

async function setupOutputFolders() {
  for (const variant of Object.keys(voiceMap)) {
    const variantPath = path.join(TTS_OUTPUT, variant)
    await fsExtra.ensureDir(variantPath)
  }
}

async function processVariants() {
  try {
    await setupOutputFolders()

    for (const variant of Object.keys(voiceMap)) {
      const variantPath = path.join(VARIANTS_INPUT, variant)
      const files = await fs.readdir(variantPath)

      for (const file of files) {
        if (!file.endsWith('.txt')) continue

        const index = parseInt(file.match(/\d+/)[0])
        const outputPath = path.join(TTS_OUTPUT, variant, `tale_${index}.mp3`)

        // Skip if file already exists
        try {
          await fs.access(outputPath)
          console.log(`Skipping TTS for ${variant} tale ${index} - already exists`)
          continue
        } catch {
          const text = await fs.readFile(path.join(variantPath, file), 'utf-8')
          await generateTTS(text, variant, index)
        }
      }
    }

    console.log('All TTS files generated successfully')
  } catch (error) {
    console.error('Error:', error)
  }
}

processVariants()
