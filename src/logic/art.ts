import type {
  ArtIndex,
  ArtManifest,
  ArtPicture,
  ArtSource,
  VariantBundle,
  VariantType,
} from 'src/types/content'

// Which illustration set belongs to each text. The simplified and English texts tell the
// same tale moment by moment, so they share the classic pictures.
const ART_SETS: Partial<Record<VariantType, string>> = {
  'child-friendly': 'child-friendly',
  simplified: 'classic',
  english: 'classic',
  modern: 'modern',
}

const indexCache = new Map<string, Promise<ArtIndex | null>>()
const manifestCache = new Map<string, Promise<ArtManifest | null>>()

async function fetchJsonOrNull<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

export function artSetFor(variant: VariantType) {
  return ART_SETS[variant] ?? null
}

export function loadArtIndex(set: string) {
  if (!indexCache.has(set)) {
    indexCache.set(set, fetchJsonOrNull<ArtIndex>(`/content/art/${set}/index.json`))
  }
  return indexCache.get(set)!
}

// The illustrations for one story text, or null when that text has no new pictures yet.
export async function loadArt(storyId: string, variant: VariantType) {
  const set = artSetFor(variant)
  if (!set) return null
  const key = `${set}:${storyId}:${variant}`
  if (!manifestCache.has(key)) {
    manifestCache.set(
      key,
      (async () => {
        const entry = (await loadArtIndex(set))?.stories[storyId]
        const path = entry?.manifests[variant]
        if (!entry || !path || (!entry.done && !entry.cover)) return null
        const manifest = await fetchJsonOrNull<ArtManifest>(`/content/art/${set}/${path}`)
        return manifest && { ...manifest, set }
      })(),
    )
  }
  return manifestCache.get(key)!
}

// The cover for the library grid, or null when the story has no new cover. The small
// size sits next to the big one, named <cover>-512.webp.
export async function loadArtCover(storyId: string, variant: VariantType) {
  const set = artSetFor(variant)
  if (!set) return null
  const cover = (await loadArtIndex(set))?.stories[storyId]?.cover
  if (!cover) return null
  const small = cover.replace(/\.webp$/, '-512.webp')
  return {
    src: artUrl(set, storyId, small),
    srcset: `${artUrl(set, storyId, small)} 512w, ${artUrl(set, storyId, cover)} 1024w`,
  }
}

// Files in a manifest are relative to the story's folder in its set. Absolute paths
// (the older pictures, see fallbackArt) are used as they are.
export function artUrl(set: string, storyId: string, file: string) {
  return file.startsWith('/') ? file : `/content/art/${set}/${storyId}/${file}`
}

// A srcset attribute for the sizes of a web copy, or undefined when there is only one.
export function artSrcset(set: string, storyId: string, sources: ArtSource[] | undefined) {
  if (!sources || sources.length < 2) return undefined
  return sources.map((source) => `${artUrl(set, storyId, source.file)} ${source.width}w`).join(', ')
}

// Until a story has its new pictures, the reader shows the older section pictures in the
// same way: each section's picture after the section's first paragraph.
export function fallbackArt(bundle: VariantBundle, storyId: string): ArtManifest {
  const variant = bundle.variant.variant
  const base = `/content/stories/${storyId}/${variant}`
  const illustrations: ArtPicture[] = []
  let paragraph = 0
  for (const section of bundle.sections) {
    const paragraphs = splitParagraphs(section.text)
    if (paragraphs.length && section.imagePath) {
      illustrations.push({
        id: section.id,
        paragraph,
        anchor: paragraphs[0]!.slice(0, 40),
        file: `${base}/${section.imagePath}`,
        caption: '',
        alt: section.title,
        prompt: '',
        characters: [],
        places: [],
        fullPrompt: null,
      })
    }
    paragraph += paragraphs.length
  }
  return {
    storyId,
    set: '',
    variant,
    title: bundle.variant.displayTitle,
    model: '',
    quality: '',
    updatedAt: '',
    cover: {
      file: `${base}/main.webp`,
      caption: '',
      alt: bundle.variant.displayTitle,
      prompt: '',
      characters: [],
      fullPrompt: null,
    },
    characters: bundle.characters.map((character) => ({
      slug: character.slug,
      name: character.name,
      description: character.description,
      look: '',
      sheet: null,
      portrait: `${base}/${character.imagePath}`,
      replacesPortrait: null,
    })),
    places: [],
    illustrations,
  }
}

