// Generates the illustrations for one art set planned in pipeline/art/<set>/: a style
// reference, a model sheet and a portrait for each character, reference pictures of
// recurring places, a cover per story and the pictures that go with the text. Model
// sheets, place pictures and the style reference are sent along as reference images,
// so characters, places and style stay the same from picture to picture. Finished
// images are skipped, so a run can be stopped and started again at any time.
//
//   npm run art:generate -- --dry-run                  check the plans, count images, estimate the cost
//   npm run art:generate -- --story=askesv             one story, to check the look
//   npm run art:generate -- --budget=60                everything that is missing, stopping at about $60
//   npm run art:generate -- --story=askesv --only=scenes --ids=03,07 --force   redo two pictures
//
// Options: --set=child-friendly --story=a,b --only=style,characters,places,portraits,covers,scenes
//          --ids=03,askeladden --limit=N --budget=USD --concurrency=N --model=... --quality=...
//          --out=dir --force --dry-run --verbose
import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const API = `${(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')}/images`
const KINDS = ['style', 'characters', 'places', 'portraits', 'covers', 'scenes']
// Model sheets and place pictures are references for everything after them, so they go first.
const PHASES = [['style'], ['characters', 'places'], ['portraits', 'covers', 'scenes']]
const FATAL_CODES = [
  'insufficient_quota',
  'billing_hard_limit_reached',
  'invalid_api_key',
  'model_not_found',
]
const MAX_REFERENCES = 8

// Without the cache, sharp does not keep files open, which matters on Windows.
sharp.cache(false)

