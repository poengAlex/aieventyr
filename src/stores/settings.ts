import { acceptHMRUpdate, defineStore } from 'pinia'
import type { VariantType } from 'src/types/content'

export type VariantTypes = VariantType

export const VARIANTS = [
  'raw',
  'cleaned',
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

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    variant: 'simplified' as VariantTypes,
    fontSize: 19,
    unreadOnly: false,
    search: '',
    readStoryIds: [] as string[],
  }),
  getters: {
    isRead: (state) => (storyId: string) => state.readStoryIds.includes(storyId),
  },
  actions: {
    setVariant(variant: VariantTypes) {
      this.variant = variant
    },
    setSearch(value: string) {
      this.search = value
    },
    markAsRead(storyId: string, read = true) {
      const exists = this.readStoryIds.includes(storyId)
      if (read && !exists) this.readStoryIds.push(storyId)
      if (!read && exists) {
        this.readStoryIds = this.readStoryIds.filter((item) => item !== storyId)
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
