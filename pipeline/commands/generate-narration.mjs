// Reads the tales aloud with ElevenLabs (Eleven v4) and keeps the timing of every character,
// for the read-along.
//
//   npm run narration:generate -- --dry-run                    what would be read, and how much
//   npm run narration:generate                                 every tale and edition
//   npm run narration:generate -- --story=asketrol             all four editions of one tale
//   npm run narration:generate -- --story=asketrol --variant=child-friendly
//   npm run narration:generate -- --story=asketrol --variant=child-friendly --voice=martin
//   npm run narration:generate -- --story=asketrol --variant=child-friendly --plain
//
// An edition whose published reading was made from its current text, in its own voice, is
// skipped (--force reads it again). Three editions are read at a time, the most ElevenLabs
// allows at once; one that fails is reported at the end and the rest go on.
//
// The text comes from the narration script, pipeline/narration/<story>/<variant>.txt: the
// edition's story.txt with performance directions in square brackets ([softly], [deep, gruff
// troll voice]). Without a script, or with --plain, story.txt is read as it is. Voices, model
// and language per edition are in pipeline/config/narration.json. The tales take turns: an
// odd-numbered tale (I, III, ...) is read by each edition's first voice, a woman, and an
// even-numbered one by its second, a man. --voice takes a name from there or a voice id.
//
// Writes pipeline/work/narration/<story>/<variant>-<voice>[-plain].mp3, and next to it a
// .json with the text that was read and the start and end time of every character in it.
// A reading in the edition's own voice is then put on the site (pipeline/lib/narration.mjs);
// one made with --voice or --plain stays a test until narration:publish. Needs
// ELEVENLABS_API_KEY in .env and ffmpeg.
import { execFile } from 'child_process'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'
import dotenv from 'dotenv'
import { ensureDir, fileExists, parseArgs, readJson, readText, rootPath } from '../lib/shared.mjs'
import { publishNarration } from '../lib/narration.mjs'

dotenv.config({ path: rootPath('.env') })
const run = promisify(execFile)

const API = 'https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps'
const EDITIONS = ['child-friendly', 'simplified', 'modern', 'english']
// Directions are written as "[direction] " before the words they shape.
const TAG = /\[[^\]]+\] /g

const args = parseArgs(process.argv.slice(2))
const flag = (name) =>
  process.argv
    .slice(2)
    .find((part) => part.startsWith(`--${name}=`))
    ?.split('=')
    .slice(1)
    .join('=')
const plain = process.argv.includes('--plain')
const dryRun = process.argv.includes('--dry-run')
const config = await readJson(rootPath('pipeline/config/narration.json'))
const apiKey = process.env.ELEVENLABS_API_KEY
if (!apiKey && !dryRun) throw new Error('ELEVENLABS_API_KEY is missing from .env')
const CONCURRENT = 3

// The text to read: the narration script if there is one, else the edition's text. A script
// must be the edition's text word for word once its directions are taken out.
async function narrationText(storyId, variant) {
  const storyText = (
    await readText(rootPath('public/content/stories', storyId, variant, 'story.txt'))
  ).trim()
  const scriptFile = rootPath('pipeline/narration', storyId, `${variant}.txt`)
  if (plain || !(await fileExists(scriptFile))) return { text: storyText, scripted: false }
  const script = (await readText(scriptFile)).trim()
  if (script.replace(TAG, '') !== storyText) {
    throw new Error(`${scriptFile} differs from story.txt once its [directions] are removed`)
  }
  return { text: script, scripted: true }
}

// Pieces of whole paragraphs, each short enough for one request.
function chunks(text, max) {
  const pieces = []
  let current = ''
  for (const paragraph of text.split(/\n\s*\n/)) {
    if (paragraph.length > max) throw new Error(`A paragraph is longer than ${max} characters`)
    const next = current ? `${current}\n\n${paragraph}` : paragraph
    if (next.length > max && current) {
      pieces.push(current)
      current = paragraph
    } else {
      current = next
    }
  }
  if (current) pieces.push(current)
  return pieces
}

// A busy or failing server, or a dropped connection, is tried again for about two minutes
// before the edition is given up.
const RETRIES = [5, 10, 20, 40, 60]

async function request(body, attempt = 0) {
  const retry = async (reason) => {
    if (attempt >= RETRIES.length) throw new Error(reason)
    await new Promise((resolve) => setTimeout(resolve, RETRIES[attempt] * 1000))
    return request(body, attempt + 1)
  }
  let response
  try {
    response = await fetch(`${API}?output_format=${config.outputFormat}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    return retry(`no answer from ElevenLabs: ${error.message}`)
  }
  if (response.status === 429 || response.status >= 500) {
    return retry(`ElevenLabs ${response.status}: ${await response.text()}`)
  }
  if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`)
  return {
    requestId: response.headers.get('request-id'),
    cost: Number(response.headers.get('character-cost') ?? 0),
    ...(await response.json()),
  }
}

async function duration(file) {
  const { stdout } = await run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    file,
  ])
  return Number(stdout.trim())
}

