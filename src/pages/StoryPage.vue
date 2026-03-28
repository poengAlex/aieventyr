<template>
  <q-page class="reader-page">
    <div v-if="loading" class="loading-panel">
      <q-spinner color="primary" size="42px" />
    </div>

    <template v-else-if="bundle && story">
      <section class="reader-hero">
        <div class="hero-text">
          <q-badge color="secondary" text-color="dark">Story {{ story.index }}</q-badge>
          <h1>{{ bundle.variant.displayTitle }}</h1>
          <p class="hero-summary">{{ bundle.variant.description }}</p>
          <div class="hero-meta">Original title: {{ story.originalTitle }}</div>
          <div class="hero-controls">
            <variant-selector compact :allowed-variants="story.availableVariants" />
            <div class="font-control">
              <span>Text size</span>
              <q-slider v-model="settings.fontSize" :min="16" :max="28" :step="1" color="primary" />
            </div>
          </div>
        </div>
        <q-img
          :src="mainImagePath"
          :ratio="1"
          class="hero-image clickable-image"
          fit="cover"
          @click="openImage(mainImagePath, bundle.variant.displayTitle)"
        />
      </section>

      <section class="reader-nav reader-nav-top">
        <q-btn v-if="previousStory" flat no-caps :to="`/story/${previousStory.id}`" label="Previous story" />
        <q-space />
        <q-btn v-if="nextStory" flat no-caps :to="`/story/${nextStory.id}`" label="Next story" />
      </section>

      <section class="reader-content">
        <div v-if="audioPath" class="audio-panel">
          <audio controls :src="audioPath" class="full-width" />
        </div>

        <div class="story-panel">
          <div class="story-sections">
            <article v-for="section in bundle.sections" :key="section.id" class="story-section">
              <div class="story-section-copy">
                <div class="story-text" :style="{ fontSize: `${settings.fontSize}px` }">
                  {{ section.text }}
                </div>
              </div>
              <q-img
                :src="getInlineScenePath(section.imagePath)"
                fit="cover"
                class="section-image clickable-image"
                @click="openImage(getInlineScenePath(section.imagePath), section.title)"
              />
            </article>
          </div>
        </div>

        <div class="character-panel">
          <div class="panel-title">Characters in this variant</div>
          <div class="character-grid">
            <q-card v-for="character in bundle.characters" :key="character.slug" flat class="character-card">
              <q-img
                :src="getCharacterPath(character.imagePath)"
                :ratio="1"
                fit="cover"
                class="clickable-image"
                @click="openCharacter(character.slug)"
              />
              <q-card-section>
                <div class="character-name">{{ character.name }}</div>
                <div class="character-description">{{ character.description }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <div v-if="galleryItems.length" class="image-carousel-panel">
          <div class="panel-title">All Story Images</div>
          <q-carousel
            ref="galleryCarousel"
            v-model="activeGallerySlide"
            v-model:fullscreen="galleryFullscreen"
            animated
            swipeable
            arrows
            thumbnails
            infinite
            control-color="white"
            control-text-color="black"
            height="min(72vw, 680px)"
            class="image-carousel"
          >
            <q-carousel-slide
              v-for="item in galleryItems"
              :key="item.id"
              :name="item.id"
              :img-src="item.src"
              class="image-carousel-slide"
            >
              <div class="carousel-frame clickable-image">
                <button
                  type="button"
                  class="carousel-image-hitbox"
                  :aria-label="`View ${item.title} in fullscreen`"
                  @click="toggleGalleryFullscreen"
                />
                <q-badge color="primary" text-color="white" class="carousel-variant-badge">
                  {{ item.variantLabel }}
                </q-badge>
                <div class="carousel-caption">
                  <div class="carousel-caption-title">{{ item.title }}</div>
                </div>
              </div>
            </q-carousel-slide>

            <q-carousel-control position="top-right" :offset="[16, 16]">
              <q-btn
                round
                unelevated
                color="white"
                text-color="dark"
                :icon="galleryFullscreen ? 'fullscreen_exit' : 'fullscreen'"
                :aria-label="galleryFullscreen ? 'Exit fullscreen carousel' : 'Enter fullscreen carousel'"
                class="carousel-fullscreen-btn"
                @click="toggleGalleryFullscreen"
              />
            </q-carousel-control>
          </q-carousel>
        </div>
      </section>

      <section class="reader-nav">
        <q-btn v-if="previousStory" flat no-caps :to="`/story/${previousStory.id}`" label="Previous story" />
        <q-space />
        <q-btn v-if="nextStory" flat no-caps :to="`/story/${nextStory.id}`" label="Next story" />
      </section>

      <fullscreen-image-dialog v-model="imageDialogOpen" :src="activeImage.src" :alt="activeImage.alt" />

      <q-dialog v-model="characterDialogOpen" maximized transition-show="fade" transition-hide="fade">
        <div v-if="currentCharacter" class="character-dialog">
          <q-btn
            round
            flat
            icon="close"
            class="dialog-close"
            aria-label="Close character viewer"
            @click="characterDialogOpen = false"
          />

          <q-btn
            v-if="bundle.characters.length > 1"
            round
            flat
            icon="chevron_left"
            class="dialog-nav dialog-nav-left"
            aria-label="Previous character"
            @click="showPreviousCharacter"
          />

          <div class="character-dialog-content">
            <img
              :src="getCharacterPath(currentCharacter.imagePath)"
              :alt="currentCharacter.name"
              class="character-dialog-image"
            />
            <div class="character-dialog-copy">
              <div class="character-dialog-title">{{ currentCharacter.name }}</div>
              <div class="character-dialog-description">{{ currentCharacter.description }}</div>
            </div>
          </div>

          <q-btn
            v-if="bundle.characters.length > 1"
            round
            flat
            icon="chevron_right"
            class="dialog-nav dialog-nav-right"
            aria-label="Next character"
            @click="showNextCharacter"
          />
        </div>
      </q-dialog>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import FullscreenImageDialog from 'src/components/FullscreenImageDialog.vue'
import VariantSelector from 'src/components/VariantSelector.vue'
import {
  getVariantBasePath,
  loadManifest,
  loadStory,
  loadVariantBundle,
  resolveStoryVariant,
} from 'src/logic/content'
import { createNotify } from 'src/logic/utils'
import { useSettingsStore, VARIANT_TEXT } from 'src/stores/settings'
import type { StoryListItem, StoryMeta, VariantBundle, VariantCharacter, VariantType } from 'src/types/content'

const route = useRoute()
const settings = useSettingsStore()

const loading = ref(true)
const story = ref<StoryMeta | null>(null)
const bundle = ref<VariantBundle | null>(null)
const allVariantBundles = ref<VariantBundle[]>([])
const manifestStories = ref<StoryListItem[]>([])
const imageDialogOpen = ref(false)
const characterDialogOpen = ref(false)
const activeCharacterIndex = ref(0)
const activeGallerySlide = ref('')
const galleryFullscreen = ref(false)
const galleryCarousel = ref<{ toggleFullscreen: () => void } | null>(null)
const activeImage = ref({
  src: '',
  alt: '',
})

const storyId = computed(() => String(route.params.id))
const currentIndex = computed(() => manifestStories.value.findIndex((item) => item.id === storyId.value))
const previousStory = computed(() => (currentIndex.value > 0 ? manifestStories.value[currentIndex.value - 1] : null))
const nextStory = computed(() =>
  currentIndex.value >= 0 && currentIndex.value < manifestStories.value.length - 1
    ? manifestStories.value[currentIndex.value + 1]
    : null,
)

const activeVariant = computed(() => bundle.value?.variant.variant ?? settings.variant)
const baseVariantPath = computed(() => `/content/stories/${storyId.value}/${activeVariant.value}`)
const mainImagePath = computed(() => `${baseVariantPath.value}/main.webp`)
const audioPath = computed(() => (bundle.value?.variant.hasAudio ? `${baseVariantPath.value}/audio.mp3` : ''))
const currentCharacter = computed<VariantCharacter | null>(
  () => bundle.value?.characters[activeCharacterIndex.value] ?? null,
)

interface GalleryItem {
  id: string
  src: string
  alt: string
  title: string
  variant: VariantType
  variantLabel: string
}

function getVariantCharacterPath(variant: VariantType, relativePath: string) {
  return `${getVariantBasePath(storyId.value, variant)}/${relativePath}`
}

function getVariantScenePath(variant: VariantType, relativePath: string) {
  return `${getVariantBasePath(storyId.value, variant)}/${relativePath}`
}

function buildGalleryItems(variantBundle: VariantBundle): GalleryItem[] {
  const variant = variantBundle.variant.variant
  const variantLabel = VARIANT_TEXT[variant]
  const basePath = getVariantBasePath(storyId.value, variant)
  const items: GalleryItem[] = [
    {
      id: `${variant}:main`,
      src: `${basePath}/main.webp`,
      alt: `${variantBundle.variant.displayTitle} cover`,
      title: variantBundle.variant.displayTitle,
      variant,
      variantLabel,
    },
  ]

  for (const section of variantBundle.sections) {
    items.push({
      id: `${variant}:section:${section.id}`,
      src: getVariantScenePath(variant, section.imagePath),
      alt: section.title,
      title: section.title,
      variant,
      variantLabel,
    })
  }

  for (const character of variantBundle.characters) {
    items.push({
      id: `${variant}:character:${character.slug}`,
      src: getVariantCharacterPath(variant, character.imagePath),
      alt: character.name,
      title: character.name,
      variant,
      variantLabel,
    })
  }

  return items
}

const galleryItems = computed(() =>
  allVariantBundles.value.flatMap((variantBundle) => buildGalleryItems(variantBundle)),
)

function getCharacterPath(relativePath: string) {
  return `${baseVariantPath.value}/${relativePath}`
}

function getInlineScenePath(relativePath: string) {
  return `${baseVariantPath.value}/${relativePath}`
}

function openImage(src: string, alt: string) {
  activeImage.value = { src, alt }
  imageDialogOpen.value = true
}

function openCharacter(characterSlug: string) {
  const nextIndex = bundle.value?.characters.findIndex((character) => character.slug === characterSlug) ?? -1
  if (nextIndex < 0) return
  activeCharacterIndex.value = nextIndex
  characterDialogOpen.value = true
}

function toggleGalleryFullscreen() {
  galleryCarousel.value?.toggleFullscreen()
}

function showPreviousCharacter() {
  if (!bundle.value?.characters.length) return
  activeCharacterIndex.value =
    (activeCharacterIndex.value - 1 + bundle.value.characters.length) % bundle.value.characters.length
}

function showNextCharacter() {
  if (!bundle.value?.characters.length) return
  activeCharacterIndex.value = (activeCharacterIndex.value + 1) % bundle.value.characters.length
}

async function loadPage() {
  loading.value = true
  try {
    const manifest = await loadManifest()
    manifestStories.value = [...manifest.stories].sort((left, right) => left.index - right.index)
    story.value = await loadStory(storyId.value)
    const resolvedVariant = resolveStoryVariant(
      story.value.availableVariants,
      settings.variant,
      manifest.defaultVariant,
    )
    if (resolvedVariant !== settings.variant) {
      settings.setVariant(resolvedVariant)
    }
    bundle.value = await loadVariantBundle(storyId.value, resolvedVariant)
    allVariantBundles.value = await Promise.all(
      story.value.availableVariants.map((variant) => loadVariantBundle(storyId.value, variant)),
    )
    settings.markAsRead(storyId.value, true)
  } catch (error: unknown) {
    createNotify((error as Error).message, 'Failed to load story')
  } finally {
    loading.value = false
  }
}

onMounted(loadPage)

watch([storyId, () => settings.variant], loadPage)

watch(galleryItems, (items) => {
  if (!items.length) {
    activeGallerySlide.value = ''
    return
  }
  if (!items.some((item) => item.id === activeGallerySlide.value)) {
    activeGallerySlide.value = items[0]!.id
  }
})
</script>

<style lang="scss" scoped>
.reader-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px 20px 56px;
}

