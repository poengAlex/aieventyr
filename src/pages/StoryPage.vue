<template>
  <q-page class="story-page" :class="editionClass">
    <header class="reading-bar">
      <router-link to="/" class="text-button back">
        <q-icon name="arrow_back" />
        <span class="back-label">{{ t.allTales }}</span>
      </router-link>
      <div class="bar-title" :class="{ visible: pastHead }">{{ title }}</div>
      <reading-settings :available="story?.availableVariants" />
      <div class="reading-progress"><span :style="{ transform: `scaleX(${progress})` }" /></div>
    </header>

    <div v-if="loading" class="loading"><q-spinner size="36px" color="primary" /></div>

    <article v-else-if="bundle && story" class="tale">
      <header ref="headElement" class="tale-head">
        <button
          type="button"
          class="cover-button"
          :aria-label="cover.alt"
          @click="openImage(cover.src, cover.alt)"
        >
          <img
            :src="cover.src"
            :srcset="cover.srcset ?? ''"
            sizes="(max-width: 600px) 64vw, 380px"
            :alt="cover.alt"
          />
        </button>
        <h1>{{ title }}</h1>
        <div v-if="minutes" class="tale-meta">{{ t.minutes(minutes) }}</div>
        <edition-switch v-model="settings.variant" :available="story.availableVariants" small />
        <button
          v-if="bookReady"
          type="button"
          class="primary-button book-button"
          @click="pictureBookOpen = true"
        >
          <q-icon name="auto_stories" />
          {{ t.pictureBook }}
        </button>
      </header>

      <div ref="bodyElement" class="tale-body">
        <illustrated-story
          v-if="readerArt"
          :text="bundle.text"
          :art="readerArt"
          :font-size="settings.fontSize"
          @open-character="openCharacter"
          @open-image="openImage"
        />
      </div>

      <div class="ornament" aria-hidden="true">✦ ✦ ✦</div>

      <section v-if="characterCards.length" class="cast">
        <h2>{{ t.characters }}</h2>
        <div class="cast-row">
          <button
            v-for="(character, index) in characterCards"
            :key="character.slug"
            type="button"
            class="cast-member"
            @click="openCharacterAt(index)"
          >
            <img :src="character.image" alt="" loading="lazy" />
            <span>{{ character.name }}</span>
          </button>
        </div>
      </section>

      <router-link v-if="nextStory" :to="`/story/${nextStory.id}`" class="next-card">
        <img
          :src="nextStory.cover.src"
          :srcset="nextStory.cover.srcset ?? ''"
          sizes="88px"
          alt=""
          loading="lazy"
        />
        <div class="next-copy">
          <div class="eyebrow">{{ t.nextTale }}</div>
          <div class="next-title">{{ nextStory.title }}</div>
        </div>
        <q-icon name="arrow_forward" class="next-arrow" />
      </router-link>

      <p class="colophon">
        {{ t.originalTitle }}: <em>{{ story.originalTitle }}</em>
      </p>
    </article>

    <picture-book
      v-if="bookReady && art && bundle"
      v-model="pictureBookOpen"
      :text="bundle.text"
      :art="art"
      :title="title"
      :font-size="settings.fontSize + 2"
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
import CharacterDialog from 'src/components/CharacterDialog.vue'
import EditionSwitch from 'src/components/EditionSwitch.vue'
import FullscreenImageDialog from 'src/components/FullscreenImageDialog.vue'
import IllustratedStory from 'src/components/IllustratedStory.vue'
import PictureBook from 'src/components/PictureBook.vue'
import ReadingSettings from 'src/components/ReadingSettings.vue'
import { artSetFor, artSrcset, artUrl, fallbackArt, loadArt, loadArtCover } from 'src/logic/art'
import {
  getVariantBasePath,
  loadManifest,
  loadStory,
  loadVariantBundle,
  resolveStoryVariant,
} from 'src/logic/content'
import { readingMinutes, useText } from 'src/logic/i18n'
import { createNotify } from 'src/logic/utils'
import { useSettingsStore } from 'src/stores/settings'
import type {
  ArtManifest,
  CharacterCard,
  StoryListItem,
  StoryMeta,
  VariantBundle,
} from 'src/types/content'

const route = useRoute()
const settings = useSettingsStore()
const { t } = useText()

const loading = ref(true)
const story = ref<StoryMeta | null>(null)
const bundle = ref<VariantBundle | null>(null)
const art = ref<ArtManifest | null>(null)
const manifestStories = ref<StoryListItem[]>([])
const nextCover = ref<{ src: string; srcset?: string } | null>(null)

const pictureBookOpen = ref(false)
const imageDialogOpen = ref(false)
const activeImage = ref({ src: '', alt: '' })
const characterDialogOpen = ref(false)
const characterIndex = ref(0)

