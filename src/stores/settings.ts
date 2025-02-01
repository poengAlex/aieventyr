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

export const VERSION_TEXT: Record<'1' | '2' | '3', string> = {
  '1': 'Original version model 4o, men med en del bugs',
  '2': 'Model 4o med en del bugs fikset',
  '3': 'Model o1 med enda flere bugs fikset',
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    variant: 'simplified' as VariantTypes,
    fontSize: 18,
    version: '3' as '1' | '2' | '3',
    filteredRead: false,
    read: {
      '1': {
        raw: [] as string[],
        cleaned: [] as string[],
        simplified: [] as string[],
        english: [] as string[],
        'child-friendly': [] as string[],
        modern: [] as string[],
      },
      '2': {
        raw: [] as string[],
        cleaned: [] as string[],
        simplified: [] as string[],
        english: [] as string[],
        'child-friendly': [] as string[],
        modern: [] as string[],
      },
      '3': {
        raw: [] as string[],
        cleaned: [] as string[],
        simplified: [] as string[],
        english: [] as string[],
        'child-friendly': [] as string[],
        modern: [] as string[],
      },
    },
  }),

  getters: {},

  actions: {
    resetMarkAsRead() {
      this.read = {
        '1': {
          raw: [],
          cleaned: [],
          simplified: [],
          english: [],
          'child-friendly': [],
          modern: [],
        },
        '2': {
          raw: [],
          cleaned: [],
          simplified: [],
          english: [],
          'child-friendly': [],
          modern: [],
        },
        '3': {
          raw: [],
          cleaned: [],
          simplified: [],
          english: [],
          'child-friendly': [],
          modern: [],
        },
      }
    },
    markAsRead(variant: VariantTypes, id: string, read: boolean) {
      const index = this.read[this.version][variant].indexOf(id)
      if (!read && index !== -1) {
        this.read[this.version][variant].splice(index, 1)
      } else if (read && index === -1) {
        this.read[this.version][variant].push(id)
      }
    },
    getMarkedAsRead(variant: VariantTypes, id: string) {
      return this.read[this.version][variant].includes(id)
    },
  },
  persist: true,
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot))
}