const LEAD_IN = 0.4
const ENDING = 1.5
const isLetter = (character) => /\p{L}/u.test(character)
// Silence before the first and after the last spoken letter of a piece.
function lead(part) {
  const { characters, character_start_times_seconds: starts } = part.alignment
  const first = characters.findIndex(isLetter)
  return first >= 0 ? starts[first] : 0
}
function tail(part) {
  const { characters, character_end_times_seconds: ends } = part.alignment
  const last = characters.findLastIndex(isLetter)
  return last >= 0 ? part.seconds - ends[last] : 0
}
// The narrator's usual pause between paragraphs: the median within the pieces.
function paragraphPause(parts) {
  const pauses = []
  for (const part of parts) {
    const {
      characters,
      character_start_times_seconds: starts,
      character_end_times_seconds: ends,
    } = part.alignment
    const text = characters.join('')
    for (const match of text.matchAll(/\n\s*\n/g)) {
      let before = match.index - 1
      while (before > 0 && !isLetter(characters[before])) before -= 1
      let after = match.index + match[0].length
      while (after < characters.length && !isLetter(characters[after])) after += 1
      if (after < characters.length) pauses.push(starts[after] - ends[before])
    }
  }
  pauses.sort((a, b) => a - b)
  return pauses.length ? pauses[pauses.length >> 1] : 0.6
}

// The voice for a tale: the edition's voices take turns by the tale's number.
function voiceFor(storyIndex, variant) {
  const edition = config.editions[variant]
  const key = flag('voice') ?? edition.voices[(storyIndex - 1) % edition.voices.length]
  return { key, ...(config.voices[key] ?? { id: key, name: key }) }
}

// Whether the edition's published reading is of its current text, in this voice and model.
async function upToDate(story, variant, voice) {
  const file = rootPath('public/content/stories', story, variant, 'narration.json')
  if (!(await fileExists(file))) return false
  const published = await readJson(file)
  const storyText = (
    await readText(rootPath('public/content/stories', story, variant, 'story.txt'))
  ).trim()
  return (
    published.textHash === crypto.createHash('sha1').update(storyText).digest('hex') &&
    published.voiceId === voice.id &&
    published.model === config.model
  )
}

