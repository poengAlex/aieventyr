import { computed } from 'vue'
import { useSettingsStore } from 'src/stores/settings'
import type { VariantType } from 'src/types/content'

// The few words the interface needs. They follow the chosen edition: English for the
// English texts, Norwegian for the rest.
const no = {
  heading: ['Norske', 'folkeeventyr'],
  byline: 'samlet av Asbjørnsen og Moe, fortalt på nytt',
  contents: 'Innhold',
  minShort: 'min.',
  minutes: (minutes: number) => (minutes === 1 ? '1 minutt' : `${minutes} minutter`),
  continueHere: 'Fortsett der du slapp',
  read: 'Lest',
  pictureBook: 'Les som bildebok',
  characters: 'Hvem er med',
  glossary: 'Ordforklaringer',
  nextTale: 'Neste eventyr',
  originalTitle: 'Originaltittel',
  readingSettings: 'Leseinnstillinger',
  textSize: 'Tekststørrelse',
  smaller: 'Mindre tekst',
  larger: 'Større tekst',
  day: 'Dag',
  night: 'Natt',
  nightMode: 'Nattmodus',
  dayMode: 'Dagmodus',
  edition: 'Utgave',
  typeface: 'Skrift',
  fairytaleType: 'Eventyr',
  classicType: 'Klassisk',
  plainType: 'Enkel',
  about: 'Om eventyrene',
  showSheet: 'Vis fra alle kanter',
  showPortrait: 'Vis portrettet',
  howMade: 'Slik ble bildet laget',
  fullPrompt: 'Hele beskrivelsen bildemodellen fikk',
  close: 'Lukk',
  previous: 'Forrige',
  next: 'Neste',
  previousPage: 'Forrige side',
  nextPage: 'Neste side',
  turnPhone: 'Snu telefonen',
  turnPhoneText: 'Bildeboka åpner seg som en ekte bok.',
  readUpright: 'Les på høykant',
  swipeHint: 'Sveip, eller trykk på høyre side, for å bla.',
  loadingFailed: 'Kunne ikke laste eventyret.',
  notFound: 'Her var det ingen eventyr',
  notFoundText: 'Siden finnes ikke. Kanskje trollet har tatt den.',
  // Reading aloud
  listen: 'Lytt',
  listenBook: 'Bildebok med opplesning',
  play: 'Spill av',
  pause: 'Pause',
  back10: 'Ti sekunder tilbake',
  listenSettings: 'Opplesning',
  closePlayer: 'Lukk opplesningen',
  position: 'Hvor langt i eventyret',
  readBy: (voice: string) => `lest av ${voice}`,
  speed: 'Tempo',
  sleep: 'Sovetid',
  sleepOff: 'Av',
  sleepTale: 'Etter eventyret',
  sleepMinutes: (minutes: number) => `${minutes} min`,
  sleepIn: (minutes: number) => `stopper om ${minutes} min`,
  sleepAfter: 'stopper etter eventyret',
  autoContinue: 'Neste eventyr av seg selv',
  on: 'På',
  off: 'Av',
  upNext: 'Neste eventyr',
  inSeconds: (seconds: number) => `om ${seconds} s`,
  playNow: 'Spill nå',
  cancel: 'Avbryt',
  audioFailed: 'kunne ikke spille av',
}

const en: typeof no = {
  heading: ['Norwegian', 'Folk Tales'],
  byline: 'collected by Asbjørnsen and Moe, told anew',
  contents: 'Contents',
  minShort: 'min.',
  minutes: (minutes: number) => (minutes === 1 ? '1 minute' : `${minutes} minutes`),
  continueHere: 'Continue where you left off',
  read: 'Read',
  pictureBook: 'Read as a picture book',
  characters: 'Who is in it',
  glossary: 'Glossary',
  nextTale: 'Next tale',
  originalTitle: 'Original title',
  readingSettings: 'Reading settings',
  textSize: 'Text size',
  smaller: 'Smaller text',
  larger: 'Larger text',
  day: 'Day',
  night: 'Night',
  nightMode: 'Night mode',
  dayMode: 'Day mode',
  edition: 'Edition',
  typeface: 'Typeface',
  fairytaleType: 'Storybook',
  classicType: 'Classic',
  plainType: 'Plain',
  about: 'About the tales',
  showSheet: 'Show from all sides',
  showPortrait: 'Show the portrait',
  howMade: 'How this picture was made',
  fullPrompt: 'Everything the image model was told',
  close: 'Close',
  previous: 'Previous',
  next: 'Next',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  turnPhone: 'Turn your phone sideways',
  turnPhoneText: 'The picture book opens up like a real book.',
  readUpright: 'Read upright instead',
  swipeHint: 'Swipe, or tap the right side, to turn the page.',
  loadingFailed: 'Could not load the tale.',
  notFound: 'No tale here',
  notFoundText: 'This page does not exist. Perhaps the troll took it.',
  listen: 'Listen',
  listenBook: 'Picture book, read aloud',
  play: 'Play',
  pause: 'Pause',
  back10: 'Back ten seconds',
  listenSettings: 'Narration',
  closePlayer: 'Close the narration',
  position: 'How far into the tale',
  readBy: (voice: string) => `read by ${voice}`,
  speed: 'Speed',
  sleep: 'Sleep timer',
  sleepOff: 'Off',
  sleepTale: 'After this tale',
  sleepMinutes: (minutes: number) => `${minutes} min`,
  sleepIn: (minutes: number) => `stops in ${minutes} min`,
  sleepAfter: 'stops after this tale',
  autoContinue: 'Next tale by itself',
  on: 'On',
  off: 'Off',
  upNext: 'Next tale',
  inSeconds: (seconds: number) => `in ${seconds} s`,
  playNow: 'Play now',
  cancel: 'Cancel',
  audioFailed: 'could not play',
}

export type Texts = typeof no

const EDITIONS = {
  no: {
    'child-friendly': 'For barn',
    simplified: 'Klassisk',
    modern: 'Moderne',
    english: 'English',
  },
  en: {
    'child-friendly': 'For children',
    simplified: 'Classic',
    modern: 'Modern',
    english: 'English',
  },
} as const

// The editions readers choose between, in the order they are offered.
export const EDITION_ORDER = ['child-friendly', 'simplified', 'modern', 'english'] as const
export type Edition = (typeof EDITION_ORDER)[number]

export function useText() {
  const settings = useSettingsStore()
  const lang = computed(() => (settings.variant === 'english' ? 'en' : 'no'))
  const t = computed(() => (lang.value === 'en' ? en : no))
  const editionName = (variant: VariantType) =>
    (EDITIONS[lang.value] as Record<string, string>)[variant] ?? variant
  return { t, lang, editionName }
}

// Minutes to read a text aloud or silently, rounded up.
export function readingMinutes(words: number | undefined, variant: VariantType) {
  if (!words) return 0
  return Math.max(1, Math.ceil(words / (variant === 'child-friendly' ? 150 : 200)))
}

// Tales are numbered like the chapters of an old book.
export function roman(value: number) {
  const numerals: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]
  let rest = Math.max(0, Math.floor(value))
  let result = ''
  for (const [amount, letters] of numerals) {
    while (rest >= amount) {
      result += letters
      rest -= amount
    }
  }
  return result
}
