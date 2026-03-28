import type {
  ContentManifest,
  StorySection,
  StoryMeta,
  VariantBundle,
  VariantCharacter,
  VariantMeta,
  VariantType,
} from 'src/types/content'

const manifestPath = '/content/manifest.json'

let manifestPromise: Promise<ContentManifest> | null = null
const storyCache = new Map<string, Promise<StoryMeta>>()
const variantCache = new Map<string, Promise<VariantBundle>>()

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`)
  }
  return response.json() as Promise<T>
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`)
  }
  return response.text()
}

export async function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = fetchJson<ContentManifest>(manifestPath)
  }
  return manifestPromise
}

export function getVariantBasePath(storyId: string, variant: VariantType) {
  return `/content/stories/${storyId}/${variant}`
}

export async function loadStory(storyId: string) {
  if (!storyCache.has(storyId)) {
    storyCache.set(storyId, fetchJson<StoryMeta>(`/content/stories/${storyId}/story.json`))
  }
  return storyCache.get(storyId)!
}

export async function loadVariantBundle(storyId: string, variant: VariantType) {
  const cacheKey = `${storyId}:${variant}`
  if (!variantCache.has(cacheKey)) {
    variantCache.set(
      cacheKey,
      (async () => {
        const story = await loadStory(storyId)
        const basePath = getVariantBasePath(storyId, variant)
        const variantMeta = await fetchJson<VariantMeta>(`${basePath}/variant.json`)
        const [text, characters] = await Promise.all([
          fetchText(`${basePath}/${variantMeta.paths.text}`),
          fetchJson<VariantCharacter[]>(`${basePath}/${variantMeta.paths.characters}`),
        ])
        const sections = variantMeta.paths.sections
          ? await fetchJson<StorySection[]>(`${basePath}/${variantMeta.paths.sections}`)
          : [
              {
                id: 'full-text',
                title: variantMeta.displayTitle,
                text,
                imagePath: variantMeta.paths.mainImage,
              },
            ]
        return {
          story,
          variant: variantMeta,
          text,
          characters,
          sections,
        } satisfies VariantBundle
      })(),
    )
  }
  return variantCache.get(cacheKey)!
}
