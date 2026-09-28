import { acceptHMRUpdate, defineStore } from 'pinia'
import type { VariantType } from 'src/types/content'

export type VariantTypes = VariantType

const READ_KEY_SEPARATOR = '::'

function getReadKey(storyId: string, variant: VariantType) {
  return `${storyId}${READ_KEY_SEPARATOR}${variant}`
}

export interface ReadingPosition {
  storyId: string
  variant: VariantType
  // 0 to 1: how far down the text the reader has come.
  progress: number
  at: number
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    variant: 'simplified' as VariantTypes,
    fontSize: 21,
    night: false,
    readStoryIds: [] as string[],
    lastRead: null as ReadingPosition | null,
  }),
  getters: {
    isRead: (state) => (storyId: string, variant: VariantType) =>
      state.readStoryIds.includes(getReadKey(storyId, variant)),
  },
  actions: {
    setVariant(variant: VariantTypes) {
      this.variant = variant
    },
    setFontSize(size: number) {
      this.fontSize = Math.min(30, Math.max(16, size))
    },
    toggleNight() {
      this.night = !this.night
    },
    markAsRead(storyId: string, variant: VariantType, read = true) {
      const readKey = getReadKey(storyId, variant)
      const exists = this.readStoryIds.includes(readKey)
      if (read && !exists) this.readStoryIds.push(readKey)
      if (!read && exists) {
        this.readStoryIds = this.readStoryIds.filter((item) => item !== readKey)
      }
    },
    saveReadingPosition(storyId: string, variant: VariantType, progress: number) {
      this.lastRead = { storyId, variant, progress, at: Date.now() }
    },
    resetProgress() {
      this.readStoryIds = []
      this.lastRead = null
    },
  },
  persist: true,
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot))
}