export function splitParagraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[«»“”"'‘’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

// Pictures that exist, keyed by the paragraph they follow. The anchor finds the paragraph
// again if the text has changed since the plan was written.
export function placePictures(paragraphs: string[], pictures: ArtPicture[]) {
  const placed = new Map<number, ArtPicture[]>()
  const normalized = paragraphs.map(normalize)
  for (const picture of pictures) {
    if (!picture.file) continue
    const start = normalize(picture.anchor || '').slice(0, 40)
    let index = picture.paragraph
    if (!normalized[index]?.startsWith(start)) {
      const found = start ? normalized.findIndex((paragraph) => paragraph.startsWith(start)) : -1
      index = found >= 0 ? found : Math.min(index, paragraphs.length - 1)
    }
    placed.set(index, [...(placed.get(index) ?? []), picture])
  }
  return placed
}

// One page of the picture book: a picture and the text that leads up to it.
export interface BookPage {
  src: string
  srcset?: string | undefined
  alt: string
  caption: string
  paragraphs: string[]
}

// Page one is the cover with the title. Every picture then gets a page with the text
// that leads up to it. Text after the last picture joins the last page.
export function bookPages(text: string, art: ArtManifest): BookPage[] {
  const paragraphs = splitParagraphs(text)
  const url = (file: string) => artUrl(art.set, art.storyId, file)
  const placed = [...placePictures(paragraphs, art.illustrations).entries()].sort(
    (a, b) => a[0] - b[0],
  )
  const pages: BookPage[] = []
  if (art.cover.file) {
    pages.push({
      src: url(art.cover.file),
      srcset: artSrcset(art.set, art.storyId, art.cover.sources),
      alt: art.cover.alt,
      caption: '',
      paragraphs: [],
    })
  }
  let start = 0
  for (const [index, pictures] of placed) {
    pictures.forEach((picture, n) => {
      pages.push({
        src: url(picture.file!),
        srcset: artSrcset(art.set, art.storyId, picture.sources),
        alt: picture.alt,
        caption: picture.caption,
        paragraphs: n === 0 ? paragraphs.slice(start, index + 1) : [],
      })
    })
    start = index + 1
  }
  const rest = paragraphs.slice(start)
  const last = pages[pages.length - 1]
  if (rest.length && last && pages.length > 1) last.paragraphs = [...last.paragraphs, ...rest]
  else if (rest.length)
    pages.push({ src: pages[0]?.src ?? '', alt: '', caption: '', paragraphs: rest })
  return pages
}

export interface TextSegment {
  text: string
  character?: string
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Straight and curly apostrophes count as the same letter: "Troll's" matches "troll’s".
const namePattern = (name: string) => escapeRegex(name).replace(/['’]/g, "['’]")
const sameName = (a: string, b: string) =>
  a.toLowerCase().replace(/’/g, "'") === b.toLowerCase().replace(/’/g, "'")

// Splits a paragraph into plain text and character names, so names can open the
// character's portrait. Only the first mention of each character per paragraph is marked.
export function linkCharacters(paragraph: string, characters: { slug: string; name: string }[]) {
  const names = characters
    .map((character) => ({
      slug: character.slug,
      name: character.name
        .replace(/\s*\(.*\)$/, '')
        .replace(/^(the|den|det|ei|en|et)\s+/i, '')
        .trim(),
    }))
    .filter((character) => character.name.length >= 3)
    .sort((a, b) => b.name.length - a.name.length)
  if (!names.length) return [{ text: paragraph }]
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(${names.map((c) => namePattern(c.name)).join('|')})(?![\\p{L}\\p{N}])`,
    'giu',
  )
  const segments: TextSegment[] = []
  const linked = new Set<string>()
  let last = 0
  for (const match of paragraph.matchAll(pattern)) {
    const character = names.find((c) => sameName(c.name, match[0]))
    if (!character || linked.has(character.slug)) continue
    linked.add(character.slug)
    if (match.index > last) segments.push({ text: paragraph.slice(last, match.index) })
    segments.push({ text: match[0], character: character.slug })
    last = match.index + match[0].length
  }
  if (last < paragraph.length) segments.push({ text: paragraph.slice(last) })
  return segments
}
