<template>
  <q-page class="story-page" :class="editionClass">
    <header class="reading-bar">
      <router-link to="/" class="caps-link back">‹ {{ t.contents }}</router-link>
      <div class="bar-title" :class="{ visible: pastHead }">{{ title }}</div>
      <div class="bar-end">
        <reading-settings :available="story?.availableVariants" />
      </div>
      <div class="reading-progress"><span :style="{ transform: `scaleX(${progress})` }" /></div>
    </header>

    <div v-if="loading" class="loading"><q-spinner size="32px" color="primary" /></div>

    <illustrated-story
      v-else-if="bundle && story && readerArt"
      ref="storyElement"
      :text="bundle.text"
      :art="readerArt"
      :font-size="settings.fontSize"
      @open-character="openCharacter"
      @open-image="openImage"
    >
      <template #head>
        <header ref="headElement" class="tale-head">
          <button
            v-if="compact"
            type="button"
            class="opening-plate"
            :aria-label="cover.alt"
            @click="openImage(cover.src, cover.alt)"
          >
            <plate-image
              :src="cover.src"
              :srcset="cover.srcset ?? ''"
              sizes="(max-width: 600px) 64vw, 340px"
              :alt="cover.alt"
            />
          </button>
          <div v-if="listItem" class="numeral">{{ roman(listItem.index) }}</div>
          <h1>{{ title }}</h1>
          <div v-if="minutes" class="tale-meta">{{ t.minutes(minutes) }}</div>
          <edition-switch v-model="settings.variant" :available="story.availableVariants" />
          <button
            v-if="bookReady"
            type="button"
            class="caps-link accent book-link"
            @click="pictureBookOpen = true"
          >
            {{ t.pictureBook }} ›
          </button>
        </header>
      </template>

      <template #end>
        <footer class="tale-end">
          <div class="ornament" aria-hidden="true"><i /></div>

          <section v-if="characterCards.length" class="cast">
            <h2 class="caps">{{ t.characters }}</h2>
            <div class="cast-row">
              <button
                v-for="(character, index) in characterCards"
                :key="character.slug"
                type="button"
                class="cast-member"
                @click="openCharacterAt(index)"
              >
                <plate-image :src="character.image" alt="" loading="lazy" />
                <span>{{ character.name }}</span>
              </button>
            </div>
          </section>

          <nav v-if="nextStory" class="next">
            <div class="caps next-label">{{ t.nextTale }}</div>
            <contents-entry
              :to="`/story/${nextStory.id}`"
              :numeral="roman(nextStory.index)"
              :title="nextStory.title"
              :minutes="nextStory.minutes"
            />
          </nav>

          <p class="colophon">
            {{ t.originalTitle }}: <em>{{ story.originalTitle }}</em>
          </p>
        </footer>
      </template>
    </illustrated-story>

    <picture-book
      v-if="bookReady && art && bundle"
      v-model="pictureBookOpen"
      :text="bundle.text"
      :art="art"
      :title="title"
      :font-size="settings.fontSize + 1"
    />
    <fullscreen-image-dialog
      v-model="imageDialogOpen"
      :src="activeImage.src"
      :alt="activeImage.alt"
    />
    <character-dialog
      v-model="characterDialogOpen"
      v-model:index="characterIndex"
      :characters="characterCards"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import CharacterDialog from 'src/components/CharacterDialog.vue'
import ContentsEntry from 'src/components/ContentsEntry.vue'
import EditionSwitch from 'src/components/EditionSwitch.vue'
import FullscreenImageDialog from 'src/components/FullscreenImageDialog.vue'
import IllustratedStory from 'src/components/IllustratedStory.vue'
import PictureBook from 'src/components/PictureBook.vue'
import PlateImage from 'src/components/PlateImage.vue'
import ReadingSettings from 'src/components/ReadingSettings.vue'
import { artSetFor, artSrcset, artUrl, fallbackArt, loadArt } from 'src/logic/art'
import {
  getVariantBasePath,
  loadManifest,
  loadStory,
  loadVariantBundle,
  resolveStoryVariant,
} from 'src/logic/content'
import { readingMinutes, roman, useText } from 'src/logic/i18n'
import { createNotify } from 'src/logic/utils'
import { useSettingsStore } from 'src/stores/settings'
import type {
  ArtManifest,
  CharacterCard,
  StoryListItem,
  StoryMeta,
  VariantBundle,
  VariantType,
} from 'src/types/content'

const route = useRoute()
const $q = useQuasar()
const settings = useSettingsStore()
const { t } = useText()

const loading = ref(true)
const story = ref<StoryMeta | null>(null)
const bundle = ref<VariantBundle | null>(null)
const art = ref<ArtManifest | null>(null)
const manifestStories = ref<StoryListItem[]>([])

