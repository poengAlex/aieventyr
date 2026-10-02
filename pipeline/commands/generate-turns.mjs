// Makes the turn animations (the character turning from the front to the side and back)
// from the model sheets of an art set, and adds them to the manifests. The art runner makes
// them too at the end of every run; this command is for sheets made by an earlier or
// running art run, and it only needs ffmpeg, no API key.
//
//   npm run art:turns                          every missing or outdated turn in child-friendly
//   npm run art:turns -- --set=classic --story=askesv,giske --ids=askeladden --force
//
// Options: --set=child-friendly|classic|modern --story=a,b --ids=slug,slug --force --concurrency=N
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { ensureTurn, ffmpegProblem, turnFile, turnOverride } from '../lib/turn.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((part) => part.startsWith('--'))
    .map((part) => {
      const [key, ...rest] = part.slice(2).split('=')
      return [key, rest.length ? rest.join('=') : true]
    }),
)
const setName = String(args.set || 'child-friendly')
const planDir = path.join(ROOT, 'pipeline/art', setName)
const style = JSON.parse(await fs.readFile(path.join(planDir, 'style.json'), 'utf8'))
const rawDir = path.resolve(ROOT, style.rawDir || `pipeline/art-raw/${setName}`)
const outDir = path.resolve(ROOT, style.outputDir)
const rawFormat = style.raw?.format === 'png' ? 'png' : 'webp'
const storyFilter = args.story ? new Set(String(args.story).split(',')) : null
const ids = args.ids ? new Set(String(args.ids).split(',')) : null
const force = Boolean(args.force)
const concurrency = Math.max(1, Number(args.concurrency || 4))

const problem = await ffmpegProblem()
if (problem) {
  console.error(`Cannot make turns: ${problem}.`)
  process.exit(1)
}

const listDir = (dir) => fs.readdir(dir, { withFileTypes: true }).catch(() => [])
const exists = (file) =>
  fs.access(file).then(
    () => true,
    () => false,
  )

// Every model sheet master in the set: <story>/characters/<slug>.<format>.
const sheets = []
for (const entry of await listDir(rawDir)) {
  if (!entry.isDirectory() || entry.name.startsWith('_')) continue
  if (storyFilter && !storyFilter.has(entry.name)) continue
  for (const file of await listDir(path.join(rawDir, entry.name, 'characters'))) {
    const match = file.name.match(new RegExp(`^([^.]+)\\.${rawFormat}$`))
    if (!match || (ids && !ids.has(match[1]))) continue
    sheets.push({
      story: entry.name,
      slug: match[1],
      master: path.join(rawDir, entry.name, 'characters', file.name),
      target: turnFile(path.join(outDir, entry.name, 'characters', match[1])),
    })
  }
}
sheets.sort((a, b) => `${a.story}/${a.slug}`.localeCompare(`${b.story}/${b.slug}`))
console.log(`Art set ${setName}: ${sheets.length} model sheets in ${path.relative(ROOT, rawDir)}`)

const made = []
const mirrored = []
const failed = []
let next = 0
let finished = 0
await Promise.all(
  Array.from({ length: Math.min(concurrency, sheets.length) }, async () => {
    while (next < sheets.length) {
      const sheet = sheets[next++]
      const label = `${sheet.story}/${sheet.slug}`
      try {
        const override = await turnOverride(planDir, sheet.story, sheet.slug)
        const result = await ensureTurn(sheet.master, sheet.target, { force, ...override })
        finished++
        if (result.made) {
          made.push(label)
          if (result.mirrored) mirrored.push(label)
          const note = result.mirrored ? ' (side view mirrored)' : ''
          console.log(`[${finished}/${sheets.length}] ok   ${label}${note}`)
        }
      } catch (error) {
        finished++
        failed.push(`${label}: ${error.message}`)
        console.log(`[${finished}/${sheets.length}] skip ${label} (${error.message})`)
      }
    }
  }),
)

// The manifests name each character's turn next to its sheet, or null without one.
let updated = 0
for (const story of new Set(sheets.map((sheet) => sheet.story))) {
  const storyDir = path.join(outDir, story)
  for (const file of await listDir(storyDir)) {
    if (!/^illustrations\..+\.json$/.test(file.name)) continue
    const manifestFile = path.join(storyDir, file.name)
    const text = await fs.readFile(manifestFile, 'utf8')
    let manifest
    try {
      manifest = JSON.parse(text)
    } catch (error) {
      console.warn(`Could not read ${path.relative(ROOT, manifestFile)}: ${error.message}`)
      continue
    }
    if (!Array.isArray(manifest.characters)) continue
    const characters = []
    for (const character of manifest.characters) {
      const relative = turnFile(`characters/${character.slug}`)
      const turn = (await exists(path.join(storyDir, relative))) ? relative : null
      const { turn: _old, ...rest } = character
      // Keep "turn" right after "sheet", where the art runner puts it.
      characters.push(
        Object.fromEntries(
          Object.entries(rest).flatMap(([key, value]) =>
            key === 'sheet'
              ? [
                  [key, value],
                  ['turn', turn],
                ]
              : [[key, value]],
          ),
        ),
      )
    }
    const result = JSON.stringify({ ...manifest, characters }, null, 2) + '\n'
    if (result === text) continue
    await fs.writeFile(manifestFile, result)
    updated++
  }
}

console.log(
  `\nMade ${made.length} turns, ${sheets.length - made.length - failed.length} were already current, ${failed.length} could not be made. Updated ${updated} manifests.`,
)
if (mirrored.length)
  console.log(
    `The side view faced the other way and was mirrored for:\n${mirrored.map((m) => `  ${m}`).join('\n')}\nCorrect any that are wrong in ${path.relative(ROOT, path.join(planDir, 'turns.json'))}.`,
  )
if (failed.length)
  console.log(
    `These characters keep the still model sheet:\n${failed.map((f) => `  ${f}`).join('\n')}`,
  )
