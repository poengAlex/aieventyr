// Turns a recording made by generate-narration.mjs (pipeline/work/narration/<story>/<take>.mp3
// and .json) into what the site plays:
//
//   public/content/stories/<story>/<variant>/audio.m4a        HE-AAC 32 kbps mono (encodeSiteAudio)
//   public/content/stories/<story>/<variant>/narration.json   when each paragraph and word is read
//
// and marks the edition as read aloud in variant.json and manifest.json. narration.json
// holds, for every paragraph of story.txt (split as the reader splits it), its start and
// end in seconds and its words as [from, to, start, end]: the word's place in the paragraph
// and when it is said.
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { encodeSiteAudio, readJson, readText, rootPath, writeJson } from './shared.mjs'

const TAG = /\[[^\]]+\] /g
const WORD = /[\p{L}\p{N}](?:[\p{L}\p{N}'’-]*[\p{L}\p{N}])?/gu
const round = (seconds) => Math.round(seconds * 1000) / 1000
let manifestTurn = Promise.resolve()

// The paragraphs of a text with where each starts, split and trimmed like the reader does
// (splitParagraphs in src/logic/art.ts).
function paragraphsOf(text) {
  const paragraphs = []
  let start = 0
  const push = (end) => {
    const raw = text.slice(start, end)
    const lead = raw.length - raw.trimStart().length
    const trimmed = raw.trim()
    if (trimmed) paragraphs.push({ text: trimmed, offset: start + lead })
  }
  for (const match of text.matchAll(/\n\s*\n/g)) {
    push(match.index)
    start = match.index + match[0].length
  }
  push(text.length)
  return paragraphs
}

export async function publishNarration({ story, variant, take }) {
  const workDir = rootPath('pipeline/work/narration', story)
  const recording = await readJson(path.join(workDir, `${take}.json`))
  const variantDir = rootPath('public/content/stories', story, variant)
  const storyText = (await readText(path.join(variantDir, 'story.txt'))).trim()

  // Where each letter of story.txt sits in the text that was read, which may carry directions.
  const positions = []
  let spoken = ''
  let cursor = 0
  for (const match of [...recording.text.matchAll(TAG), { index: recording.text.length, 0: '' }]) {
    for (let index = cursor; index < match.index; index += 1) {
      positions.push(index)
      spoken += recording.text[index]
    }
    cursor = match.index + match[0].length
  }
  if (spoken !== storyText) {
    throw new Error(`${take} was not read from the current ${story}/${variant}/story.txt`)
  }

  const paragraphs = paragraphsOf(storyText).map((paragraph) => {
    const words = [...paragraph.text.matchAll(WORD)].map((match) => {
      const from = match.index
      const to = from + match[0].length
      return [
        from,
        to,
        round(recording.starts[positions[paragraph.offset + from]]),
        round(recording.ends[positions[paragraph.offset + to - 1]]),
      ]
    })
    return {
      start: words[0]?.[2] ?? 0,
      end: words.at(-1)?.[3] ?? 0,
      words,
    }
  })

  await encodeSiteAudio(
    ['-i', path.join(workDir, `${take}.mp3`)],
    path.join(variantDir, 'audio.m4a'),
  )
  // One line per paragraph keeps the file readable and its diffs small.
  // voiceId, model and textHash (of story.txt) tell generate-narration.mjs whether the
  // reading is still current.
  const voice = recording.voice.name.split(/\s+[–-]\s+/)[0]
  const header = {
    voice,
    voiceId: recording.voice.id,
    model: recording.model,
    textHash: crypto.createHash('sha1').update(storyText).digest('hex'),
    seconds: round(recording.seconds),
  }
  await fs.writeFile(
    path.join(variantDir, 'narration.json'),
    `{\n${Object.entries(header)
      .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
      .join('\n')}\n  "paragraphs": [\n${paragraphs
      .map((paragraph) => `    ${JSON.stringify(paragraph)}`)
      .join(',\n')}\n  ]\n}\n`,
  )

  const variantMeta = await readJson(path.join(variantDir, 'variant.json'))
  variantMeta.hasAudio = true
  variantMeta.paths = { ...variantMeta.paths, audio: 'audio.m4a', narration: 'narration.json' }
  variantMeta.generation = {
    ...variantMeta.generation,
    audio: {
      model: recording.model,
      prompt: recording.scripted ? `pipeline/narration/${story}/${variant}.txt` : 'story.txt',
      generatedAt: recording.generatedAt,
      voice: recording.voice.name,
    },
  }
  await writeJson(path.join(variantDir, 'variant.json'), variantMeta)

  // Several editions are published at once (generate-narration.mjs reads three at a time),
  // so changes to the shared manifest wait their turn.
  manifestTurn = manifestTurn.then(async () => {
    const manifestFile = rootPath('public/content/manifest.json')
    const manifest = await readJson(manifestFile)
    const entry = manifest.stories.find((item) => item.id === story)
    if (entry) {
      entry.audio = { ...entry.audio, [variant]: Math.round(recording.seconds) }
      await writeJson(manifestFile, manifest)
    }
  })
  await manifestTurn
  return { paragraphs: paragraphs.length, seconds: recording.seconds }
}

// Makes the site's audio again for every edition read aloud (or one story's), each from the
// recording its narration.json was made from (same voice and length), e.g. after a change to
// encodeSiteAudio. The timings are left as they are.
export async function exportNarrationAudio({ story, concurrency = 6 } = {}) {
  const storiesDir = rootPath('public/content/stories')
  const jobs = []
  for (const id of story ? [story] : await fs.readdir(storiesDir)) {
    const workDir = rootPath('pipeline/work/narration', id)
    const recordings = []
    for (const file of await fs.readdir(workDir).catch(() => [])) {
      if (!file.endsWith('.json')) continue
      recordings.push({ take: file.slice(0, -5), ...(await readJson(path.join(workDir, file))) })
    }
    for (const variant of await fs.readdir(path.join(storiesDir, id)).catch(() => [])) {
      const variantDir = path.join(storiesDir, id, variant)
      const narration = await readJson(path.join(variantDir, 'narration.json')).catch(() => null)
      if (!narration) continue
      const recording = recordings.find(
        (item) =>
          item.variant === variant &&
          item.voice.id === narration.voiceId &&
          round(item.seconds) === narration.seconds,
      )
      if (!recording) {
        throw new Error(`No recording in ${workDir} matches ${id}/${variant}/narration.json`)
      }
      jobs.push({ story: id, variant, take: recording.take, variantDir, workDir })
    }
  }
  let next = 0
  const workers = Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++]
      await encodeSiteAudio(
        ['-i', path.join(job.workDir, `${job.take}.mp3`)],
        path.join(job.variantDir, 'audio.m4a'),
      )
    }
  })
  await Promise.all(workers)
  return jobs
}