.loading-panel {
  min-height: 300px;
  display: grid;
  place-items: center;
}

.reader-hero {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 20px;
  align-items: stretch;
  margin-bottom: 20px;
}

.hero-text,
.audio-panel,
.story-panel,
.character-panel,
.image-carousel-panel,
.reader-nav {
  background: rgba(255, 252, 244, 0.76);
  border-radius: 24px;
  box-shadow: 0 14px 30px rgba(73, 56, 27, 0.08);
}

.hero-text {
  padding: 24px;
}

.hero-text h1 {
  margin: 12px 0 10px;
  line-height: 1;
  font-size: clamp(2rem, 4vw, 3rem);
}

.hero-summary,
.hero-meta {
  color: rgba(47, 59, 51, 0.78);
}

.hero-controls {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.font-control {
  display: grid;
  gap: 6px;
}

.hero-image {
  border-radius: 24px;
  overflow: hidden;
}

.clickable-image {
  cursor: zoom-in;
}

.reader-content {
  display: grid;
  gap: 18px;
}

.reader-content > * {
  min-width: 0;
}

.audio-panel,
.story-panel,
.character-panel,
.image-carousel-panel {
  padding: 22px;
}

.panel-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 14px;
}

.story-text {
  white-space: pre-line;
  line-height: 1.75;
  color: #2b2f27;
}

