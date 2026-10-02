// Draws the pictures that link previews show (Facebook, iMessage, Slack and so on): one
// 1200×630 card per tale, and one for the whole book.
//
//   npm run content:share-cards
//
// Writes public/content/share/<storyId>.jpg and public/content/share/eventyr.jpg. Each card
// is set like the site: the tale's cover framed as a plate on the left, its number and
// title on the right, and the site's logo (pipeline/lib/logo.mjs) at the foot. The cover comes from the classic illustration set, else the
// children's or modern set, else the older main.webp, so run this again when new covers
// land. `npm run build` points each tale's page at its card (scripts/build-share-pages.mjs).
//
// The text is drawn as outlines from the EB Garamond files in pipeline/assets/fonts, so the
// cards look the same on every machine, whatever fonts it has.
import fs from 'fs/promises'
import path from 'path'
import opentype from 'opentype.js'
import sharp from 'sharp'
import { lockup } from '../lib/logo.mjs'
import { ensureDir, fileExists, readJson, rootPath } from '../lib/shared.mjs'

const WIDTH = 1200
const HEIGHT = 630
const COLORS = {
  paper: '#f3ede1',
  paperDeep: '#ebe2d0',
  ink: '#1c1915',
  inkSoft: '#564f44',
  inkMuted: '#8a8171',
  accent: '#a3301d',
}
// Covers in the order they are preferred. Titles on the cards are the classic edition's.
const COVER_SETS = ['classic', 'child-friendly', 'modern']

const outDir = rootPath('public/content/share')
const regular = await loadFont('EBGaramond[wght].ttf')
const italic = await loadFont('EBGaramond-Italic[wght].ttf')

async function loadFont(file) {
  const buffer = await fs.readFile(rootPath('pipeline/assets/fonts', file))
  return opentype.parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  )
}

// The Roman numeral of a tale, as on the contents page.
function roman(value) {
  const numerals = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]
  let rest = value
  let result = ''
  for (const [amount, letters] of numerals) {
    while (rest >= amount) {
      result += letters
      rest -= amount
    }
  }
  return result
}

// Width of a line, with letter spacing in ems for the spaced capitals.
function measure(font, text, size, spacing = 0) {
  if (!spacing) return font.getAdvanceWidth(text, size, { kerning: true })
  return (
    [...text].reduce((sum, char) => sum + font.getAdvanceWidth(char, size) + spacing * size, 0) -
    spacing * size
  )
}

// One line of text as an SVG path, centred on x, with its baseline at y.
function line(font, text, cx, y, size, fill, spacing = 0) {
  let x = cx - measure(font, text, size, spacing) / 2
  if (!spacing) {
    return `<path fill="${fill}" d="${font.getPath(text, x, y, size, { kerning: true }).toPathData(2)}"/>`
  }
  const parts = []
  for (const char of text) {
    parts.push(font.getPath(char, x, y, size).toPathData(2))
    x += font.getAdvanceWidth(char, size) + spacing * size
  }
  return `<path fill="${fill}" d="${parts.join(' ')}"/>`
}