function parseCli(argv) {
  const args = {}
  for (const part of argv) {
    if (!part.startsWith('--')) continue
    const [key, ...rest] = part.slice(2).split('=')
    args[key] = rest.length ? rest.join('=') : true
  }
  return args
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

async function readJson(file) {
  const text = await fs.readFile(file, 'utf8')
  try {
    return JSON.parse(text)
  } catch (error) {
    fail(`${path.relative(ROOT, file)} is not valid JSON: ${error.message}`)
  }
}

async function exists(file) {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}

const args = parseCli(process.argv.slice(2))
const setName = String(args.set || 'child-friendly')
const planDir = path.join(ROOT, 'pipeline/art', setName)
if (!(await exists(path.join(planDir, 'style.json'))))
  fail(`No art set at pipeline/art/${setName}/style.json`)
const style = await readJson(path.join(planDir, 'style.json'))
const model = String(args.model || style.model)
const quality = String(args.quality || style.quality)
const outDir = path.resolve(ROOT, String(args.out || style.outputDir))
const concurrency = Math.max(1, Number(args.concurrency || style.concurrency || 3))
const limit = args.limit ? Number(args.limit) : Infinity
const budget = args.budget ? Number(args.budget) : Infinity
const only = new Set(args.only ? String(args.only).split(',') : KINDS)
const ids = args.ids ? new Set(String(args.ids).split(',')) : null
const dryRun = Boolean(args['dry-run'])
const force = Boolean(args.force)
const verbose = Boolean(args.verbose)
for (const kind of only)
  if (!KINDS.includes(kind)) fail(`Unknown --only value "${kind}". Use ${KINDS.join(', ')}.`)

// The story variants this set illustrates. One set can show the same pictures in several
// texts, such as the simplified Norwegian and the English version of a tale.
const variantKeys = style.variants || [setName]

// Plans for a set with one text may keep the title, the text placement, the captions and
// the character names at the top level. With several texts, these go under "variants",
// keyed by story variant. Plans are turned into the second form here.
function normalizePlan(plan) {
  if (plan.variants) return plan
  const key = variantKeys[0]
  const pick = (object, fields) =>
    Object.fromEntries(fields.filter((f) => object?.[f] !== undefined).map((f) => [f, object[f]]))
  return {
    ...plan,
    variants: { [key]: pick(plan, ['title', 'textFile']) },
    cast: (plan.cast || []).map((c) => ({
      ...c,
      variants: { [key]: pick(c, ['name', 'description', 'replacesPortrait']) },
    })),
    cover: plan.cover && {
      ...plan.cover,
      variants: { [key]: pick(plan.cover, ['caption', 'alt']) },
    },
    illustrations: (plan.illustrations || []).map((image) => ({
      ...image,
      variants: { [key]: pick(image, ['paragraph', 'anchor', 'caption', 'alt']) },
    })),
  }
}

const allStories = []
for (const file of (await fs.readdir(path.join(planDir, 'stories')))
  .filter((f) => f.endsWith('.json'))
  .sort()) {
  const plan = await readJson(path.join(planDir, 'stories', file))
  allStories.push({ ...normalizePlan(plan), planFile: file })
}
let stories = allStories
if (args.story) {
  const wanted = new Set(String(args.story).split(','))
  stories = allStories.filter((story) => wanted.has(story.storyId))
  const missing = [...wanted].filter((id) => !stories.some((story) => story.storyId === id))
  if (missing.length) fail(`No plan in pipeline/art/${setName}/stories for: ${missing.join(', ')}`)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const splitParagraphs = (text) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
const normalize = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[«»“”"'‘’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
const nameOf = (character) => character.promptName || character.name
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Which cast members a prompt mentions by name. A leading "the" or "a" is optional, so
// "the enormous Troll Guardian" mentions "the Troll Guardian", but the name itself must
// keep its capitals, so "the king's farm" does not mention "the King". Longer names go
// first, so "the Troll's Daughter" does not also count as "the Troll".
function mentionedCast(story, prompt) {
  let rest = prompt
  const found = new Set()
  const core = (character) => nameOf(character).replace(/^(the|a|an) /i, '')
  const cast = [...story.cast].sort((a, b) => core(b).length - core(a).length)
  for (const character of cast) {
    const pattern = new RegExp(`(?<![\\p{L}])${escapeRegex(core(character))}(?![\\p{L}])`, 'gu')
    if (pattern.test(rest)) {
      found.add(character.slug)
      rest = rest.replace(pattern, ' ')
    }
  }
  return found
}

// ---------------------------------------------------------------- validation

async function validateStory(story) {
  const problems = []
  const warnings = []
  const many = variantKeys.length > 1
  const where = (label, key) => (many ? `${label} (${key})` : label)
  if (`${story.storyId}.json` !== story.planFile)
    problems.push(`storyId "${story.storyId}" does not match the file name`)
  if (!story.world || story.world.length < 80)
    problems.push('world is missing or shorter than 80 characters')
  if (!story.palette || story.palette.length < 40)
    problems.push('palette is missing or shorter than 40 characters')
  const paragraphs = {}
  const portraits = {}
  for (const key of variantKeys) {
    const variant = story.variants?.[key]
    if (!variant) {
      problems.push(`missing the "${key}" variant`)
      continue
    }
    if (!variant.title) problems.push(where('missing title', key))
    try {
      const text = await fs.readFile(path.join(ROOT, variant.textFile || ''), 'utf8')
      paragraphs[key] = splitParagraphs(text)
      if (key === variantKeys[0]) story.words = text.split(/\s+/).filter(Boolean).length
    } catch {
      problems.push(where(`textFile "${variant.textFile}" not found`, key))
      continue
    }
    try {
      portraits[key] = JSON.parse(
        await fs.readFile(
          path.join(ROOT, path.dirname(variant.textFile), 'characters.json'),
          'utf8',
        ),
      )
    } catch {
      // no portrait list next to the text
    }
  }
  if (problems.length) return { problems, warnings }
  story.paragraphs = paragraphs

  const slugs = new Set()
  for (const character of story.cast || []) {
    const label = `cast ${character.slug}`
    if (!/^[a-z0-9-]+$/.test(character.slug || ''))
      problems.push(`${label}: slug must be lowercase letters, digits and dashes`)
    if (slugs.has(character.slug)) problems.push(`${label}: duplicate slug`)
    slugs.add(character.slug)
    if (!character.look || character.look.length < 60)
      problems.push(`${label}: look is missing or shorter than 60 characters`)
    for (const key of variantKeys) {
      const text = character.variants?.[key] || {}
      if (!text.name) problems.push(`${where(label, key)}: missing name`)
      if (!text.description) problems.push(`${where(label, key)}: missing description`)
      if (
        text.replacesPortrait &&
        portraits[key] &&
        !portraits[key].some((p) => p.slug === text.replacesPortrait)
      ) {
        problems.push(
          `${where(label, key)}: replacesPortrait "${text.replacesPortrait}" is not in characters.json`,
        )
      }
    }
  }
  for (const place of story.places || []) {
    const label = `place ${place.slug}`
    if (!/^[a-z0-9-]+$/.test(place.slug || ''))
      problems.push(`${label}: slug must be lowercase letters, digits and dashes`)
    if (slugs.has(place.slug)) problems.push(`${label}: slug is already used`)
    slugs.add(place.slug)
    if (!place.name) problems.push(`${label}: missing name`)
    if (!place.look || place.look.length < 60)
      problems.push(`${label}: look is missing or shorter than 60 characters`)
  }
  const castSlugs = new Set((story.cast || []).map((c) => c.slug))
  const placeSlugs = new Set((story.places || []).map((p) => p.slug))
  const usedPlaces = new Set()

  const checkPicture = (label, image) => {
    if (!image.prompt || image.prompt.length < 80)
      problems.push(`${label}: prompt is missing or shorter than 80 characters`)
    for (const key of variantKeys) {
      const text = image.variants?.[key] || {}
      if (!text.caption || text.caption.length > 140)
        problems.push(`${where(label, key)}: caption is missing or longer than 140 characters`)
      if (!text.alt || text.alt.length > 300)
        problems.push(`${where(label, key)}: alt is missing or longer than 300 characters`)
    }
    const characters = image.characters || []
    const places = image.places || []
    for (const slug of characters)
      if (!castSlugs.has(slug)) problems.push(`${label}: unknown character "${slug}"`)
    for (const slug of places) {
      if (!placeSlugs.has(slug)) problems.push(`${label}: unknown place "${slug}"`)
      usedPlaces.add(slug)
    }
    if (new Set(characters).size !== characters.length)
      problems.push(`${label}: a character is listed twice`)
    if (characters.length + places.length > MAX_REFERENCES)
      problems.push(`${label}: more than ${MAX_REFERENCES} characters and places`)
    if (!image.prompt || problems.some((p) => p.startsWith(`${label}: unknown`))) return
    const mentioned = mentionedCast(story, image.prompt)
    for (const slug of characters) {
      const character = story.cast.find((c) => c.slug === slug)
      if (!mentioned.has(slug))
        problems.push(
          `${label}: the prompt must name "${nameOf(character)}", who is listed in characters`,
        )
    }
    for (const slug of mentioned) {
      if (!characters.includes(slug)) {
        const character = story.cast.find((c) => c.slug === slug)
        warnings.push(
          `${label}: the prompt names "${nameOf(character)}", who is not listed in characters (no model sheet is sent)`,
        )
      }
    }
  }

  if (!story.cover) problems.push('missing cover')
  else checkPicture('cover', story.cover)
  const seen = new Set()
  const previous = Object.fromEntries(variantKeys.map((key) => [key, -1]))
  for (const image of story.illustrations || []) {
    const label = `illustration ${image.id}`
    if (!/^\d{2}$/.test(image.id || '')) problems.push(`${label}: id must be two digits`)
    if (seen.has(image.id)) problems.push(`${label}: duplicate id`)
    seen.add(image.id)
    for (const key of variantKeys) {
      const { paragraph, anchor } = image.variants?.[key] || {}
      const list = paragraphs[key]
      if (!Number.isInteger(paragraph) || paragraph < 0 || paragraph >= list.length) {
        problems.push(
          `${where(label, key)}: paragraph ${paragraph} is outside 0-${list.length - 1}`,
        )
        continue
      }
      const start = normalize(anchor || '').slice(0, 40)
      if (!start || !normalize(list[paragraph]).startsWith(start)) {
        problems.push(
          `${where(label, key)}: anchor "${anchor}" is not the start of paragraph ${paragraph}: "${list[paragraph].slice(0, 60)}"`,
        )
      }
      if (paragraph <= previous[key])
        problems.push(`${where(label, key)}: pictures must be in text order, one per paragraph`)
      previous[key] = paragraph
    }
    checkPicture(label, image)
  }
  if (!(story.illustrations || []).length) problems.push('no illustrations')
  for (const slug of placeSlugs)
    if (!usedPlaces.has(slug)) warnings.push(`place ${slug} is not used by any picture`)
  const appearances = new Map([...castSlugs].map((slug) => [slug, 0]))
  for (const image of [story.cover, ...(story.illustrations || [])].filter(Boolean)) {
    for (const slug of image.characters || [])
      appearances.set(slug, (appearances.get(slug) || 0) + 1)
  }
  for (const [slug, count] of appearances)
    if (!count) warnings.push(`cast ${slug} is not in any picture`)
  return { problems, warnings }
}

// Characters in different tales must not look alike. This compares the distinctive
// words of every look with the looks in the other tales of the set.
const COMMON_WORDS = new Set(
  'with and the a an of in on at to from his her their its he she they is are has have wears wearing dressed who that this into over under about very little big large small tall short long round old young little one two three four five six seven eight nine ten like as by or but than plus both each other also has sits stands holds carries around behind front side back up down out off'.split(
    ' ',
  ),
)
const lookWords = (look) =>
  new Set(
    look
      .toLowerCase()
      .split(/[^\p{L}]+/u)
      .filter((word) => word.length > 2 && !COMMON_WORDS.has(word)),
  )

function similarLooks(storyList, threshold) {
  const entries = storyList.flatMap((story) =>
    (story.cast || [])
      .filter((c) => c.look)
      .map((c) => ({ story: story.storyId, slug: c.slug, words: lookWords(c.look) })),
  )
  const pairs = []
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i]
      const b = entries[j]
      if (a.story === b.story) continue
      const shared = [...a.words].filter((word) => b.words.has(word)).length
      const score = shared / (a.words.size + b.words.size - shared)
      if (score >= threshold) pairs.push({ a, b, score })
    }
  }
  return pairs.sort((x, y) => y.score - x.score)
}

