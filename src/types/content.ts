export type VariantType = 'raw' | 'cleaned' | 'simplified' | 'english' | 'child-friendly' | 'modern'

export interface StoryListItem {
  id: string
  index: number
  canonicalTitle: string
  originalTitle: string
  summary: string
  availableVariants: VariantType[]
  coverImage: string
  // Each edition's own title and word count.
  titles?: Partial<Record<VariantType, string>>
  words?: Partial<Record<VariantType, number>>
}

export interface ContentManifest {
  name: string
  generatedAt: string
  defaultVariant: VariantType
  supportedVariants: VariantType[]
  generation: {
    textModel: string
    imageModel: string
    ttsModel: string
    ttsVoice: string
  }
  stories: StoryListItem[]
}

export interface StoryMeta {
  id: string
  index: number
  canonicalTitle: string
  originalTitle: string
  summary: string
  availableVariants: VariantType[]
}

export interface VariantPaths {
  text: string
  mainImage: string
  characters: string
  audio: string
  sections?: string
}

export interface VariantGenerationMeta {
  model?: string
  prompt?: string
  generatedAt?: string
  audio?: {
    model: string
    prompt: string
    generatedAt: string
    voice: string
  }
}

export interface VariantMeta {
  variant: VariantType
  displayTitle: string
  description: string
  tone: string
  summary?: string
  characterCount: number
  hasAudio: boolean
  hasInlineScenes?: boolean
  generation: VariantGenerationMeta
  paths: VariantPaths
}

export interface VariantCharacter {
  name: string
  slug: string
  description: string
  visualPrompt: string
  imagePath: string
}

export interface StorySection {
  id: string
  title: string
  text: string
  imagePath: string
}

// A word a reader of the edition may not know (glossary.json next to story.txt): the
// headword, every spelling of it the text uses, and a short explanation.
export interface GlossaryEntry {
  term: string
  forms: string[]
  note: string
}

export interface VariantBundle {
  story: StoryMeta
  variant: VariantMeta
  text: string
  characters: VariantCharacter[]
  sections: StorySection[]
  glossary: GlossaryEntry[]
}

// Illustrations made by pipeline/commands/generate-art.mjs into public/content/art/<set>/.
// One size of a web copy, for srcset.
export interface ArtSource {
  file: string
  width: number
}

export interface ArtCharacter {
  slug: string
  name: string
  description: string
  look: string
  sheet: string | null
  // The sheet as a short looping video of the character turning (pipeline/lib/turn.mjs).
  turn?: string | null
  portrait: string | null
  portraitSources?: ArtSource[]
  replacesPortrait: string | null
}

export interface ArtPicture {
  id: string
  paragraph: number
  anchor: string
  file: string | null
  sources?: ArtSource[]
  caption: string
  alt: string
  prompt: string
  characters: string[]
  places: string[]
  fullPrompt: string | null
}

export interface ArtManifest {
  storyId: string
  set: string
  variant: VariantType
  title: string
  model: string
  quality: string
  updatedAt: string
  cover: Omit<ArtPicture, 'id' | 'paragraph' | 'anchor' | 'places'>
  characters: ArtCharacter[]
  places: { slug: string; name: string; look: string }[]
  illustrations: ArtPicture[]
}

export interface ArtIndex {
  set: string
  variants: VariantType[]
  updatedAt: string
  stories: Record<
    string,
    { cover: string | null; pictures: number; done: number; manifests: Record<string, string> }
  >
}

// A character as the reader shows it: the new portrait and model sheet when the story
// has them, otherwise the older character picture.
export interface CharacterCard {
  slug: string
  name: string
  description: string
  image: string
  sheet: string | null
  turn: string | null
}