function wrap(font, text, size, maxWidth) {
  const lines = []
  let current = ''
  for (const word of text.split(/\s+/)) {
    const next = current ? `${current} ${word}` : word
    if (current && measure(font, next, size) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

// Two lines at the largest size that allows it; the longest titles take three smaller ones.
function fitTitle(text, maxWidth) {
  for (let size = 64; size >= 56; size -= 2) {
    const lines = wrap(regular, text, size, maxWidth)
    if (lines.length <= 2) return { size, lines }
  }
  for (let size = 54; size >= 40; size -= 2) {
    const lines = wrap(regular, text, size, maxWidth)
    if (lines.length <= 3) return { size, lines }
  }
  return { size: 40, lines: wrap(regular, text, 40, maxWidth) }
}

function ornament(cx, y) {
  const d = 5
  return [
    `<rect x="${cx - 12 - 36}" y="${y - 0.5}" width="36" height="1" fill="${COLORS.accent}" opacity="0.7"/>`,
    `<rect x="${cx + 12}" y="${y - 0.5}" width="36" height="1" fill="${COLORS.accent}" opacity="0.7"/>`,
    `<path fill="${COLORS.accent}" d="M${cx} ${y - d}L${cx + d} ${y}L${cx} ${y + d}L${cx - d} ${y}Z"/>`,
  ].join('')
}

// The paper, with the same faint grain as the site.
const paperSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/>
  <feColorMatrix values="0 0 0 0 .45 0 0 0 0 .38 0 0 0 0 .28 0 0 0 .09 0"/></filter>
  <rect width="100%" height="100%" fill="${COLORS.paper}"/>
  <rect width="100%" height="100%" filter="url(#n)"/>
</svg>`

// A thin rule, a margin of paper, a thin rule, as .plate draws it on the site.
function plateFrame(x, y, size) {
  const rect = (inset, color, width) =>
    `<rect x="${x - inset + width / 2}" y="${y - inset + width / 2}" width="${size + 2 * inset - width}" height="${size + 2 * inset - width}" fill="none" stroke="${color}" stroke-width="${width}"/>`
  return rect(1, COLORS.ink, 1) + rect(8, COLORS.ink, 1)
}

const PLATE = { x: 96, y: 96, size: 438 }
const COLUMN = { center: 872, width: 520 }

// The running head's baseline is level with the plate's top; the logo sits on its bottom
// rule.
const HEAD_BASELINE = 104
const LOGO = { height: 44, bottom: PLATE.y + PLATE.size + 8 }

// The right-hand page: running head, number, title, ornament, byline and logo. The number
// to the byline sit midway between the running head and the logo.
function pageText({ head, numeral, title, byline }) {
  const { size, lines } = fitTitle(title, COLUMN.width)
  const leading = size * 1.12
  const numeralSize = 30
  const blockHeight = (numeral ? numeralSize + 26 : 0) + lines.length * leading + 30 + 44
  let y = (HEAD_BASELINE + LOGO.bottom - LOGO.height - blockHeight) / 2
  const parts = [line(regular, head, COLUMN.center, HEAD_BASELINE, 17, COLORS.inkMuted, 0.16)]
  if (numeral) {
    y += numeralSize
    parts.push(line(regular, numeral, COLUMN.center, y, numeralSize, COLORS.accent, 0.12))
    y += 26
  }
  for (const text of lines) {
    y += leading
    parts.push(line(regular, text, COLUMN.center, y - leading * 0.2, size, COLORS.ink))
  }
  y += 30
  parts.push(ornament(COLUMN.center, y))
  y += 44
  parts.push(line(italic, byline, COLUMN.center, y, 25, COLORS.inkSoft))
  parts.push(lockup(COLUMN.center, LOGO.bottom - LOGO.height / 2, LOGO.height))
  return parts.join('')
}

async function coverFor(storyId) {
  for (const set of COVER_SETS) {
    const index = await readJsonIfExists(rootPath('public/content/art', set, 'index.json'))
    const cover = index?.stories?.[storyId]?.cover
    const file = cover && rootPath('public/content/art', set, storyId, cover)
    if (file && (await fileExists(file))) return file
  }
  const fallback = rootPath('public/content/stories', storyId, 'simplified', 'main.webp')
  return (await fileExists(fallback)) ? fallback : null
}

const indexCache = new Map()
async function readJsonIfExists(file) {
  if (!indexCache.has(file))
    indexCache.set(file, (await fileExists(file)) ? await readJson(file) : null)
  return indexCache.get(file)
}

async function drawCard(outFile, { plate, text }) {
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">${plateFrame(PLATE.x, PLATE.y, PLATE.size)}${text}</svg>`
  await sharp(Buffer.from(paperSvg))
    .composite([
      { input: plate, left: PLATE.x, top: PLATE.y },
      { input: Buffer.from(overlay), left: 0, top: 0 },
    ])
    .jpeg({ quality: 84, progressive: true, mozjpeg: true })
    .toFile(outFile)
}

async function talePlate(coverFile) {
  if (!coverFile) {
    return sharp({
      create: { width: PLATE.size, height: PLATE.size, channels: 3, background: COLORS.paperDeep },
    })
      .png()
      .toBuffer()
  }
  return sharp(coverFile).resize(PLATE.size, PLATE.size, { fit: 'cover' }).png().toBuffer()
}

// The book's own card: four covers in one plate, with a strip of paper between them.
async function bookPlate(coverFiles) {
  const gap = 8
  const tile = (PLATE.size - gap) / 2
  const tiles = await Promise.all(
    coverFiles
      .slice(0, 4)
      .map((file) => sharp(file).resize(tile, tile, { fit: 'cover' }).png().toBuffer()),
  )
  return sharp({
    create: { width: PLATE.size, height: PLATE.size, channels: 3, background: COLORS.paper },
  })
    .composite(
      tiles.map((input, i) => ({
        input,
        left: (i % 2) * (tile + gap),
        top: Math.floor(i / 2) * (tile + gap),
      })),
    )
    .png()
    .toBuffer()
}

await ensureDir(outDir)
const manifest = await readJson(rootPath('public/content/manifest.json'))
const stories = [...manifest.stories].sort((a, b) => a.index - b.index)
const covers = []

for (const story of stories) {
  const cover = await coverFor(story.id)
  if (cover) covers.push(cover)
  await drawCard(path.join(outDir, `${story.id}.jpg`), {
    plate: await talePlate(cover),
    text: pageText({
      head: 'NORSKE FOLKEEVENTYR',
      numeral: roman(story.index),
      title: story.titles?.simplified ?? story.canonicalTitle,
      byline: 'Asbjørnsen og Moe, fortalt på nytt',
    }),
  })
  console.log(`${story.id}: ${cover ? path.relative(rootPath(), cover) : 'no cover'}`)
}

await drawCard(path.join(outDir, 'eventyr.jpg'), {
  plate: await bookPlate(covers),
  text: pageText({
    head: `${stories.length} EVENTYR I FIRE UTGAVER`,
    numeral: '',
    title: 'Norske folkeeventyr',
    byline: 'samlet av Asbjørnsen og Moe, fortalt på nytt',
  }),
})
console.log(`\n${stories.length + 1} cards in ${path.relative(rootPath(), outDir)}`)