// ---------------------------------------------------------------- prompts

const STYLE_BASE = path.join(outDir, '_style', 'style')
const bullets = (lines) => lines.map((line) => `- ${line}`).join('\n')
const compose = (parts) => parts.filter(Boolean).join('\n\n')
const artStyle = () => `Art style: ${style.style}`
const rules = (picture) =>
  `Rules:\n${bullets([...style.rules, ...(picture ? style.pictureRules : [])])}`
const castOf = (story, slug) => story.cast.find((c) => c.slug === slug)
const placeOf = (story, slug) => story.places.find((p) => p.slug === slug)

// Reference images for a job, and the lines that tell the model what each one is for.
// The style reference goes to the kinds listed in style.styleReferenceFor, and to any
// picture that would otherwise have no reference at all.
function references(story, kind, characterSlugs = [], placeSlugs = []) {
  const files = []
  const lines = []
  const storyDir = path.join(outDir, story.storyId)
  if (style.styleReferenceFor.includes(kind) || !characterSlugs.length + placeSlugs.length) {
    files.push(`${STYLE_BASE}.webp`)
    lines.push(
      `Image ${files.length}: style reference only. Match its painting technique, line work, brushwork and paper texture. Do not copy anything shown in it (not its landscape, trees, rocks or composition), and take the colours and light from this story's own description.`,
    )
  }
  for (const slug of characterSlugs) {
    const name = nameOf(castOf(story, slug))
    files.push(path.join(storyDir, 'characters', `${slug}.webp`))
    lines.push(
      `Image ${files.length}: model sheet for ${name}, the same character seen from three sides. Keep ${name}'s face, hair, body shape, age, colours and clothes exactly as shown. Draw ${name} only once, in the pose this picture needs, and ignore the sheet's layout and plain background.`,
    )
  }
  for (const slug of placeSlugs) {
    const place = placeOf(story, slug)
    files.push(path.join(storyDir, 'places', `${slug}.webp`))
    lines.push(
      `Image ${files.length}: setting reference for ${place.name}. Keep its landforms, buildings, colours and key details, and choose the viewpoint and framing this picture needs.`,
    )
  }
  return { files, text: files.length ? `Reference images:\n${bullets(lines)}` : '' }
}