const pictureBookOpen = ref(false)
const imageDialogOpen = ref(false)
const activeImage = ref({ src: '', alt: '' })
const characterDialogOpen = ref(false)
const characterIndex = ref(0)

const storyElement = ref<InstanceType<typeof IllustratedStory> | null>(null)
const headElement = ref<HTMLElement | null>(null)
const progress = ref(0)
const pastHead = ref(false)

const compact = computed(() => $q.screen.lt.md)
const storyId = computed(() => String(route.params.id))
const variant = computed(() => bundle.value?.variant.variant ?? settings.variant)
const listItem = computed(() => manifestStories.value.find((item) => item.id === storyId.value))
const title = computed(
  () => listItem.value?.titles?.[variant.value] ?? story.value?.canonicalTitle ?? '',
)
const minutes = computed(() =>
  readingMinutes(listItem.value?.words?.[variant.value], variant.value),
)
const editionClass = computed(() => `edition-${artSetFor(variant.value) ?? 'classic'}`)

// The new pictures when this text has them; until then the older section pictures. The
// picture book waits for the new ones.
const hasArtScenes = computed(() =>
  Boolean(art.value?.illustrations.some((picture) => picture.file)),
)
const bookReady = computed(() => hasArtScenes.value)
const readerArt = computed(() =>
  art.value && hasArtScenes.value
    ? art.value
    : bundle.value
      ? fallbackArt(bundle.value, storyId.value)
      : null,
)

const cover = computed(() => {
  const manifest = art.value
  if (manifest?.cover.file) {
    return {
      src: artUrl(manifest.set, storyId.value, manifest.cover.file),
      srcset: artSrcset(manifest.set, storyId.value, manifest.cover.sources),
      alt: manifest.cover.alt,
    }
  }
  return {
    src: `${getVariantBasePath(storyId.value, variant.value)}/main.webp`,
    srcset: undefined,
    alt: title.value,
  }
})

const characterCards = computed<CharacterCard[]>(() => {
  const manifest = art.value
  const fromArt = (manifest?.characters ?? []).flatMap((character) => {
    const image = character.portrait || character.sheet
    if (!manifest || !image) return []
    return [
      {
        slug: character.slug,
        name: character.name,
        description: character.description,
        image: artUrl(manifest.set, storyId.value, image),
        sheet: character.sheet ? artUrl(manifest.set, storyId.value, character.sheet) : null,
      },
    ]
  })
  if (fromArt.length) return fromArt
  return (bundle.value?.characters ?? []).map((character) => ({
    slug: character.slug,
    name: character.name,
    description: character.description,
    image: `${getVariantBasePath(storyId.value, variant.value)}/${character.imagePath}`,
    sheet: null,
  }))
})

const nextStory = computed(() => {
  const index = manifestStories.value.findIndex((item) => item.id === storyId.value)
  const next = index >= 0 ? manifestStories.value[index + 1] : undefined
  if (!next) return null
  const nextVariant = resolveStoryVariant(next.availableVariants, settings.variant)
  return {
    id: next.id,
    index: next.index,
    title: next.titles?.[nextVariant] ?? next.canonicalTitle,
    minutes: readingMinutes(next.words?.[nextVariant], nextVariant),
  }
})

function openImage(src: string, alt: string) {
  activeImage.value = { src, alt }
  imageDialogOpen.value = true
}

function openCharacterAt(index: number) {
  characterIndex.value = index
  characterDialogOpen.value = true
}

function openCharacter(slug: string) {
  const index = characterCards.value.findIndex((character) => character.slug === slug)
  if (index >= 0) openCharacterAt(index)
}

// ---- reading progress

let frame = 0
let lastSaved = 0

// How far the reader has come: the share of the text above a line 60% down the window.
function measure() {
  frame = 0
  const text = storyElement.value?.textElement
  if (!text) return
  const rect = text.getBoundingClientRect()
  progress.value = Math.min(
    1,
    Math.max(0, (window.innerHeight * 0.6 - rect.top) / Math.max(1, rect.height)),
  )
  pastHead.value = (headElement.value?.getBoundingClientRect().bottom ?? 1) < 60
  if (!story.value) return
  if (progress.value > 0.97) settings.markAsRead(story.value.id, variant.value, true)
  const now = Date.now()
  if (now - lastSaved > 1500) {
    lastSaved = now
    settings.saveReadingPosition(story.value.id, variant.value, progress.value)
  }
}

function onScroll() {
  if (!frame) frame = requestAnimationFrame(measure)
}