async function narrate({ story, variant, voice, text, scripted }) {
  const edition = config.editions[variant]
  const pieces = chunks(text, config.maxChunkCharacters)
  const name = `${variant}-${config.voices[voice.key] ? voice.key : 'voice'}${plain ? '-plain' : ''}`
  const workDir = rootPath('pipeline/work/narration', story)
  const partsDir = path.join(workDir, `${name}-parts`)
  await ensureDir(partsDir)
  console.log(
    `${story}/${variant}: ${voice.name}, ${scripted ? 'script' : 'plain text'}, ${text.length} characters in ${pieces.length} requests`,
  )

  const parts = []
  const requestIds = []
  for (const [index, piece] of pieces.entries()) {
    const spoken = (value) => value.replace(TAG, '')
    const body = {
      model_id: config.model,
      language_code: edition.language,
      seed: config.seed,
      inputs: [{ text: piece, voice_id: voice.id }],
      // The pieces before carry the voice on; the API takes their ids or their text, not both.
      ...(requestIds.length
        ? { previous_request_ids: requestIds.slice(-3) }
        : index > 0
          ? { previous_text: spoken(pieces[index - 1]).slice(-100) }
          : {}),
      ...(index < pieces.length - 1
        ? { future_text: spoken(pieces[index + 1]).slice(0, 100) }
        : {}),
    }
    // A piece already read with the same text, voice and settings is not paid for twice.
    const stem = path.join(partsDir, String(index + 1).padStart(2, '0'))
    const file = `${stem}.mp3`
    const cacheKey = JSON.stringify({
      text: piece,
      voice: voice.id,
      model: config.model,
      seed: config.seed,
      language: edition.language,
    })
    const cached = (await fileExists(`${stem}.json`)) ? await readJson(`${stem}.json`) : null
    let result
    if (cached?.key === cacheKey && (await fileExists(file))) {
      result = cached
    } else {
      const { audio_base64: audio, ...response } = await request(body)
      await fs.writeFile(file, Buffer.from(audio, 'base64'))
      result = { key: cacheKey, ...response }
      await fs.writeFile(`${stem}.json`, JSON.stringify(result))
    }
    requestIds.push(result.requestId)
    parts.push({
      file,
      text: piece,
      requestId: result.requestId,
      cost: result.cost,
      alignment: result.alignment,
      seconds: await duration(file),
    })
    console.log(
      `${story}/${variant}: ${index + 1}/${pieces.length} read (${parts.at(-1).seconds.toFixed(0)} s)`,
    )
  }

  // One file for the tale. Each piece starts and ends almost without silence, so the joins
  // get the pause the narrator leaves between paragraphs within a piece; the tale gets a
  // short breath before it and a quiet moment after.
  const pause = paragraphPause(parts)
  const silences = parts.map((part, index) =>
    index === 0 ? LEAD_IN : Math.max(0, pause - tail(parts[index - 1]) - lead(part)),
  )
  const audioFile = path.join(workDir, `${name}.mp3`)
  const graph = [
    ...parts.map((_, index) => `aevalsrc=0:d=${silences[index].toFixed(3)}:s=44100[s${index}]`),
    `aevalsrc=0:d=${ENDING}:s=44100[end]`,
    `${parts.map((_, index) => `[s${index}][${index}:a]`).join('')}[end]concat=n=${2 * parts.length + 1}:v=0:a=1[out]`,
  ]
  await run('ffmpeg', [
    '-y',
    '-v',
    'error',
    ...parts.flatMap((part) => ['-i', part.file]),
    '-filter_complex',
    graph.join(';'),
    '-map',
    '[out]',
    '-c:a',
    'libmp3lame',
    '-b:a',
    '128k',
    audioFile,
  ])

  // The timing of every character on the tale's clock.
  let offset = 0
  const timeline = { characters: [], starts: [], ends: [] }
  for (const [index, part] of parts.entries()) {
    const {
      characters,
      character_start_times_seconds: starts,
      character_end_times_seconds: ends,
    } = part.alignment
    // The paragraph break between two pieces falls in the silence between them.
    if (index > 0) {
      timeline.characters.push('\n', '\n')
      timeline.starts.push(offset, offset)
      timeline.ends.push(offset + silences[index], offset + silences[index])
    }
    offset += silences[index]
    timeline.characters.push(...characters)
    timeline.starts.push(...starts.map((time) => offset + time))
    timeline.ends.push(...ends.map((time) => offset + time))
    offset += part.seconds
  }
  offset += ENDING
  await fs.writeFile(
    path.join(workDir, `${name}.json`),
    `${JSON.stringify(
      {
        story,
        variant,
        voice,
        model: config.model,
        scripted,
        generatedAt: new Date().toISOString(),
        seconds: offset,
        requests: parts.map(({ requestId, cost, seconds, text: partText }) => ({
          requestId,
          cost,
          seconds,
          characters: partText.length,
        })),
        text: timeline.characters.join(''),
        starts: timeline.starts.map((time) => Math.round(time * 1000) / 1000),
        ends: timeline.ends.map((time) => Math.round(time * 1000) / 1000),
      },
      null,
      1,
    )}\n`,
  )
  const minutes = Math.floor(offset / 60)
  console.log(
    `${story}/${variant}: → ${path.relative(rootPath(), audioFile)} (${minutes}:${String(Math.round(offset % 60)).padStart(2, '0')})`,
  )
  if (!flag('voice') && !plain) {
    await publishNarration({ story, variant, take: name })
    console.log(`${story}/${variant}: published`)
  }
  return { characters: text.length }
}

// ---- what to read

const manifest = await readJson(rootPath('public/content/manifest.json'))
const stories = [...manifest.stories]
  .filter((story) => !args.story || story.id === args.story)
  .sort((a, b) => a.index - b.index)
if (!stories.length) throw new Error(`No story "${args.story}" in the manifest`)

const jobs = []
let skipped = 0
for (const story of stories) {
  const variants = (args.variant ? [args.variant] : EDITIONS).filter((variant) =>
    story.availableVariants.includes(variant),
  )
  for (const variant of variants) {
    const voice = voiceFor(story.index, variant)
    if (!args.force && !plain && !flag('voice') && (await upToDate(story.id, variant, voice))) {
      skipped += 1
      continue
    }
    const { text, scripted } = await narrationText(story.id, variant)
    jobs.push({ story: story.id, variant, voice, text, scripted })
  }
}

const total = jobs.reduce((sum, job) => sum + job.text.length, 0)
console.log(
  `${jobs.length} editions to read, ${total.toLocaleString('en')} characters; ${skipped} already read from their current text`,
)
if (dryRun) {
  for (const job of jobs) {
    console.log(`  ${job.story}/${job.variant}: ${job.voice.name}, ${job.text.length} characters`)
  }
  process.exit(0)
}

// Three at a time; a failure is kept for the end so the others go on.
const failures = []
const queue = [...jobs]
await Promise.all(
  Array.from({ length: CONCURRENT }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      try {
        await narrate(job)
      } catch (error) {
        failures.push(`${job.story}/${job.variant}: ${error.message}`)
        console.log(`${job.story}/${job.variant}: FAILED, ${error.message}`)
      }
    }
  }),
)
console.log(
  `\n${jobs.length - failures.length} of ${jobs.length} editions read, ${total.toLocaleString('en')} characters`,
)
if (failures.length) {
  console.log(`Failed:\n  ${failures.join('\n  ')}`)
  process.exitCode = 1
}