const headElement = ref<HTMLElement | null>(null)
const bodyElement = ref<HTMLElement | null>(null)
const progress = ref(0)
const pastHead = ref(false)

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
    title: next.titles?.[nextVariant] ?? next.canonicalTitle,
    cover: nextCover.value ?? {
      src: `${getVariantBasePath(next.id, nextVariant)}/main.webp`,
      srcset: undefined,
    },
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
  const body = bodyElement.value
  if (!body) return
  const rect = body.getBoundingClientRect()
  progress.value = Math.min(
    1,
    Math.max(0, (window.innerHeight * 0.6 - rect.top) / Math.max(1, rect.height)),
  )
  pastHead.value = (headElement.value?.getBoundingClientRect().bottom ?? 1) < 0
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

// Back to where the reader stopped, when they came from "continue reading".
function resume() {
  const last = settings.lastRead
  const body = bodyElement.value
  if (!route.query.resume || !last || !body) return
  if (last.storyId !== storyId.value || last.variant !== variant.value) return
  const top = body.getBoundingClientRect().top + window.scrollY
  window.scrollTo({ top: top + last.progress * body.offsetHeight - window.innerHeight * 0.6 })
}

async function loadPage() {
  loading.value = true
  art.value = null
  try {
    const manifest = await loadManifest()
    manifestStories.value = [...manifest.stories].sort((left, right) => left.index - right.index)
    story.value = await loadStory(storyId.value)
    const resolved = resolveStoryVariant(
      story.value.availableVariants,
      settings.variant,
      manifest.defaultVariant,
    )
    if (resolved !== settings.variant) settings.setVariant(resolved)
    const [loadedBundle, loadedArt] = await Promise.all([
      loadVariantBundle(storyId.value, resolved),
      loadArt(storyId.value, resolved),
    ])
    bundle.value = loadedBundle
    art.value = loadedArt
    const index = manifestStories.value.findIndex((item) => item.id === storyId.value)
    const next = manifestStories.value[index + 1]
    nextCover.value = next
      ? await loadArtCover(next.id, resolveStoryVariant(next.availableVariants, resolved))
      : null
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

watch([storyId, () => settings.variant], () => void loadPage())
</script>

<style lang="scss" scoped>
.story-page {
  background: var(--paper);
  transition: background-color 0.3s ease;
}

.reading-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: max(8px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 8px
    max(8px, env(safe-area-inset-left));
  background: color-mix(in srgb, var(--paper) 88%, transparent);
  backdrop-filter: blur(10px);
}

.back {
  padding-left: 8px;
}

.bar-title {
  overflow: hidden;
  font-family: var(--serif);
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  text-overflow: ellipsis;
  opacity: 0;
  transition: opacity 0.25s;
}

.bar-title.visible {
  opacity: 1;
}

.reading-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: var(--line);
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

.tale {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 max(20px, env(safe-area-inset-left)) 64px;
}

.tale-head {
  display: grid;
  justify-items: center;
  gap: 14px;
  padding: clamp(20px, 5vw, 48px) 0 clamp(28px, 6vw, 56px);
  text-align: center;
}

.cover-button {
  padding: 0;
  border: 0;
  background: none;
  cursor: zoom-in;
}

.cover-button img {
  display: block;
  width: min(380px, 64vw);
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 22px;
  background: var(--paper-deep);
  box-shadow: var(--shadow);
}

.tale-head h1 {
  max-width: 18em;
  margin: 10px 0 0;
  font-size: clamp(2rem, 5.4vw, 3.3rem);
  line-height: 1.06;
}

.tale-meta {
  font-size: 0.92rem;
  color: var(--ink-muted);
}

.book-button {
  margin-top: 6px;
}

.cast h2 {
  margin: 0 0 16px;
  font-size: 1.3rem;
  text-align: center;
}

.cast-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 18px 22px;
}

.cast-member {
  display: grid;
  justify-items: center;
  gap: 8px;
  width: 104px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink);
  font: 500 0.88rem/1.25 var(--sans);
  text-align: center;
  cursor: pointer;
}

.cast-member img {
  width: 88px;
  height: 88px;
  object-fit: cover;
  border-radius: 50%;
  background: var(--paper-deep);
  box-shadow: var(--shadow-soft);
  transition: transform 0.2s;
}

.cast-member:hover img {
  transform: scale(1.05);
}

.next-card {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
  max-width: 560px;
  margin: 56px auto 0;
  padding: 12px 20px 12px 12px;
  border-radius: 22px;
  background: var(--card);
  box-shadow: var(--shadow-soft);
  transition: box-shadow 0.2s;
}

.next-card:hover {
  box-shadow: var(--shadow);
}

.next-card img {
  width: 88px;
  height: 88px;
  object-fit: cover;
  border-radius: 14px;
}

.next-title {
  font-family: var(--serif);
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.25;
}

.next-arrow {
  font-size: 22px;
  color: var(--ink-muted);
}

.colophon {
  margin: 40px 0 0;
  text-align: center;
  font-size: 0.85rem;
  color: var(--ink-muted);
}

@media (max-width: 600px) {
  .back-label {
    display: none;
  }
}
</style>
