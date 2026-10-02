// Draws the site's icons from its mark (pipeline/lib/logo.mjs):
//
//   npm run content:icons
//
// Writes public/icons/favicon.svg, the PNG favicons and home-screen icons beside it, and
// public/favicon.ico for browsers that ask for it by name. index.html links them all.
import fs from 'fs/promises'
import sharp from 'sharp'
import { markSvg } from '../lib/logo.mjs'
import { ensureDir, rootPath } from '../lib/shared.mjs'

const iconsDir = rootPath('public/icons')

async function png(size, options) {
  return sharp(Buffer.from(markSvg(size, options)))
    .png({ compressionLevel: 9 })
    .toBuffer()
}

// An .ico file is a directory of images; modern ones may hold PNGs as they are.
function ico(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + 16 * images.length
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += data.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)])
}

await ensureDir(iconsDir)

// Browsers draw the SVG at tab size, so it is the small mark.
await fs.writeFile(rootPath('public/icons/favicon.svg'), `${markSvg(32)}\n`)

for (const size of [16, 32, 96, 128]) {
  await fs.writeFile(rootPath(`public/icons/favicon-${size}x${size}.png`), await png(size))
}
await fs.writeFile(rootPath('public/icons/apple-touch-icon.png'), await png(180, { pad: 8 }))
await fs.writeFile(rootPath('public/icons/icon-512x512.png'), await png(512, { pad: 8 }))

const icoImages = await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, data: await png(size) })),
)
await fs.writeFile(rootPath('public/favicon.ico'), ico(icoImages))

console.log('Icons written to public/icons and public/favicon.ico')
