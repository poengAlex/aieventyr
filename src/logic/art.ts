import type { ArtIndex, ArtManifest, ArtPicture, VariantType } from 'src/types/content'

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

// The cover for the library grid, or null when the story has no new cover.
export async function loadArtCover(storyId: string, variant: VariantType) {
  const set = artSetFor(variant)
  if (!set) return null
  const cover = (await loadArtIndex(set))?.stories[storyId]?.cover
  return cover ? artUrl(set, storyId, cover) : null
}

export function artUrl(set: string, storyId: string, file: string) {
  return `/content/art/${set}/${storyId}/${file}`
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