function whoAndWhere(story, characterSlugs = [], placeSlugs = []) {
  return [
    characterSlugs.length
      ? `Characters in this picture (nobody else, unless the picture description mentions them):\n${bullets(
          characterSlugs.map(
            (slug) => `${nameOf(castOf(story, slug))}: ${castOf(story, slug).look}`,
          ),
        )}`
      : '',
    placeSlugs.length
      ? `Setting:\n${bullets(placeSlugs.map((slug) => `${placeOf(story, slug).name}: ${placeOf(story, slug).look}`))}`
      : '',
  ]
}

const world = (story) =>
  `Story world: ${story.world}\n\nThis story's season, light and colours: ${story.palette}`

function stylePrompt() {
  return compose([style.styleAnchor, artStyle(), rules(false)])
}

function characterPrompt(story, character, refs) {
  return compose([
    refs.text,
    style.characterSheet,
    `Character: ${nameOf(character)}. ${character.look}`,
    world(story),
    artStyle(),
    rules(false),
  ])
}

function placePrompt(story, place, refs) {
  return compose([
    refs.text,
    style.placeSheet,
    `Place: ${place.name}. ${place.look}`,
    world(story),
    artStyle(),
    rules(true),
  ])
}

function portraitPrompt(story, character, refs) {
  const intro = style.portrait.replaceAll('{name}', nameOf(character))
  return compose([
    refs.text,
    character.portrait ? `${intro} ${character.portrait}` : intro,
    ...whoAndWhere(story, [character.slug]),
    world(story),
    artStyle(),
    rules(true),
  ])
}

function picturePrompt(story, image, refs, intro) {
  return compose([
    refs.text,
    intro,
    `Picture: ${image.prompt}`,
    ...whoAndWhere(story, image.characters, image.places),
    world(story),
    artStyle(),
    rules(true),
  ])
}

// ---------------------------------------------------------------- jobs

function planJobs() {
  const jobs = [
    {
      kind: 'style',
      id: 'style',
      label: '_style/style',
      out: STYLE_BASE,
      size: style.sizes.style,
      refs: [],
      prompt: stylePrompt(),
    },
  ]
  for (const story of stories) {
    const storyDir = path.join(outDir, story.storyId)
    const add = (kind, id, relative, characterSlugs, placeSlugs, build) => {
      const refs = references(story, kind, characterSlugs, placeSlugs)
      jobs.push({
        kind,
        id,
        label: `${story.storyId}/${relative}`,
        out: path.join(storyDir, ...relative.split('/')),
        size: style.sizes[kind],
        refs: refs.files,
        prompt: build(refs),
      })
    }
    for (const c of story.cast)
      add('characters', c.slug, `characters/${c.slug}`, [], [], (refs) =>
        characterPrompt(story, c, refs),
      )
    for (const p of story.places || [])
      add('places', p.slug, `places/${p.slug}`, [], [], (refs) => placePrompt(story, p, refs))
    for (const c of story.cast)
      add('portraits', c.slug, `portraits/${c.slug}`, [c.slug], [], (refs) =>
        portraitPrompt(story, c, refs),
      )
    const { cover } = story
    add('covers', 'cover', 'cover', cover.characters || [], cover.places || [], (refs) =>
      picturePrompt(story, cover, refs, style.cover),
    )
    for (const image of story.illustrations) {
      add(
        'scenes',
        image.id,
        `scenes/${image.id}`,
        image.characters || [],
        image.places || [],
        (refs) => picturePrompt(story, image, refs, style.scene),
      )
    }
  }
  return jobs
}

function estimate(job) {
  const { perImageUSDAt1024, perReferenceUSD, perPromptUSD } = style.estimate
  const [width, height] = job.size.split('x').map(Number)
  const output =
    (perImageUSDAt1024[quality] ?? perImageUSDAt1024.high) * ((width * height) / (1024 * 1024))
  return output + job.refs.length * perReferenceUSD + perPromptUSD
}