// Back to where the reader stopped, when they came from "continue where you left off".
function resume() {
  const last = settings.lastRead
  const text = storyElement.value?.textElement
  if (!route.query.resume || !last || !text) return
  if (last.storyId !== storyId.value || last.variant !== variant.value) return
  const top = text.getBoundingClientRect().top + window.scrollY
  window.scrollTo({ top: top + last.progress * text.offsetHeight - window.innerHeight * 0.6 })
}

// The edition being loaded, so the edition watcher below does not load it twice.
let loadingVariant: VariantType | null = null

async function loadPage() {
  loading.value = true
  art.value = null
  try {
    const manifest = await loadManifest()
    manifestStories.value = [...manifest.stories].sort((left, right) => left.index - right.index)
    story.value = await loadStory(storyId.value)
    // Continuing a tale opens it in the edition it was being read in.
    const last = settings.lastRead
    const wanted =
      route.query.resume && last?.storyId === storyId.value ? last.variant : settings.variant
    const resolved = resolveStoryVariant(
      story.value.availableVariants,
      wanted,
      manifest.defaultVariant,
    )
    loadingVariant = resolved
    if (resolved !== settings.variant) settings.setVariant(resolved)
    const [loadedBundle, loadedArt] = await Promise.all([
      loadVariantBundle(storyId.value, resolved),
      loadArt(storyId.value, resolved),
    ])
    bundle.value = loadedBundle
    art.value = loadedArt
  } catch (error: unknown) {
    createNotify((error as Error).message, t.value.loadingFailed)
  } finally {
    loading.value = false
    await nextTick()
    resume()
    measure()
  }
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  void loadPage()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  if (frame) cancelAnimationFrame(frame)
  if (story.value && progress.value > 0) {
    settings.saveReadingPosition(story.value.id, variant.value, progress.value)
  }
})

watch(storyId, () => {
  window.scrollTo({ top: 0 })
  void loadPage()
})
watch(
  () => settings.variant,
  (next) => {
    if (next !== loadingVariant) void loadPage()
  },
)
</script>

<style lang="scss" scoped>
.reading-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  height: calc(var(--bar-height) + env(safe-area-inset-top));
  padding: env(safe-area-inset-top) max(18px, env(safe-area-inset-right)) 0
    max(18px, env(safe-area-inset-left));
  border-bottom: 1px solid var(--rule);
  background-color: var(--paper);
  background-image: var(--grain);
}

.back {
  justify-self: start;
  white-space: nowrap;
}

.bar-title {
  justify-self: center;
  max-width: 100%;
  overflow: hidden;
  font-style: italic;
  font-size: 1.08rem;
  white-space: nowrap;
  text-overflow: ellipsis;
  opacity: 0;
  transition: opacity 0.25s;
}

.bar-title.visible {
  opacity: 1;
}

.bar-end {
  justify-self: end;
}

.reading-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
}

.reading-progress span {
  display: block;
  height: 100%;
  background: var(--accent);
  transform-origin: left;
  transition: transform 0.15s linear;
}

.loading {
  display: grid;
  place-items: center;
  min-height: 60vh;
}

.tale-head {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 24px 0 44px;
  text-align: center;
}

.opening-plate {
  margin: 20px 0 22px;
  padding: 0;
  border: 0;
  background: none;
  cursor: zoom-in;
}

.opening-plate .plate {
  width: min(64vw, 340px);
  aspect-ratio: 1;
}

.tale-head h1 {
  max-width: 13em;
  font-size: clamp(2.3rem, 5.4vw, 3.4rem);
  line-height: 1.06;
}

.tale-meta {
  margin-bottom: 8px;
  font-style: italic;
  font-size: 1.08rem;
  color: var(--ink-muted);
}

.book-link {
  margin-top: 4px;
}

.tale-end {
  display: grid;
  gap: 48px;
  margin-top: 56px;
}

.cast h2 {
  margin-bottom: 22px;
  text-align: center;
  color: var(--ink-muted);
}

.cast-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 26px 24px;
}

.cast-member {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 14px;
  width: 112px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink);
  font-style: italic;
  font-size: 1.02rem;
  line-height: 1.25;
  cursor: pointer;
}

.cast-member .plate {
  width: 84px;
  height: 84px;
  border-radius: 50%;
}

.cast-member:hover span,
.cast-member:focus-visible span {
  color: var(--accent);
}

.next-label {
  margin-bottom: 6px;
  color: var(--ink-muted);
}

.colophon {
  margin: 0;
  text-align: center;
  font-size: 0.98rem;
  color: var(--ink-muted);
}

@media (max-width: 1023px) {
  .tale-head {
    padding-top: 8px;
  }
}
</style>