.story-sections {
  display: grid;
  gap: 28px;
}

.story-section {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(220px, 28vw, 320px);
  gap: 20px;
  align-items: center;
}

.story-section:nth-child(even) {
  grid-template-columns: clamp(220px, 28vw, 320px) minmax(0, 1fr);
}

.story-section:nth-child(even) .story-section-copy {
  order: 2;
}

.story-section:nth-child(even) .section-image {
  order: 1;
}

.section-image {
  width: 100%;
  max-width: 320px;
  aspect-ratio: 4 / 3;
  min-height: 0;
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 12px 28px rgba(73, 56, 27, 0.08);
  justify-self: end;
}

.story-section:nth-child(even) .section-image {
  justify-self: start;
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.character-card {
  overflow: hidden;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.75);
}

.character-name {
  font-weight: 700;
  margin-bottom: 4px;
}

.character-description {
  color: rgba(47, 59, 51, 0.74);
}

.image-carousel {
  width: 100%;
  max-width: 100%;
  border-radius: 22px;
  background: rgba(241, 234, 220, 0.6);
}

.image-carousel :deep(.q-carousel__navigation--thumbnails) {
  gap: 8px;
  padding: 0 12px 12px;
}

.image-carousel :deep(.q-carousel__thumbnail) {
  border-radius: 12px;
}