function costOf(usage) {
  if (!usage?.output_tokens) return null
  const prices = style.pricesUSDPerMillionTokens
  const imageIn = usage.input_tokens_details?.image_tokens ?? 0
  const textIn =
    usage.input_tokens_details?.text_tokens ?? Math.max(0, (usage.input_tokens || 0) - imageIn)
  return (
    (textIn * prices.textInput +
      imageIn * prices.imageInput +
      usage.output_tokens * prices.imageOutput) /
    1e6
  )
}

// ---------------------------------------------------------------- API

async function requestImage(job, prompt) {
  const headers = { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
  const params = { model, prompt, size: job.size, quality, n: 1, ...(style.extraParams || {}) }
  const signal = AbortSignal.timeout(10 * 60 * 1000)
  let response
  if (!job.refs.length) {
    response = await fetch(`${API}/generations`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal,
    })
  } else {
    const form = new FormData()
    for (const [key, value] of Object.entries({ ...params, ...(style.extraEditParams || {}) }))
      form.append(key, String(value))
    for (const ref of job.refs) {
      const png = await sharp(ref).png().toBuffer()
      form.append(
        'image[]',
        new Blob([png], { type: 'image/png' }),
        `${path.basename(ref, '.webp')}.png`,
      )
    }
    response = await fetch(`${API}/edits`, { method: 'POST', headers, body: form, signal })
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body?.error?.message || `HTTP ${response.status}`)
    error.status = response.status
    error.code = body?.error?.code || body?.error?.type
    error.retryAfter = Number(response.headers.get('retry-after')) || 0
    throw error
  }
  const b64 = body?.data?.[0]?.b64_json
  if (!b64) throw new Error('The response contained no image')
  return { buffer: Buffer.from(b64, 'base64'), usage: body.usage }
}

function fatalMessage(error) {
  if (error.code === 'insufficient_quota' || error.code === 'billing_hard_limit_reached') {
    return `The OpenAI account is out of credit or hit its spending limit (${error.message}). See platform.openai.com/settings/organization/billing.`
  }
  if (error.status === 401 || error.code === 'invalid_api_key')
    return `The API key was rejected (${error.message}). Check OPENAI_API_KEY in .env.`
  if (error.status === 403) {
    return `OpenAI refused access (${error.message}). Image models can require a verified organization: platform.openai.com/settings/organization/general.`
  }
  if (error.status === 404 || error.code === 'model_not_found') {
    return `Model ${model} is not available for this key (${error.message}). Try --model=gpt-image-2.5-sunburst, gpt-image-2 or gpt-image-1.5.`
  }
  return null
}

let stopReason = null

async function generate(job) {
  let prompt = job.prompt
  let softened = false
  for (let attempt = 1; ; attempt++) {
    try {
      return { ...(await requestImage(job, prompt)), prompt }
    } catch (error) {
      const fatal = FATAL_CODES.includes(error.code) || [401, 403, 404].includes(error.status)
      if (fatal) throw Object.assign(error, { fatal: true })
      const moderated =
        error.code === 'moderation_blocked' || /moderation|safety system/i.test(error.message)
      if (moderated) {
        if (softened) throw error
        softened = true
        prompt = `${job.prompt}\n\n${style.softenOnModeration}`
        continue
      }
      const retryable =
        error.status === undefined || [408, 409, 429].includes(error.status) || error.status >= 500
      if (!retryable || attempt >= 6 || stopReason) throw error
      const wait = Math.min(300, error.retryAfter || 15 * 2 ** (attempt - 1))
      console.warn(`      retry ${job.label} in ${wait}s: ${error.message}`)
      await sleep(wait * 1000)
    }
  }
}

// ---------------------------------------------------------------- review page and manifests

const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"]/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch],
  )

async function readIfExists(file) {
  return (await exists(file)) ? fs.readFile(file, 'utf8') : null
}

// Which images of a story exist, and the prompts that made them.
async function storyFiles(story) {
  const storyDir = path.join(outDir, story.storyId)
  const file = async (relative) => ((await exists(path.join(storyDir, relative))) ? relative : null)
  const prompt = (relative) => readIfExists(path.join(storyDir, relative))
  const files = {
    cover: await file('cover.webp'),
    coverPrompt: await prompt('cover.prompt.txt'),
    sheets: {},
    portraits: {},
    places: {},
    scenes: {},
    scenePrompts: {},
  }
  for (const c of story.cast) {
    files.sheets[c.slug] = await file(`characters/${c.slug}.webp`)
    files.portraits[c.slug] = await file(`portraits/${c.slug}.webp`)
  }
  for (const p of story.places || []) files.places[p.slug] = await file(`places/${p.slug}.webp`)
  for (const image of story.illustrations) {
    files.scenes[image.id] = await file(`scenes/${image.id}.webp`)
    files.scenePrompts[image.id] = await prompt(`scenes/${image.id}.prompt.txt`)
  }
  return files
}

