// Runs after `quasar build` (see the build script in package.json). Link previews on
// Facebook, iMessage, Slack and so on read the page's tags without running the app, so each
// tale gets its own copy of index.html with its title, blurb and card:
//
//   dist/spa/story/<id>/index.html   a tale, at /story/<id>/
//   dist/spa/about/index.html        the about page, at /about/
//   dist/spa/images/index.html       every picture, at /images/
//   dist/spa/404.html                the app, for any other address (App Platform serves
//                                    404.html for paths it has no file for)
//
// App Platform serves a folder's index.html only for the address with the trailing slash,
// so the app keeps tale addresses in that form (src/router/index.ts). The cards come from
// `npm run content:share-cards`; a tale without one falls back to the book's card. SITE_URL
// overrides the address the tags point to.
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist/spa')
const site = (process.env.SITE_URL || 'https://www.aieventyr.no').replace(/\/$/, '')
const SITE_NAME = 'Eventyr'

const escapeHtml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function exists(file) {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}

// The card's address, with a short hash of the file so previews fetch a changed card again.
async function cardUrl(name) {
  const file = path.join(dist, 'content/share', name)
  if (!(await exists(file))) return null
  const hash = crypto
    .createHash('sha1')
    .update(await fs.readFile(file))
    .digest('hex')
    .slice(0, 8)
  return `${site}/content/share/${name}?v=${hash}`
}

// Replaces the meta tag with this name or property, or adds it at the end of <head>.
function setMeta(html, attribute, key, content) {
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(content)}">`
  const pattern = new RegExp(`<meta\\s+${attribute}=["']?${escapeRegex(key)}["']?[^>]*>`, 'i')
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `${tag}</head>`)
}

function setLink(html, rel, href) {
  const tag = `<link rel="${rel}" href="${escapeHtml(href)}">`
  const pattern = new RegExp(`<link\\s+rel=["']?${escapeRegex(rel)}["']?[^>]*>`, 'i')
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `${tag}</head>`)
}

// `title` is the browser tab's; previews show `heading` above the site's name.
function page(template, { title, heading = title, description, url, image, noindex = false }) {
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
  html = setMeta(html, 'name', 'description', description)
  html = setMeta(html, 'property', 'og:site_name', SITE_NAME)
  html = setMeta(html, 'property', 'og:title', heading)
  html = setMeta(html, 'property', 'og:description', description)
  html = setMeta(html, 'property', 'og:url', url)
  html = setMeta(html, 'property', 'og:image', image)
  html = setMeta(html, 'name', 'twitter:title', heading)
  html = setMeta(html, 'name', 'twitter:description', description)
  html = setMeta(html, 'name', 'twitter:image', image)
  html = setLink(html, 'canonical', url)
  if (noindex) html = setMeta(html, 'name', 'robots', 'noindex')
  return html
}

async function write(relative, html) {
  const file = path.join(dist, relative)
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, html)
}

const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8')
const manifest = JSON.parse(await fs.readFile(path.join(dist, 'content/manifest.json'), 'utf8'))
const bookCard = (await cardUrl('eventyr.jpg')) ?? `${site}/icons/icon-512x512.png`
const bookDescription = 'Norske folkeeventyr fra Asbjørnsen og Moe, fortalt på nytt og illustrert.'

const front = page(template, {
  title: SITE_NAME,
  description: bookDescription,
  url: `${site}/`,
  image: bookCard,
})
await write('index.html', front)
await write(
  '404.html',
  page(template, {
    title: SITE_NAME,
    description: bookDescription,
    url: `${site}/`,
    image: bookCard,
    noindex: true,
  }),
)
await write(
  'about/index.html',
  page(template, {
    title: `Om eventyrene · ${SITE_NAME}`,
    heading: 'Om eventyrene',
    description: 'Hvor eventyrene kommer fra, og hva de fire utgavene er.',
    url: `${site}/about/`,
    image: bookCard,
  }),
)
await write(
  'images/index.html',
  page(template, {
    title: `Bildene · ${SITE_NAME}`,
    heading: 'Bildene',
    description: 'Alle bildene i eventyrene: omslag, scener, portretter og modellark.',
    url: `${site}/images/`,
    image: bookCard,
  }),
)

let cards = 0
for (const story of manifest.stories) {
  const title = story.titles?.simplified ?? story.canonicalTitle
  const card = await cardUrl(`${story.id}.jpg`)
  if (card) cards += 1
  await write(
    `story/${story.id}/index.html`,
    page(template, {
      title: `${title} · ${SITE_NAME}`,
      heading: title,
      description: story.summary,
      url: `${site}/story/${story.id}/`,
      image: card ?? bookCard,
    }),
  )
}

console.log(
  `Share pages: ${manifest.stories.length} tales (${cards} with their own card), about, images, 404 → ${site}`,
)
