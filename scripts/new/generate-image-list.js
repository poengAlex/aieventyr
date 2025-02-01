import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const publicDir = path.join(__dirname, '../../public')

function getAllImageFiles(dir, extension) {
  let results = []
  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      results = results.concat(getAllImageFiles(fullPath, extension))
    } else if (item.toLowerCase().endsWith(extension)) {
      const relativePath = fullPath.replace(publicDir, '').split(path.sep).join('/')
      if (
        !relativePath.includes('/icons/') &&
        !relativePath.includes('/output/images/') &&
        !relativePath.includes('/output/old/images/') &&
        !relativePath.includes('/output/old/images_old/')
      ) {
        results.push(relativePath)
      }
    }
  }

  return results
}

// Generate PNG list
const pngFiles = getAllImageFiles(publicDir, '.png')
fs.writeFileSync(
  path.join(publicDir, 'all_png.json'),
  JSON.stringify({ images: pngFiles }, null, 2),
  'utf8',
)

// Generate WebP list
const webpFiles = getAllImageFiles(publicDir, '.webp')
fs.writeFileSync(
  path.join(publicDir, 'all_webp.json'),
  JSON.stringify({ images: webpFiles }, null, 2),
  'utf8',
)

console.log('PNG and WebP image lists generated successfully')
