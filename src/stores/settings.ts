import { acceptHMRUpdate, defineStore } from 'pinia'
import type { VariantType } from 'src/types/content'

export type VariantTypes = VariantType

export const VARIANTS = [
  'simplified',
  'english',
  'child-friendly',
  'modern',
] as const

export const VARIANT_TEXT: Record<VariantTypes, string> = {
  raw: 'Original OCR',
  cleaned: 'Cleaned',
  simplified: 'Simplified',
  english: 'English',
  'child-friendly': 'Child Friendly',
  modern: 'Modern',
}

export const VARIANT_EXPLANATION: Record<VariantTypes, string> = {
  raw: 'Raw OCR text from the archive source.',
  cleaned: 'OCR restored while keeping the original voice.',
  simplified: 'Modern Norwegian with easier reading flow.',
  english: 'English retelling of the folktale.',
  'child-friendly': 'A gentler version for younger readers.',
  modern: 'A contemporary reimagining of the story.',
}

const READ_KEY_SEPARATOR = '::'

function getReadKey(storyId: string, variant: VariantType) {
  return `${storyId}${READ_KEY_SEPARATOR}${variant}`
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    variant: 'simplified' as VariantTypes,
    fontSize: 19,
    showRead: false,
    readStoryIds: [] as string[],
  }),
  getters: {
    isRead: (state) => (storyId: string, variant: VariantType) => state.readStoryIds.includes(getReadKey(storyId, variant)),
  },
  actions: {
    setVariant(variant: VariantTypes) {
      this.variant = variant
    },
    markAsRead(storyId: string, variant: VariantType, read = true) {
      const readKey = getReadKey(storyId, variant)
      const exists = this.readStoryIds.includes(readKey)
      if (read && !exists) this.readStoryIds.push(readKey)
      if (!read && exists) {
        this.readStoryIds = this.readStoryIds.filter((item) => item !== readKey)
      }
    },
    resetProgress() {
      this.readStoryIds = []
    },
  },
  persist: true,
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot))
}
