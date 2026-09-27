// Prints a story text with the paragraph numbers the art plans use, a running word
// count, and the variant's current character list. For writing pipeline/art plans.
//
//   npm run art:paragraphs -- --story=askesv --variant=child-friendly
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((part) => part.startsWith('--'))
    .map((part) => {
      const [key, ...rest] = part.slice(2).split('=')
      return [key, rest.join('=') || true]
    }),
)
if (!args.story) {
  console.error('Usage: npm run art:paragraphs -- --story=<id> [--variant=child-friendly]')
  process.exit(1)
}
const dir = path.join(
  ROOT,
  'public/content/stories',
  String(args.story),
  String(args.variant || 'child-friendly'),
)
const text = await fs.readFile(path.join(dir, 'story.txt'), 'utf8')
const paragraphs = text
  .split(/\n\s*\n/)
  .map((p) => p.trim())
  .filter(Boolean)
let words = 0
for (const [index, paragraph] of paragraphs.entries()) {
  words += paragraph.split(/\s+/).length
  console.log(`[${index}] (${words}) ${paragraph}\n`)
}
console.log(`${paragraphs.length} paragraphs, ${words} words`)
try {
  const characters = JSON.parse(await fs.readFile(path.join(dir, 'characters.json'), 'utf8'))
  console.log('\nCurrent characters.json:')
  for (const c of characters) console.log(`- ${c.slug}: ${c.name}. ${c.description}`)
} catch {
  // no character list
}
