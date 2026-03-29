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
const variantPriority: VariantType[] = [
  'simplified',
  'cleaned',
  'raw',
  'english',
  'child-friendly',
  'modern',
]

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

export function resolveStoryVariant(
  availableVariants: VariantType[],
  preferredVariant: VariantType,
  defaultVariant?: VariantType,
): VariantType {
  if (availableVariants.includes(preferredVariant)) return preferredVariant
  if (defaultVariant && availableVariants.includes(defaultVariant)) return defaultVariant
  for (const variant of variantPriority) {
    if (availableVariants.includes(variant)) return variant
  }
  if (!availableVariants.length) {
    throw new Error('Story has no available variants')
  }
  return availableVariants[0]!
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
        const manifest = await loadManifest()
        const story = await loadStory(storyId)
        const resolvedVariant = resolveStoryVariant(
          story.availableVariants,
          variant,
          manifest.defaultVariant,
        )
        const basePath = getVariantBasePath(storyId, resolvedVariant)
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
