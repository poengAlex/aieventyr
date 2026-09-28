import { computed } from 'vue'
import { useSettingsStore } from 'src/stores/settings'
import type { VariantType } from 'src/types/content'

// The few words the interface needs. They follow the chosen edition: English for the
// English texts, Norwegian for the rest.
const no = {
  heading: 'Norske folkeeventyr',
  subheading: (count: number) => `${count} eventyr fra Asbjørnsen og Moe, fortalt på nytt.`,
  continueReading: 'Fortsett å lese',
  minutes: (minutes: number) => `${minutes} min`,
  read: 'Lest',
  allTales: 'Alle eventyr',
  pictureBook: 'Les som bildebok',
  characters: 'Hvem er med',
  nextTale: 'Neste eventyr',
  originalTitle: 'Originaltittel',
  readingSettings: 'Leseinnstillinger',
  textSize: 'Tekststørrelse',
  smaller: 'Mindre tekst',
  larger: 'Større tekst',
  night: 'Nattmodus',
  day: 'Dagmodus',
  edition: 'Utgave',
  about: 'Om eventyrene',
  showSheet: 'Vis figuren fra alle kanter',
  showPortrait: 'Vis portrettet',
  howMade: 'Slik ble bildet laget',
  fullPrompt: 'Hele beskrivelsen bildemodellen fikk',
  close: 'Lukk',
  previousPage: 'Forrige side',
  nextPage: 'Neste side',
  turnPhone: 'Snu telefonen',
  turnPhoneText: 'Bildeboka åpner seg som en ekte bok.',
  readUpright: 'Les på høykant',
  swipeHint: 'Sveip, eller trykk på høyre side, for å bla.',
  loadingFailed: 'Kunne ikke laste eventyret.',
  back: 'Tilbake',
  notFound: 'Her var det ingen eventyr',
  notFoundText: 'Siden finnes ikke. Kanskje trollet har tatt den.',
}

const en: typeof no = {
  heading: 'Norwegian Folk Tales',
  subheading: (count: number) => `${count} tales from Asbjørnsen and Moe, told anew.`,
  continueReading: 'Continue reading',
  minutes: (minutes: number) => `${minutes} min`,
  read: 'Read',
  allTales: 'All tales',
  pictureBook: 'Read as a picture book',
  characters: 'Who is in it',
  nextTale: 'Next tale',
  originalTitle: 'Original title',
  readingSettings: 'Reading settings',
  textSize: 'Text size',
  smaller: 'Smaller text',
  larger: 'Larger text',
  night: 'Night mode',
  day: 'Day mode',
  edition: 'Edition',
  about: 'About the tales',
  showSheet: 'Show the character from all sides',
  showPortrait: 'Show the portrait',
  howMade: 'How this picture was made',
  fullPrompt: 'Everything the image model was told',
  close: 'Close',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  turnPhone: 'Turn your phone sideways',
  turnPhoneText: 'The picture book opens up like a real book.',
  readUpright: 'Read upright instead',
  swipeHint: 'Swipe, or tap the right side, to turn the page.',
  loadingFailed: 'Could not load the tale.',
  back: 'Back',
  notFound: 'No tale here',
  notFoundText: 'This page does not exist. Perhaps the troll took it.',
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
