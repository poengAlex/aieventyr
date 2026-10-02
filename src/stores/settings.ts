import { acceptHMRUpdate, defineStore } from 'pinia'
import type { VariantType } from 'src/types/content'

export type VariantTypes = VariantType

// The face the site is set in: IM Fell, the storybook face, cut in the 1680s; EB Garamond,
// the classic book face; or the device's own plain sans serif, the easiest to read.
export type Typeface = 'fairytale' | 'classic' | 'plain'

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

// Where the listener stopped, so a tale picks up there next time.
export interface ListeningPosition {
  storyId: string
  variant: VariantType
  time: number
  at: number
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    variant: 'simplified' as VariantTypes,
    fontSize: 21,
    night: false,
    typeface: 'fairytale' as Typeface,
    readStoryIds: [] as string[],
    lastRead: null as ReadingPosition | null,
    // Reading aloud: the speed, whether the next tale follows by itself, and where the
    // listener stopped.
    listenSpeed: 1,
    autoContinue: true,
    lastListened: null as ListeningPosition | null,
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
