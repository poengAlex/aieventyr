// Checks the word lists (glossary.json) of the four reading editions.
//
//   npm run content:glossary                     all stories
//   npm run content:glossary -- --story askesv   one story
//   npm run content:glossary -- --story askesv --variant simplified
//
// Each glossary.json is an array of { term, forms, note }: the headword shown in the note,
// every spelling of it the text uses, and a short explanation in the edition's language.
// The reader marks the first time one of the forms appears in the text.
import path from 'path'
import { fileExists, parseArgs, readJson, readText, rootPath } from '../lib/shared.mjs'

const EDITIONS = ['child-friendly', 'simplified', 'modern', 'english']
const ART_SETS = {
  'child-friendly': 'child-friendly',
  simplified: 'classic',
  english: 'classic',
  modern: 'modern',
}
const MAX_ENTRIES = 30
const MAX_NOTE = 220

const args = parseArgs(process.argv.slice(2))
const manifest = await readJson(rootPath('public/content/manifest.json'))
const stories = manifest.stories.filter((story) => !args.story || story.id === args.story)
if (!stories.length) throw new Error(`No story matched "${args.story}"`)

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// The same rules as the reader (src/logic/glossary.ts): whole words, any case, straight or
// curly apostrophes, any run of spaces between the words of a phrase.
const formPattern = (form) =>
  new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegex(form.trim()).replace(/['’]/g, "['’]").replace(/\s+/g, '\\s+')}(?![\\p{L}\\p{N}])`,
    'iu',
  )
const bareName = (name) =>
  name
    .replace(/\s*\(.*\)$/, '')
    .replace(/^(the|den|det|ei|en|et)\s+/i, '')
    .trim()
    .toLowerCase()

async function characterNames(storyId, variant) {
  const names = new Set()
  const charactersFile = rootPath('public/content/stories', storyId, variant, 'characters.json')
  if (await fileExists(charactersFile)) {
    for (const character of await readJson(charactersFile)) names.add(bareName(character.name))
  }
  const artFile = rootPath(
    'public/content/art',
    ART_SETS[variant],
    storyId,
    `illustrations.${variant}.json`,
  )
  if (await fileExists(artFile)) {
    for (const character of (await readJson(artFile)).characters ?? [])
      names.add(bareName(character.name))
  }
  return names
}

let errors = 0
let missing = 0
let entries = 0

for (const story of stories) {
  const variants = EDITIONS.filter(
    (variant) =>
      story.availableVariants.includes(variant) && (!args.variant || variant === args.variant),
  )
  for (const variant of variants) {
    const dir = rootPath('public/content/stories', story.id, variant)
    const file = path.join(dir, 'glossary.json')
    const label = `${story.id}/${variant}`
    if (!(await fileExists(file))) {
      missing += 1
      console.log(`${label}: no glossary.json`)
      continue
    }
    const problems = []
    let glossary
    try {
      glossary = await readJson(file)
    } catch (error) {
      problems.push(`not valid JSON: ${error.message}`)
    }
    if (glossary && !Array.isArray(glossary)) problems.push('must be an array')
    if (Array.isArray(glossary)) {
      const text = await readText(path.join(dir, 'story.txt'))
      const names = await characterNames(story.id, variant)
      const seen = new Map()
      if (glossary.length > MAX_ENTRIES)
        problems.push(`${glossary.length} entries; keep it to ${MAX_ENTRIES}`)
      glossary.forEach((entry, index) => {
        const at = `#${index + 1}${entry?.term ? ` "${entry.term}"` : ''}`
        if (typeof entry?.term !== 'string' || !entry.term.trim())
          problems.push(`${at}: term is missing`)
        if (typeof entry?.note !== 'string' || !entry.note.trim())
          problems.push(`${at}: note is missing`)
        else if (entry.note.length > MAX_NOTE)
          problems.push(`${at}: note is ${entry.note.length} characters; keep it under ${MAX_NOTE}`)
        if (!Array.isArray(entry?.forms) || !entry.forms.length) {
          problems.push(`${at}: forms must list the spellings the text uses`)
          return
        }
        for (const form of entry.forms) {
          if (typeof form !== 'string' || !form.trim()) {
            problems.push(`${at}: empty form`)
            continue
          }
          const key = form.trim().toLowerCase().replace(/’/g, "'")
          if (seen.has(key)) problems.push(`${at}: "${form}" is also a form of "${seen.get(key)}"`)
          seen.set(key, entry.term)
          if (names.has(key))
            problems.push(`${at}: "${form}" is a character's name; the reader already links those`)
          if (!formPattern(form).test(text))
            problems.push(`${at}: "${form}" is not in the text as a whole word`)
        }
      })
      entries += glossary.length
      if (!problems.length) console.log(`${label}: ${glossary.length} words`)
    }
    for (const problem of problems) console.log(`${label}: ${problem}`)
    errors += problems.length
  }
}

console.log(`\n${entries} words; ${errors} problems; ${missing} editions without a word list`)
if (errors) process.exitCode = 1
