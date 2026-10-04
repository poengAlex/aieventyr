import { artUrl, loadArt } from 'src/logic/art'
import { loadManifest } from 'src/logic/content'
import type { ArtManifest, ArtSource, StoryListItem, VariantType } from 'src/types/content'

// The illustration sets, in the order the editions are offered. The classic set belongs to
// both the classic and the English text.
export const GALLERY_SETS = ['child-friendly', 'classic', 'modern'] as const
export type GallerySet = (typeof GALLERY_SETS)[number]

// What a picture is: a tale's cover and scenes, and for every character a portrait, a model
// sheet and the sheet as a short video of the character turning.
export const GALLERY_KINDS = ['covers', 'scenes', 'portraits', 'sheets', 'turns'] as const
export type GalleryKind = (typeof GALLERY_KINDS)[number]

export interface GalleryItem {
  key: string
  storyId: string
  set: GallerySet
  kind: GalleryKind
  // The full-size file, and the smallest copy for the grid.
  src: string
  thumb: string
  // The character's name; empty for covers and scenes.
  name: string
  // Scenes are numbered from 1 in the order of the tale.
  number: number
  caption: string
  alt: string
  description: string
  // What the image model was asked for: the picture's prompt, or the character's look.
  prompt: string
  fullPrompt: string | null
}

export interface Gallery {
  stories: StoryListItem[]
  items: GalleryItem[]
}

// The text whose captions a set's pictures are shown with.
export function gallerySetVariant(set: GallerySet, lang: 'no' | 'en'): VariantType {
  if (set === 'classic') return lang === 'en' ? 'english' : 'simplified'
  return set
}

const smallest = (sources: ArtSource[] | undefined, file: string) =>
  sources?.length ? sources.reduce((a, b) => (b.width < a.width ? b : a)).file : file

function itemsOf(art: ArtManifest, set: GallerySet): GalleryItem[] {
  const url = (file: string) => artUrl(set, art.storyId, file)
  const key = (...parts: string[]) => [set, art.storyId, ...parts].join('/')
  const items: GalleryItem[] = []
  const { cover } = art
  if (cover.file) {
    items.push({
      key: key('cover'),
      storyId: art.storyId,
      set,
      kind: 'covers',
      src: url(cover.file),
      thumb: url(smallest(cover.sources, cover.file)),
      name: '',
      number: 0,
      caption: cover.caption,
      alt: cover.alt,
      description: cover.alt,
      prompt: cover.prompt,
      fullPrompt: cover.fullPrompt,
    })
  }
  art.illustrations.forEach((picture, index) => {
    if (!picture.file) return
    items.push({
      key: key('scene', picture.id),
      storyId: art.storyId,
      set,
      kind: 'scenes',
      src: url(picture.file),
      thumb: url(smallest(picture.sources, picture.file)),
      name: '',
      number: index + 1,
      caption: picture.caption,
      alt: picture.alt,
      description: picture.alt,
      prompt: picture.prompt,
      fullPrompt: picture.fullPrompt,
    })
  })
  for (const character of art.characters) {
    const person = {
      storyId: art.storyId,
      set,
      name: character.name,
      number: 0,
      caption: '',
      alt: character.name,
      description: character.description,
      prompt: character.look,
      fullPrompt: null,
    }
    if (character.portrait) {
      items.push({
        ...person,
        key: key('portrait', character.slug),
        kind: 'portraits',
        src: url(character.portrait),
        thumb: url(smallest(character.portraitSources, character.portrait)),
      })
    }
    if (character.sheet) {
      const src = url(character.sheet)
      items.push({ ...person, key: key('sheet', character.slug), kind: 'sheets', src, thumb: src })
    }
    if (character.turn) {
      const src = url(character.turn)
      items.push({ ...person, key: key('turn', character.slug), kind: 'turns', src, thumb: src })
    }
  }
  return items
}

const rank =
  <T>(list: readonly T[]) =>
  (value: T) =>
    list.indexOf(value)
const kindRank = rank(GALLERY_KINDS)
const setRank = rank(GALLERY_SETS)

// Every picture of every tale, ordered by tale, then kind, then set. Tales or sets without
// new pictures yet are left out.
export async function loadGallery(lang: 'no' | 'en'): Promise<Gallery> {
  const manifest = await loadManifest()
  const stories = [...manifest.stories].sort((a, b) => a.index - b.index)
  const perStory = await Promise.all(
    stories.map(async (story) => {
      const sets = await Promise.all(
        GALLERY_SETS.map(async (set) => {
          const variant = gallerySetVariant(set, lang)
          if (!story.availableVariants.includes(variant)) return []
          const art = await loadArt(story.id, variant)
          return art ? itemsOf(art, set) : []
        }),
      )
      return sets
        .flat()
        .sort((a, b) => kindRank(a.kind) - kindRank(b.kind) || setRank(a.set) - setRank(b.set))
    }),
  )
  return { stories, items: perStory.flat() }
}
