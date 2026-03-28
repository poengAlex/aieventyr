export type VariantType =
  | 'raw'
  | 'cleaned'
  | 'simplified'
  | 'english'
  | 'child-friendly'
  | 'modern'

export interface StoryListItem {
  id: string
  index: number
  canonicalTitle: string
  originalTitle: string
  summary: string
  availableVariants: VariantType[]
  coverImage: string
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

export interface VariantBundle {
  story: StoryMeta
  variant: VariantMeta
  text: string
  characters: VariantCharacter[]
  sections: StorySection[]
}
