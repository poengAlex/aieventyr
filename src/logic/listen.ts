import { loadArtCover } from 'src/logic/art'
import { getVariantBasePath, loadManifest, resolveStoryVariant } from 'src/logic/content'
import { roman } from 'src/logic/i18n'
import type { Narration, StoryListItem, VariantType } from 'src/types/content'

// One narrated edition of a tale, as the player needs it.
export interface Track {
  storyId: string
  variant: VariantType
  title: string
  numeral: string
  cover: string
  src: string
  narration: Narration
}

const narrationCache = new Map<string, Promise<Narration>>()

function loadNarration(storyId: string, variant: VariantType) {
  const key = `${storyId}:${variant}`
  if (!narrationCache.has(key)) {
    const promise = fetch(`${getVariantBasePath(storyId, variant)}/narration.json`).then(
      (response) => {
        if (!response.ok) throw new Error(`No narration for ${key}`)
        return response.json() as Promise<Narration>
      },
    )
    promise.catch(() => narrationCache.delete(key))
    narrationCache.set(key, promise)
  }
  return narrationCache.get(key)!
}

export function isNarrated(story: StoryListItem | undefined, variant: VariantType) {
  return Boolean(story?.audio?.[variant])
}

// The recording of an edition (HE-AAC, see encodeSiteAudio in pipeline/lib/shared.mjs).
export function audioSrc(storyId: string, variant: VariantType) {
  return `${getVariantBasePath(storyId, variant)}/audio.m4a`
}

// The tale in the edition the player should read, or null when that edition is not read
// aloud.
export async function loadTrack(storyId: string, variant: VariantType): Promise<Track | null> {
  const manifest = await loadManifest()
  const story = manifest.stories.find((item) => item.id === storyId)
  if (!story || !isNarrated(story, variant)) return null
  const [narration, cover] = await Promise.all([
    loadNarration(storyId, variant),
    loadArtCover(storyId, variant),
  ])
  const base = getVariantBasePath(storyId, variant)
  return {
    storyId,
    variant,
    title: story.titles?.[variant] ?? story.canonicalTitle,
    numeral: roman(story.index),
    cover: new URL(cover?.src ?? `${base}/main.webp`, window.location.origin).href,
    src: audioSrc(storyId, variant),
    narration,
  }
}

// The next tale after this one that is read aloud in the same edition, if any.
export async function nextNarratedTale(storyId: string, variant: VariantType) {
  const manifest = await loadManifest()
  const stories = [...manifest.stories].sort((a, b) => a.index - b.index)
  const at = stories.findIndex((item) => item.id === storyId)
  for (const story of stories.slice(at + 1)) {
    const edition = resolveStoryVariant(story.availableVariants, variant)
    if (edition === variant && isNarrated(story, variant)) {
      return { id: story.id, title: story.titles?.[variant] ?? story.canonicalTitle }
    }
  }
  return null
}
