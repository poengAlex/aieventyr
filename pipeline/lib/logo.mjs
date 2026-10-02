// The site's mark and wordmark, drawn as outlines from the EB Garamond files in
// pipeline/assets/fonts so they look the same wherever they are drawn: the favicons
// (build-icons.mjs), the link preview cards (build-share-cards.mjs) and, copied by hand,
// src/components/SiteLogo.vue.
//
// The mark is a printer's initial: a capital E, for eventyr, cut out in paper from a block
// of the classic edition's red. Large marks get a thin paper rule inside the edge with a
// diamond at each corner, as an initial in an old storybook has; small ones leave it out
// and set the letter bolder so it still reads at 16 pixels.
import fs from 'fs/promises'
import opentype from 'opentype.js'
import { rootPath } from './shared.mjs'

export const LOGO_COLORS = {
  block: '#a3301d',
  paper: '#f3ede1',
  ink: '#1c1915',
  muted: '#8a8171',
}

async function loadFont(file) {
  const buffer = await fs.readFile(rootPath('pipeline/assets/fonts', file))
  return opentype.parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  )
}

const regular = await loadFont('EBGaramond[wght].ttf')

// The E in a 100 × 100 box, centred on its outline. `size` is its font size in the box.
function letterPath(size) {
  const bounds = regular.getPath('E', 0, 0, size).getBoundingBox()
  const x = 50 - (bounds.x1 + bounds.x2) / 2
  const y = 50 - (bounds.y1 + bounds.y2) / 2
  return regular.getPath('E', x, y, size).toPathData(2)
}

// Below this many pixels the rule and its corners blur together, so the small mark is used.
export const FRAMED_FROM = 64

export const MARK = {
  // The rule's centre line is `inset` in from the edge; `corner` is a diamond's half-width.
  framed: { letter: letterPath(70), rule: { inset: 9.2, width: 2.4, corner: 5 }, bolden: 0.6 },
  // No rule, a larger letter, thickened with a stroke of its own colour.
  small: { letter: letterPath(88), rule: null, bolden: 3.2 },
}

// The mark as SVG elements in a 100 × 100 box, to place with a transform.
export function markElements({
  framed = true,
  block = LOGO_COLORS.block,
  paper = LOGO_COLORS.paper,
} = {}) {
  const { letter, rule, bolden } = framed ? MARK.framed : MARK.small
  const parts = [`<rect width="100" height="100" fill="${block}"/>`]
  if (rule) {
    const { inset: at, width, corner: r } = rule
    parts.push(
      `<rect x="${at}" y="${at}" width="${100 - 2 * at}" height="${100 - 2 * at}" fill="none" stroke="${paper}" stroke-width="${width}"/>`,
    )
    for (const [x, y] of [
      [at, at],
      [100 - at, at],
      [at, 100 - at],
      [100 - at, 100 - at],
    ]) {
      parts.push(
        `<path fill="${paper}" d="M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z"/>`,
      )
    }
  }
  parts.push(
    `<path d="${letter}" fill="${paper}" stroke="${paper}" stroke-width="${bolden}" stroke-linejoin="round"/>`,
  )
  return parts.join('')
}

// A whole SVG file of the mark, `size` pixels square, framed if it is large enough. `pad`
// sets the mark in from the edge on more of its colour, for home-screen icons whose corners
// the phone rounds off.
export function markSvg(size, { pad = 0, ...options } = {}) {
  const elements = markElements({ framed: size >= FRAMED_FROM, ...options })
  const block = options.block ?? LOGO_COLORS.block
  const scale = 1 - (2 * pad) / 100
  const body = pad
    ? `<rect width="100" height="100" fill="${block}"/><g transform="translate(${pad} ${pad}) scale(${scale})">${elements}</g>`
    : elements
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${body}</svg>`
}

// "aieventyr.no", with its baseline at y and starting at x. Returns the SVG elements and
// the width they take.
export function wordmark(x, y, size, { ink = LOGO_COLORS.ink, muted = LOGO_COLORS.muted } = {}) {
  const name = regular.getPath('aieventyr', x, y, size, { kerning: true }).toPathData(2)
  const nameWidth = regular.getAdvanceWidth('aieventyr', size, { kerning: true })
  const domain = regular.getPath('.no', x + nameWidth, y, size, { kerning: true }).toPathData(2)
  const width = nameWidth + regular.getAdvanceWidth('.no', size, { kerning: true })
  return {
    svg: `<path fill="${ink}" d="${name}"/><path fill="${muted}" d="${domain}"/>`,
    width,
  }
}

// The mark beside the wordmark, centred on cx with its middle at cy. `height` is the mark's.
export function lockup(cx, cy, height, colors = {}) {
  const textSize = height * 0.78
  const gap = height * 0.34
  const { width: textWidth } = wordmark(0, 0, textSize)
  const width = height + gap + textWidth
  const x = cx - width / 2
  const top = cy - height / 2
  // The wordmark's x-height sits in the middle of the mark.
  const baseline = cy + (regular.tables.os2.sxHeight / regular.unitsPerEm) * textSize * 0.5
  const mark = `<g transform="translate(${x} ${top}) scale(${height / 100})">${markElements({ framed: height >= FRAMED_FROM, ...colors })}</g>`
  return mark + wordmark(x + height + gap, baseline, textSize, colors).svg
}