// illustrations.<variant>.json holds everything a reader of that text needs: files,
// captions, alt texts and prompts. A file is null until its image exists.
async function writeManifests(story, files) {
  const storyDir = path.join(outDir, story.storyId)
  await fs.mkdir(storyDir, { recursive: true })
  for (const key of variantKeys) {
    const manifest = {
      storyId: story.storyId,
      set: setName,
      variant: key,
      title: story.variants[key].title,
      textFile: story.variants[key].textFile,
      placement:
        'Each illustration belongs directly after the paragraph with index "paragraph" (0-based, paragraphs split on blank lines).',
      model,
      quality,
      updatedAt: new Date().toISOString(),
      cover: {
        file: files.cover,
        caption: story.cover.variants[key].caption,
        alt: story.cover.variants[key].alt,
        prompt: story.cover.prompt,
        characters: story.cover.characters || [],
        fullPrompt: files.coverPrompt,
      },
      characters: story.cast.map((c) => ({
        slug: c.slug,
        name: c.variants[key].name,
        description: c.variants[key].description,
        look: c.look,
        sheet: files.sheets[c.slug],
        portrait: files.portraits[c.slug],
        replacesPortrait: c.variants[key].replacesPortrait || null,
      })),
      places: (story.places || []).map((p) => ({
        slug: p.slug,
        name: p.name,
        look: p.look,
        file: files.places[p.slug],
      })),
      illustrations: story.illustrations.map((image) => ({
        id: image.id,
        paragraph: image.variants[key].paragraph,
        anchor: image.variants[key].anchor,
        file: files.scenes[image.id],
        caption: image.variants[key].caption,
        alt: image.variants[key].alt,
        prompt: image.prompt,
        characters: image.characters || [],
        places: image.places || [],
        fullPrompt: files.scenePrompts[image.id],
      })),
    }
    await fs.writeFile(
      path.join(storyDir, `illustrations.${key}.json`),
      JSON.stringify(manifest, null, 2) + '\n',
    )
  }
}

function figure(storyId, file, caption) {
  const img = file
    ? `<a href="${storyId}/${file}"><img loading="lazy" src="${storyId}/${file}" alt=""></a>`
    : '<div class="missing">not generated yet</div>'
  return `<figure>${img}${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`
}

function reviewSection(story, files) {
  const first = variantKeys[0]
  const details = (label, value) =>
    value ? `<details><summary>${label}</summary><pre>${escapeHtml(value)}</pre></details>` : ''
  const texts = (image, placed) =>
    variantKeys
      .map((key) => {
        const text = image.variants[key]
        const quote = placed
          ? `<div class="muted">${escapeHtml(key)} · after paragraph ${text.paragraph}</div><blockquote>${escapeHtml(story.paragraphs[key][text.paragraph])}</blockquote>`
          : ''
        return `${quote}<p class="caption">${escapeHtml(text.caption)}</p><p class="muted">Alt: ${escapeHtml(text.alt)}</p>`
      })
      .join('')
  const done = story.illustrations.filter((image) => files.scenes[image.id]).length
  const cast = story.cast
    .map(
      (c) =>
        `<div class="card"><div class="pair">${figure(story.storyId, files.sheets[c.slug], 'Model sheet')}${figure(story.storyId, files.portraits[c.slug], 'Portrait')}</div>` +
        `<b>${escapeHtml(c.variants[first].name)}</b> <span class="muted">${escapeHtml(c.slug)} · ${escapeHtml(nameOf(c))}</span><p>${escapeHtml(c.variants[first].description)}</p><p class="muted">${escapeHtml(c.look)}</p></div>`,
    )
    .join('')
  const places = (story.places || [])
    .map((p) =>
      figure(
        story.storyId,
        files.places[p.slug],
        `<b>${escapeHtml(p.name)}</b><p class="muted">${escapeHtml(p.look)}</p>`,
      ),
    )
    .join('')
  const scenes = story.illustrations
    .map(
      (image) =>
        `<div class="scene">${figure(story.storyId, files.scenes[image.id], '')}<div><div class="muted">#${image.id} · ${escapeHtml((image.characters || []).join(', '))}</div>` +
        `${texts(image, true)}<p>${escapeHtml(image.prompt)}</p>${details('Full prompt', files.scenePrompts[image.id])}</div></div>`,
    )
    .join('')
  return (
    `<section id="${story.storyId}"><h2>${escapeHtml(story.variants[first].title)} <span class="muted">${story.storyId} · ${done}/${story.illustrations.length} pictures</span></h2>` +
    `<div class="scene">${figure(story.storyId, files.cover, '')}<div>${texts(story.cover, false)}<p>${escapeHtml(story.cover.prompt)}</p>${details('Full prompt', files.coverPrompt)}</div></div>` +
    `<h3>Characters</h3><div class="grid">${cast}</div>${places ? `<h3>Places</h3><div class="grid">${places}</div>` : ''}<h3>Pictures</h3>${scenes}</section>`
  )
}

