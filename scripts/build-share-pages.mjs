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
function page(
  template,
  { title, heading = title, description, url, image, noindex = false, body = '', jsonLd = null },
) {
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
  if (jsonLd) {
    const data = JSON.stringify(jsonLd).replace(/</g, '\\u003c')
    html = html.replace('</head>', `<script type="application/ld+json">${data}</script></head>`)
  }
  if (body) html = withPrerender(html, body)
  return html
}

// ---- the page's words in the HTML itself

// Search engines and link previews that do not run the app still get the page's text and
// links: they go inside the app's mount point, which the app empties when it starts. With
// scripts on they are hidden from the first paint, so readers never see them flash by.
const PRERENDER_HEAD =
  `<script>document.documentElement.classList.add('js')</script>` +
  `<style>.js .prerender{display:none}.prerender{max-width:40rem;margin:0 auto;padding:1rem;` +
  `font-family:Georgia,serif;line-height:1.6;color:#2b2118;background:#f3ede1}` +
  `.prerender img{max-width:100%;height:auto}</style>`

function withPrerender(html, body) {
  const mount = /<div id=["']?q-app["']?[^>]*>\s*<\/div>/i
  if (!mount.test(html)) throw new Error('index.html has no empty <div id="q-app"> to fill')
  html = html.replace('</head>', `${PRERENDER_HEAD}</head>`)
  return html.replace(mount, `<div id="q-app"><div class="prerender">${body}</div></div>`)
}

const nav = `<nav><a href="/">${SITE_NAME}</a> · <a href="/about/">Om eventyrene</a> · <a href="/images/">Bildene</a></nav>`

function paragraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

const authors = [
  { '@type': 'Person', name: 'Peter Christen Asbjørnsen' },
  { '@type': 'Person', name: 'Jørgen Moe' },
]

async function write(relative, html) {
  const file = path.join(dist, relative)
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, html)
}

const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8')
const manifest = JSON.parse(await fs.readFile(path.join(dist, 'content/manifest.json'), 'utf8'))
const bookCard = (await cardUrl('eventyr.jpg')) ?? `${site}/icons/icon-512x512.png`
const bookDescription = 'Norske folkeeventyr fra Asbjørnsen og Moe, fortalt på nytt og illustrert.'

const titleOf = (story) => story.titles?.[manifest.defaultVariant] ?? story.canonicalTitle
const taleList = manifest.stories
  .map(
    (story) =>
      `<li><a href="/story/${story.id}/">${escapeHtml(titleOf(story))}</a>` +
      (story.summary ? ` – ${escapeHtml(story.summary)}` : '') +
      `</li>`,
  )
  .join('')

const front = page(template, {
  title: SITE_NAME,
  description: bookDescription,
  url: `${site}/`,
  image: bookCard,
  body: `${nav}<h1>${SITE_NAME}</h1><p>${escapeHtml(bookDescription)}</p><ul>${taleList}</ul>`,
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `${site}/`,
    inLanguage: 'nb',
    description: bookDescription,
  },
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
    body: `${nav}<h1>Om eventyrene</h1><p>Hvor eventyrene kommer fra, og hva de fire utgavene er.</p><ul>${taleList}</ul>`,
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
    body: `${nav}<h1>Bildene</h1><p>Alle bildene i eventyrene: omslag, scener, portretter og modellark.</p><ul>${taleList}</ul>`,
  }),
)

let cards = 0
let texts = 0
for (const story of manifest.stories) {
  const title = titleOf(story)
  const card = await cardUrl(`${story.id}.jpg`)
  if (card) cards += 1
  const url = `${site}/story/${story.id}/`
  const variant = story.availableVariants?.includes(manifest.defaultVariant)
    ? manifest.defaultVariant
    : story.availableVariants?.[0]
  const textFile = path.join(dist, 'content/stories', story.id, variant ?? '', 'story.txt')
  const text = variant && (await exists(textFile)) ? await fs.readFile(textFile, 'utf8') : ''
  if (text) texts += 1
  const cover = story.coverImage ? `/content/${story.coverImage}` : null
  const body =
    nav +
    `<article><h1>${escapeHtml(title)}</h1>` +
    (cover ? `<img src="${cover}" alt="${escapeHtml(title)}" loading="lazy">` : '') +
    (story.summary ? `<p><em>${escapeHtml(story.summary)}</em></p>` : '') +
    paragraphs(text) +
    `<p>Fra Norske Folkeeventyr av P. Chr. Asbjørnsen og Jørgen Moe.</p></article>` +
    `<h2>Flere eventyr</h2><ul>${taleList}</ul>`
  await write(
    `story/${story.id}/index.html`,
    page(template, {
      title: `${title} · ${SITE_NAME}`,
      heading: title,
      description: story.summary,
      url,
      image: card ?? bookCard,
      body,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: title,
        ...(story.originalTitle ? { alternateName: story.originalTitle } : {}),
        description: story.summary,
        genre: 'Folkeeventyr',
        inLanguage: 'nb',
        url,
        image: card ?? bookCard,
        author: authors,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${site}/` },
      },
    }),
  )
}

// ---- sitemap and robots.txt

const addresses = [
  `${site}/`,
  `${site}/about/`,
  `${site}/images/`,
  ...manifest.stories.map((story) => `${site}/story/${story.id}/`),
]
await write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    addresses.map((address) => `  <url><loc>${escapeHtml(address)}</loc></url>\n`).join('') +
    `</urlset>\n`,
)
await write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`)

console.log(
  `Share pages: ${manifest.stories.length} tales (${cards} with their own card, ${texts} with their text), about, images, 404, sitemap.xml, robots.txt → ${site}`,
)