.image-carousel :deep(.q-carousel__arrow .q-btn) {
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
}

.image-carousel-slide {
  padding: 0;
  background-size: contain !important;
  background-repeat: no-repeat;
  background-position: center;
}

.carousel-frame {
  position: relative;
  width: 100%;
  height: 100%;
}

.carousel-image-hitbox {
  position: absolute;
  inset: 0;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: zoom-in;
}

.carousel-variant-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  pointer-events: none;
  border-radius: 999px;
  padding: 6px 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.carousel-caption {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 96px;
  z-index: 2;
  pointer-events: none;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(24, 28, 27, 0.28);
  color: #fff;
  backdrop-filter: blur(4px);
}

.carousel-caption-title {
  font-size: 0.95rem;
  font-weight: 700;
}

.carousel-fullscreen-btn {
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
}

.reader-nav {
  display: flex;
  align-items: center;
  margin-top: 18px;
  padding: 14px 18px;
}

.reader-nav-top {
  margin-top: 0;
  margin-bottom: 18px;
}

.character-dialog {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  background: rgba(16, 18, 17, 0.94);
}

.character-dialog-content {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(280px, 0.7fr);
  gap: 24px;
  width: min(1180px, calc(100vw - 64px));
  max-height: calc(100vh - 64px);
  align-items: center;
}

.character-dialog-image {
  width: 100%;
  max-height: calc(100vh - 100px);
  object-fit: contain;
  border-radius: 24px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}

.character-dialog-copy {
  padding: 24px;
  border-radius: 24px;
  background: rgba(255, 252, 244, 0.94);
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.18);
}

.character-dialog-title {
  font-size: clamp(1.4rem, 3vw, 2.1rem);
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 12px;
}

.character-dialog-description {
  line-height: 1.7;
  color: rgba(47, 59, 51, 0.82);
}

.dialog-close,
.dialog-nav {
  position: absolute;
  z-index: 2;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}

.dialog-close {
  top: 20px;
  right: 20px;
}

.dialog-nav {
  top: 50%;
  transform: translateY(-50%);
}

.dialog-nav-left {
  left: 20px;
}

.dialog-nav-right {
  right: 20px;
}

@media (max-width: 860px) {
  .reader-hero {
    grid-template-columns: 1fr;
  }

  .story-section,
  .story-section:nth-child(even) {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .story-section:nth-child(even) .story-section-copy,
  .story-section:nth-child(even) .section-image {
    order: initial;
  }

  .section-image,
  .story-section:nth-child(even) .section-image {
    max-width: min(100%, 420px);
    justify-self: center;
  }

  .image-carousel {
    height: min(88vw, 520px) !important;
  }

  .carousel-caption {
    bottom: 82px;
  }

  .character-dialog {
    padding: 20px;
  }

  .character-dialog-content {
    grid-template-columns: 1fr;
    width: min(100%, calc(100vw - 40px));
    max-height: calc(100vh - 40px);
    overflow: auto;
  }

  .character-dialog-image {
    max-height: 50vh;
  }

  .character-dialog-copy {
    padding: 18px;
  }

  .dialog-nav-left {
    left: 10px;
  }

  .dialog-nav-right {
    right: 10px;
  }
}
</style>