async function writeReview(sections) {
  const nav = sections
    .map(
      ({ story }) =>
        `<a href="#${story.storyId}">${escapeHtml(story.variants[variantKeys[0]].title)}</a>`,
    )
    .join(' · ')
  const html = `<!doctype html>
<html lang="no"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Illustrations: ${escapeHtml(setName)}</title>
<style>
body{font:15px/1.5 system-ui,sans-serif;margin:0 auto;max-width:1200px;padding:16px;background:#f6f3ec;color:#222}
h2{margin-top:48px;border-top:2px solid #d8d2c4;padding-top:16px}.muted{color:#777;font-size:13px;font-weight:normal}
figure{margin:0}img{width:100%;display:block;border-radius:6px}.missing{aspect-ratio:3/2;display:grid;place-items:center;background:#e8e4da;color:#999;border-radius:6px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}.card{background:#fff;padding:10px;border-radius:8px}
.pair{display:grid;grid-template-columns:3fr 2fr;gap:6px}.scene{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:16px;margin:20px 0}
blockquote{margin:6px 0;padding-left:10px;border-left:3px solid #c9c1ae;color:#555}.caption{font-weight:600;font-size:17px}
pre{white-space:pre-wrap;font-size:12px;background:#fff;padding:8px}@media(max-width:800px){.scene{grid-template-columns:1fr}}
</style></head><body>
<h1>Illustrations: ${escapeHtml(setName)}</h1><p class="muted">${escapeHtml(model)}, quality ${escapeHtml(quality)}, texts: ${escapeHtml(variantKeys.join(', '))}, updated ${new Date().toLocaleString()}</p>
<figure style="max-width:480px">${(await exists(`${STYLE_BASE}.webp`)) ? '<img src="_style/style.webp" alt="">' : '<div class="missing">style reference not generated yet</div>'}<figcaption class="muted">Style reference</figcaption></figure>
<nav>${nav}</nav>${sections.map(({ html: section }) => section).join('\n')}
</body></html>
`
  await fs.writeFile(path.join(outDir, 'review.html'), html)
}

// Manifests for the stories in this run, and for stories made in earlier runs, so the
// review page shows the whole set.
async function writeOutputs() {
  const sections = []
  for (const story of allStories) {
    const selected = stories.includes(story)
    const manifest = path.join(outDir, story.storyId, `illustrations.${variantKeys[0]}.json`)
    if (!selected && !(await exists(manifest))) continue
    try {
      if (!selected) {
        const { problems } = await validateStory(story)
        if (problems.length) throw new Error(problems[0])
      }
      const files = await storyFiles(story)
      await writeManifests(story, files)
      sections.push({ story, files, html: reviewSection(story, files) })
    } catch (error) {
      if (selected) throw error
      console.warn(`Could not update ${story.storyId}: ${error.message}`)
    }
  }
  await writeReview(sections)
  // index.json tells the reader which stories have pictures in this set.
  const index = {
    set: setName,
    variants: variantKeys,
    updatedAt: new Date().toISOString(),
    stories: Object.fromEntries(
      sections.map(({ story, files }) => [
        story.storyId,
        {
          cover: files.cover,
          pictures: story.illustrations.length,
          done: Object.values(files.scenes).filter(Boolean).length,
          manifests: Object.fromEntries(
            variantKeys.map((key) => [key, `${story.storyId}/illustrations.${key}.json`]),
          ),
        },
      ]),
    ),
  }
  await fs.writeFile(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2) + '\n')
}

// ---------------------------------------------------------------- run

const problems = []
const warnings = []
for (const story of stories) {
  const result = await validateStory(story)
  problems.push(...result.problems.map((p) => `${story.storyId}: ${p}`))
  warnings.push(...result.warnings.map((w) => `${story.storyId}: ${w}`))
}
for (const { a, b, score } of similarLooks(allStories, style.similarLookThreshold ?? 0.3)) {
  if (stories.some((story) => story.storyId === a.story || story.storyId === b.story)) {
    warnings.push(
      `${a.story}/${a.slug} and ${b.story}/${b.slug} are described alike (${Math.round(score * 100)}% shared words); make them look different`,
    )
  }
}
if (warnings.length) console.warn(`Warnings:\n${warnings.map((w) => `  ${w}`).join('\n')}\n`)
if (problems.length)
  fail(`The plan has ${problems.length} problem(s):\n${problems.map((p) => `  ${p}`).join('\n')}`)

const jobs = planJobs().filter((job) => only.has(job.kind) && (!ids || ids.has(job.id)))
const todo = []
for (const job of jobs) if (force || !(await exists(`${job.out}.webp`))) todo.push(job)
const planned = todo.slice(0, Math.min(todo.length, limit))
const plannedCost = planned.reduce((sum, job) => sum + estimate(job), 0)

console.log(
  `Art set ${setName}: ${stories.length} stories, model ${model}, quality ${quality}, output ${path.relative(ROOT, outDir) || outDir}`,
)
if (dryRun || verbose) {
  for (const story of stories) {
    const count = story.illustrations.length
    console.log(
      `  ${story.storyId.padEnd(12)} ${String(story.words).padStart(5)} words  ${String(count).padStart(2)} pictures (1 per ${Math.round(story.words / count)} words)  ${story.cast.length} characters  ${(story.places || []).length} places`,
    )
  }
}
for (const kind of KINDS) {
  const list = planned.filter((job) => job.kind === kind)
  if (list.length)
    console.log(
      `  ${kind.padEnd(11)} ${String(list.length).padStart(4)} to make  ~$${list.reduce((s, j) => s + estimate(j), 0).toFixed(2)}`,
    )
}
console.log(
  `This run: ${planned.length} images (${jobs.length - todo.length} already done), estimated cost about $${plannedCost.toFixed(2)}`,
)
if (todo.length > planned.length)
  console.log(`${todo.length - planned.length} more are left for a later run (--limit).`)
