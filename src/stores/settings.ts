import { defineStore, acceptHMRUpdate } from 'pinia'

export type VariantTypes =
  | 'raw'
  | 'cleaned'
  | 'simplified'
  | 'english'
  | 'child-friendly'
  | 'modern'
export const VARIANTS = [
  'raw',
  'cleaned',
  'simplified',
  'english',
  'child-friendly',
  'modern',
] as const

export const VARIANT_EXPLANATION: Record<VariantTypes, string> = {
  raw: 'Den originale teksten slik den ble skrevet av Asbjørnsen og Moe. Direkte scan fra boke (OCR).',
  cleaned: 'Teksten er renset ved hjelp av AI for å fjerne feil i OCR-teksten.',
  simplified: 'Teksten er forenklet til dagens norsk.',
  english: 'Teksten er oversatt til engelsk.',
  'child-friendly': 'Historiene er forenklet og endret for å gjøre de mer forståelige for barn.',
  modern: 'Eventyrene er satt til dagens samfunn.',
}

export const VARIANT_TEXT: Record<VariantTypes, string> = {
  raw: 'Rå fra originalen',
  cleaned: 'AI renset',
  simplified: 'AI forenklet',
  english: 'English',
  'child-friendly': 'AI forenklet for barn',
  modern: 'AI modernisert',
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    variant: 'simplified' as VariantTypes,
    fontSize: 18,
    legacy: false, //Old version of the stories and images
    filteredRead: false,
    read: {
      raw: [] as string[],
      cleaned: [] as string[],
      simplified: [] as string[],
      english: [] as string[],
      'child-friendly': [] as string[],
      modern: [] as string[],
    },
  }),

  getters: {},

  actions: {
    resetMarkAsRead() {
      this.read = {
        raw: [],
        cleaned: [],
        simplified: [],
        english: [],
        'child-friendly': [],
        modern: [],
      }
    },
    markAsRead(variant: VariantTypes, id: string, read: boolean) {
      console.log('markAsRead', variant, id, read)
      //check if the story is already marked as read
      const index = this.read[variant].indexOf(id)
      if (!read && index !== -1) {
        //remove from read list
        this.read[variant].splice(index, 1)
      } else if (read && index === -1) {
        //add to read list
        this.read[variant].push(id)
      }
    },
    getMarkedAsRead(variant: VariantTypes, id: string) {
      return this.read[variant].includes(id)
    },
  },
  persist: true,
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot))
}