if (verbose)
  for (const job of planned)
    console.log(`\n===== ${job.label} (${job.size}, ${job.refs.length} references)\n${job.prompt}`)
if (dryRun) process.exit(0)
if (!process.env.OPENAI_API_KEY)
  fail('OPENAI_API_KEY is not set. Put it in .env in the project folder or in the environment.')

await fs.mkdir(outDir, { recursive: true })
const logFile = path.join(outDir, 'run-log.jsonl')
const results = { done: 0, failed: [] }
const tokensPerReference = []
let spent = 0
let inFlight = 0
let finished = 0
let failuresInARow = 0
const runStart = Date.now()

let interrupts = 0
process.on('SIGINT', () => {
  if (++interrupts > 1) process.exit(130)
  stopReason = 'stopped with Ctrl+C'
  console.log(
    '\nFinishing the images in progress, then stopping. Press Ctrl+C again to quit at once.',
  )
})

function progress(job, status, detail) {
  finished++
  const counter = `[${String(finished).padStart(String(planned.length).length)}/${planned.length}]`
  let totals = ''
  if (status === 'ok') {
    const minutesLeft = Math.round(
      ((Date.now() - runStart) / 60000 / finished) * (planned.length - finished),
    )
    const eta =
      finished < planned.length
        ? `, about ${Math.floor(minutesLeft / 60)}h${String(minutesLeft % 60).padStart(2, '0')}m left`
        : ''
    totals = ` (total $${spent.toFixed(2)}${eta})`
  }
  console.log(`${counter} ${status.padEnd(4)} ${job.label} ${detail}${totals}`)
}

async function runJob(job) {
  if (stopReason) return
  const cost = estimate(job)
  if (spent + inFlight + cost > budget) {
    stopReason = `the --budget of $${budget} was reached`
    return
  }
  for (const ref of job.refs) {
    if (!(await exists(ref))) {
      results.failed.push(
        `${job.label}: its reference ${path.relative(outDir, ref)} does not exist (it failed or was skipped)`,
      )
      progress(job, 'skip', `(missing reference ${path.relative(outDir, ref)})`)
      return
    }
  }
  inFlight += cost
  const begin = Date.now()
  try {
    const { buffer, usage, prompt } = await generate(job)
    const actual = costOf(usage) ?? cost
    spent += actual
    if (usage?.input_tokens_details?.image_tokens && job.refs.length)
      tokensPerReference.push(usage.input_tokens_details.image_tokens / job.refs.length)
    await fs.mkdir(path.dirname(job.out), { recursive: true })
    await fs.writeFile(`${job.out}.prompt.txt`, prompt)
    await sharp(buffer)
      .webp({ quality: style.webpQuality || 88 })
      .toFile(`${job.out}.tmp.webp`)
    await fs.rename(`${job.out}.tmp.webp`, `${job.out}.webp`)
    results.done++
    failuresInARow = 0
    progress(job, 'ok', `${Math.round((Date.now() - begin) / 1000)}s $${actual.toFixed(3)}`)
    await fs.appendFile(
      logFile,
      JSON.stringify({
        at: new Date().toISOString(),
        job: job.label,
        ok: true,
        ms: Date.now() - begin,
        usd: actual,
        usage,
      }) + '\n',
    )
  } catch (error) {
    results.failed.push(`${job.label}: ${error.message}`)
    progress(job, 'FAIL', error.message)
    await fs.appendFile(
      logFile,
      JSON.stringify({
        at: new Date().toISOString(),
        job: job.label,
        ok: false,
        error: error.message,
        code: error.code,
      }) + '\n',
    )
    if (error.fatal) stopReason = fatalMessage(error) || error.message
    else if (++failuresInARow >= 8)
      stopReason = `8 images in a row failed; the last error was: ${error.message}`
  } finally {
    inFlight -= cost
  }
}

async function runPool(list) {
  let next = 0
  const workers = Array.from({ length: Math.min(concurrency, list.length) }, async () => {
    while (next < list.length && !stopReason) await runJob(list[next++])
  })
  await Promise.all(workers)
}

for (const phase of PHASES) await runPool(planned.filter((job) => phase.includes(job.kind)))
await writeOutputs()

const hours = ((Date.now() - runStart) / 3600000).toFixed(1)
console.log(
  `\nDone in ${hours}h: ${results.done} images made, ${results.failed.length} failed. Spent about $${spent.toFixed(2)}.`,
)
if (tokensPerReference.length) {
  const average = tokensPerReference.reduce((a, b) => a + b, 0) / tokensPerReference.length
  console.log(
    `A reference image costs about ${Math.round(average)} input tokens ($${((average * style.pricesUSDPerMillionTokens.imageInput) / 1e6).toFixed(3)}).`,
  )
}
if (stopReason) console.log(`Stopped early: ${stopReason}`)
if (results.failed.length)
  console.log(
    `Failed:\n${results.failed.map((f) => `  ${f}`).join('\n')}\nRun the same command again to retry them.`,
  )
console.log(`Review the pictures in ${path.relative(ROOT, path.join(outDir, 'review.html'))}`)
