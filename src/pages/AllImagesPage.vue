<template>
  <q-page class="image-library-page">
    <section class="hero-panel">
      <div class="hero-copy">
        <div class="eyebrow">Project Image Library</div>
        <h1>Scroll through every published fairy-tale image in one place.</h1>
        <p class="hero-lead">
          Covers, character portraits, and inline scene art are grouped from every story variant in the
          current content manifest.
        </p>
      </div>

      <div class="hero-stats">
        <div class="hero-stat-card">
          <span class="hero-stat-label">Images</span>
          <strong>{{ filteredImages.length }}</strong>
          <span>Visible in the current view</span>
        </div>
        <div class="hero-stat-card">
          <span class="hero-stat-label">Variants</span>
          <strong>{{ activeVariantCount }}</strong>
          <span>Fairy-tale versions represented</span>
        </div>
      </div>
    </section>

    <section class="filters-panel">
      <q-input
        v-model="searchQuery"
        borderless
        clearable
        debounce="150"
        label="Search by story, variant, character, or scene"
        class="filter-search"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>

      <q-select
        v-model="selectedVariant"
        outlined
        clearable
        emit-value
        map-options
        label="Fairytale variant"
        :options="variantOptions"
        class="filter-select"
      />

      <q-select
        v-model="selectedKind"
        outlined
        clearable
        emit-value
        map-options
        label="Image type"
        :options="kindOptions"
        class="filter-select"
      />
    </section>

    <div v-if="loading" class="loading-panel">
      <q-spinner color="primary" size="40px" />
    </div>

    <template v-else>
      <div class="gallery-headline">
        <div>
          <div class="headline-title">Image gallery</div>
          <div class="headline-caption">
            {{ filteredImages.length }} images from {{ storyCount }} tales
          </div>
        </div>
      </div>

      <div v-if="!filteredImages.length" class="empty-panel">
        <div class="empty-title">No images match the current filters.</div>
        <div class="empty-caption">Try another search term, image type, or fairytale variant.</div>
      </div>

      <q-infinite-scroll
        v-else
        ref="infiniteScrollRef"
        :offset="300"
        :disable="visibleImages.length >= filteredImages.length"
        @load="onInfiniteLoad"
      >
        <div class="image-grid">
          <q-card
            v-for="image in visibleImages"
            :key="image.id"
            flat
            class="image-card"
            tabindex="0"
            role="button"
            @click="openImageDetails(image)"
            @keyup.enter="openImageDetails(image)"
            @keyup.space.prevent="openImageDetails(image)"
          >
            <q-img
              :src="image.src"
              :alt="`${image.storyTitle} - ${image.primaryLabel}`"
              :ratio="1"
              fit="cover"
              loading="lazy"
              class="image-frame"
            />

            <div class="card-copy">
              <div class="copy-overline">{{ image.storyTitle }}</div>
              <div class="meta-row-inline">
                <div class="inline-badges">
                  <span class="meta-chip" :class="getVariantChipClass(image.variant)">
                    {{ image.variantLabel }}
                  </span>
                  <span class="meta-chip kind-chip">{{ image.kindLabel }}</span>
                </div>
              </div>
              <div class="copy-title">{{ image.primaryLabel }}</div>
            </div>
          </q-card>
        </div>

        <template #loading>
          <div class="infinite-loading">
            <q-spinner color="primary" size="28px" />
          </div>
        </template>
      </q-infinite-scroll>
    </template>

    <q-dialog
      :model-value="selectedImage !== null"
      maximized
      transition-show="fade"
      transition-hide="fade"
      @update:model-value="handleDialogModelValue"
    >
      <q-card v-if="selectedImage" class="image-dialog-card">
        <q-btn
          round
          flat
          dense
          icon="close"
          class="dialog-close-button"
          aria-label="Close image details"
          @click="closeImageDetails"
        />

        <div class="dialog-grid">
          <div class="dialog-image-panel">
            <q-btn
              round
              flat
              dense
              icon="chevron_left"
              class="dialog-nav-button dialog-nav-button-left"
              aria-label="Previous image"
              :disable="!hasPreviousImage"
              @click="showPreviousImage"
            />
            <img
              :src="selectedImage.src"
              :alt="`${selectedImage.storyTitle} - ${selectedImage.primaryLabel}`"
              class="dialog-image"
            >
            <q-btn
              round
              flat
              dense
              icon="chevron_right"
              class="dialog-nav-button dialog-nav-button-right"
              aria-label="Next image"
              :disable="!hasNextImage"
              @click="showNextImage"
            />
          </div>

          <div class="dialog-copy-panel">
            <div class="dialog-copy-top">
              <div class="copy-overline">{{ selectedImage.storyTitle }}</div>
              <div class="dialog-badges">
                <span class="meta-chip" :class="getVariantChipClass(selectedImage.variant)">
                  {{ selectedImage.variantLabel }}
                </span>
                <span class="meta-chip kind-chip">{{ selectedImage.kindLabel }}</span>
              </div>
              <h2 class="dialog-title">{{ selectedImage.primaryLabel }}</h2>
              <p class="dialog-subtitle">{{ selectedImage.secondaryLabel }}</p>
              <p class="dialog-description">{{ selectedImage.shortDescription }}</p>
            </div>

            <div class="dialog-meta-list">
              <div class="meta-row">
                <span class="meta-label">Variant</span>
                <span class="meta-value">{{ selectedImage.variantLabel }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Type</span>
                <span class="meta-value">{{ selectedImage.kindLabel }}</span>
              </div>
              <div class="meta-row" v-if="selectedImage.generatedAtLabel">
                <span class="meta-label">Generated</span>
                <span class="meta-value">{{ selectedImage.generatedAtLabel }}</span>
              </div>
              <div class="meta-row" v-if="selectedImage.generationModel">
                <span class="meta-label">Model</span>
                <span class="meta-value">{{ selectedImage.generationModel }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Asset</span>
                <span class="meta-value meta-path">{{ selectedImage.assetPath }}</span>
              </div>
              <div class="meta-row" v-if="selectedImage.summary">
                <span class="meta-label">Summary</span>
                <span class="meta-value">{{ selectedImage.summary }}</span>
              </div>
              <div class="meta-row" v-if="selectedImage.detailText">
                <span class="meta-label">{{ selectedImage.detailLabel }}</span>
                <span class="meta-value">{{ selectedImage.detailText }}</span>
              </div>
              <div class="meta-row" v-if="selectedImage.prompt">
                <span class="meta-label">Prompt</span>
                <span class="meta-value">{{ selectedImage.prompt }}</span>
              </div>
            </div>
          </div>
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { createNotify } from 'src/logic/utils'
import { loadManifest } from 'src/logic/content'
import type {
  StoryListItem,
  StorySection,
  VariantCharacter,
  VariantMeta,
  VariantType,
} from 'src/types/content'

type ImageKind = 'cover' | 'character' | 'scene'

interface ImageLibraryItem {
  id: string
  src: string
  assetPath: string
  storyId: string
  storyIndex: number
  storyTitle: string
  variant: VariantType
  variantLabel: string
  kind: ImageKind
  kindLabel: string
  primaryLabel: string
  secondaryLabel: string
  shortDescription: string
  detailLabel: string
  detailText: string | undefined
  prompt: string | undefined
  summary: string | undefined
  generationModel: string | undefined
  generatedAt: string | undefined
  generatedAtLabel: string | undefined
}

interface InfiniteScrollHandle {
  reset: () => void
  poll: () => void
}

const initialBatchSize = 24
const batchSize = 18

const kindLabels: Record<ImageKind, string> = {
  cover: 'Cover',
  character: 'Character',
  scene: 'Scene',
}

const variantDisplayLabels: Record<VariantType, string> = {
  raw: 'Raw',
  cleaned: 'Cleaned',
  simplified: 'Simplified',
  english: 'English',
  'child-friendly': 'Child-friendly',
  modern: 'Modern',
}

const kindRank: Record<ImageKind, number> = {
  cover: 0,
  character: 1,
  scene: 2,
}

const variantRank: Record<VariantType, number> = {
  simplified: 0,
  english: 1,
  'child-friendly': 2,
  modern: 3,
  cleaned: 4,
  raw: 5,
}

const loading = ref(true)
const images = ref<ImageLibraryItem[]>([])
const storyCount = ref(0)
const supportedVariants = ref<VariantType[]>([])
const searchQuery = ref('')
const selectedVariant = ref<VariantType | null>(null)
const selectedKind = ref<ImageKind | null>(null)
const selectedImage = ref<ImageLibraryItem | null>(null)
const visibleCount = ref(initialBatchSize)
const infiniteScrollRef = ref<InfiniteScrollHandle | null>(null)

const kindOptions = [
  { label: 'Cover', value: 'cover' },
  { label: 'Character', value: 'character' },
  { label: 'Scene', value: 'scene' },
]

const variantOptions = computed(() =>
  supportedVariants.value.map((variant) => ({
    label: variantDisplayLabels[variant],
    value: variant,
  })),
)

const filteredImages = computed(() => {
  const needle = searchQuery.value.trim().toLowerCase()

  return images.value.filter((image) => {
    if (selectedVariant.value && image.variant !== selectedVariant.value) return false
    if (selectedKind.value && image.kind !== selectedKind.value) return false
    if (!needle) return true

    return [
      image.storyTitle,
      image.variantLabel,
      image.kindLabel,
      image.primaryLabel,
      image.secondaryLabel,
      image.shortDescription,
      image.detailText,
      image.prompt,
      image.assetPath,
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(needle))
  })
})

const activeVariantCount = computed(() => new Set(filteredImages.value.map((image) => image.variant)).size)
const visibleImages = computed(() => filteredImages.value.slice(0, visibleCount.value))
const selectedImageIndex = computed(() =>
  selectedImage.value ? filteredImages.value.findIndex((image) => image.id === selectedImage.value?.id) : -1,
)
const hasPreviousImage = computed(() => selectedImageIndex.value > 0)
const hasNextImage = computed(
  () => selectedImageIndex.value >= 0 && selectedImageIndex.value < filteredImages.value.length - 1,
)

function getVariantChipClass(variant: VariantType) {
  return `variant-chip-${variant}`
}

function openImageDetails(image: ImageLibraryItem) {
  selectedImage.value = image
}

function closeImageDetails() {
  selectedImage.value = null
}

function showPreviousImage() {
  if (!hasPreviousImage.value) return
  selectedImage.value = filteredImages.value[selectedImageIndex.value - 1] ?? null
}

function showNextImage() {
  if (!hasNextImage.value) return
  selectedImage.value = filteredImages.value[selectedImageIndex.value + 1] ?? null
}

function handleDialogModelValue(value: boolean) {
  if (!value) {
    closeImageDetails()
  }
}

function onInfiniteLoad(_index: number, done: (stop?: boolean) => void) {
  visibleCount.value = Math.min(visibleCount.value + batchSize, filteredImages.value.length)
  done(visibleCount.value >= filteredImages.value.length)
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1).trimEnd()}…`
}

function formatDate(value?: string) {
  if (!value) return undefined

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`)
  }
  return response.json() as Promise<T>
}

watch(
  filteredImages,
  async (nextImages) => {
    visibleCount.value = Math.min(initialBatchSize, nextImages.length)
    selectedImage.value = nextImages.find((image) => image.id === selectedImage.value?.id) ?? null

    await nextTick()
    infiniteScrollRef.value?.reset()
    infiniteScrollRef.value?.poll()
  },
  { flush: 'post' },
)

async function loadVariantImages(story: StoryListItem, variant: VariantType): Promise<ImageLibraryItem[]> {
  const basePath = `/content/stories/${story.id}/${variant}`
  const variantMeta = await fetchJson<VariantMeta>(`${basePath}/variant.json`)
  const generatedAtLabel = formatDate(variantMeta.generation.generatedAt)
  const summary = variantMeta.summary ?? story.summary

  const libraryItems: ImageLibraryItem[] = [
    {
      id: `${story.id}:${variant}:cover`,
      src: `${basePath}/${variantMeta.paths.mainImage}`,
      assetPath: `${basePath}/${variantMeta.paths.mainImage}`,
      storyId: story.id,
      storyIndex: story.index,
      storyTitle: story.canonicalTitle,
      variant,
      variantLabel: variantDisplayLabels[variant],
      kind: 'cover',
      kindLabel: kindLabels.cover,
      primaryLabel: variantMeta.displayTitle,
      secondaryLabel: 'Main cover image',
      shortDescription: truncateText(variantMeta.description, 120),
      detailLabel: 'Description',
      detailText: variantMeta.description,
      prompt: undefined,
      summary,
      generationModel: variantMeta.generation.model,
      generatedAt: variantMeta.generation.generatedAt,
      generatedAtLabel,
    },
  ]

  const [characters, sections] = await Promise.all([
    fetchJson<VariantCharacter[]>(`${basePath}/${variantMeta.paths.characters}`),
    variantMeta.paths.sections
      ? fetchJson<StorySection[]>(`${basePath}/${variantMeta.paths.sections}`)
      : Promise.resolve([]),
  ])

  for (const character of characters) {
    libraryItems.push({
      id: `${story.id}:${variant}:character:${character.slug}`,
      src: `${basePath}/${character.imagePath}`,
      assetPath: `${basePath}/${character.imagePath}`,
      storyId: story.id,
      storyIndex: story.index,
      storyTitle: story.canonicalTitle,
      variant,
      variantLabel: variantDisplayLabels[variant],
      kind: 'character',
      kindLabel: kindLabels.character,
      primaryLabel: character.name,
      secondaryLabel: 'Character portrait',
      shortDescription: truncateText(character.description, 120),
      detailLabel: 'Description',
      detailText: character.description,
      prompt: character.visualPrompt,
      summary,
      generationModel: variantMeta.generation.model,
      generatedAt: variantMeta.generation.generatedAt,
      generatedAtLabel,
    })
  }

  for (const section of sections) {
    libraryItems.push({
      id: `${story.id}:${variant}:scene:${section.id}`,
      src: `${basePath}/${section.imagePath}`,
      assetPath: `${basePath}/${section.imagePath}`,
      storyId: story.id,
      storyIndex: story.index,
      storyTitle: story.canonicalTitle,
      variant,
      variantLabel: variantDisplayLabels[variant],
      kind: 'scene',
      kindLabel: kindLabels.scene,
      primaryLabel: section.title,
      secondaryLabel: 'Story scene',
      shortDescription: truncateText(section.text, 120),
      detailLabel: 'Scene text',
      detailText: section.text,
      prompt: undefined,
      summary,
      generationModel: variantMeta.generation.model,
      generatedAt: variantMeta.generation.generatedAt,
      generatedAtLabel,
    })
  }

  return libraryItems
}

onMounted(async () => {
  try {
    const manifest = await loadManifest()
    storyCount.value = manifest.stories.length
    supportedVariants.value = manifest.supportedVariants

    const imageGroups = await Promise.all(
      manifest.stories.map(async (story) => {
        const variantImages = await Promise.all(
          story.availableVariants.map((variant) => loadVariantImages(story, variant)),
        )
        return variantImages.flat()
      }),
    )

    images.value = imageGroups
      .flat()
      .sort((left, right) => {
        const storyOrder = left.storyIndex - right.storyIndex
        if (storyOrder !== 0) return storyOrder

        const variantOrder = variantRank[left.variant] - variantRank[right.variant]
        if (variantOrder !== 0) return variantOrder

        const kindOrder = kindRank[left.kind] - kindRank[right.kind]
        if (kindOrder !== 0) return kindOrder

        return left.primaryLabel.localeCompare(right.primaryLabel)
      })
  } catch (error: unknown) {
    console.error(error)
    createNotify((error as Error).message, 'Failed to load image library')
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.image-library-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 28px 20px 52px;
}

.hero-panel {
  display: grid;
  gap: 18px;
  padding: 26px;
  border-radius: 32px;
  background:
    radial-gradient(circle at top left, rgba(255, 246, 214, 0.86), transparent 34%),
    linear-gradient(140deg, rgba(217, 188, 132, 0.92), rgba(249, 243, 231, 0.96));
  box-shadow: 0 22px 44px rgba(87, 67, 32, 0.1);
  margin-bottom: 22px;
}

.hero-copy h1 {
  margin: 0 0 14px;
  font-size: clamp(2rem, 4vw, 3.2rem);
  line-height: 0.96;
  max-width: 13ch;
}

.eyebrow {
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.76rem;
  color: rgba(90, 64, 24, 0.72);
}

.hero-lead {
  margin: 0;
  max-width: 62ch;
  line-height: 1.6;
  color: rgba(54, 45, 28, 0.82);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.hero-stat-card {
  display: grid;
  gap: 4px;
  padding: 15px 16px;
  border-radius: 22px;
  background: rgba(255, 251, 242, 0.74);
  box-shadow: inset 0 0 0 1px rgba(90, 64, 24, 0.08);
}

.hero-stat-card strong {
  font-size: 1.15rem;
  color: #2f3b33;
}

.hero-stat-label {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.7rem;
  color: rgba(90, 64, 24, 0.58);
}

.filters-panel {
  display: grid;
  grid-template-columns: minmax(0, 2fr) repeat(2, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
  padding: 14px;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 251, 242, 0.92), rgba(248, 241, 229, 0.9));
  box-shadow:
    inset 0 0 0 1px rgba(90, 64, 24, 0.08),
    0 12px 24px rgba(87, 67, 32, 0.06);
}

.filters-panel :deep(.q-field) {
  border-radius: 22px;
}

.filters-panel :deep(.q-field__control) {
  min-height: 64px;
  padding: 0 10px;
  border-radius: 22px;
  background: rgba(255, 252, 246, 0.94);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.6),
    0 10px 20px rgba(87, 67, 32, 0.05);
}

.filters-panel :deep(.q-field--outlined .q-field__control),
.filters-panel :deep(.q-field--outlined .q-field__control:before),
.filters-panel :deep(.q-field--outlined .q-field__control:after) {
  border-radius: 22px;
}

.filters-panel :deep(.q-field__prepend) {
  padding-left: 6px;
}

.filters-panel :deep(.q-field__append),
.filters-panel :deep(.q-field__marginal) {
  padding-right: 6px;
}

.filters-panel :deep(.q-field--outlined .q-field__control:before) {
  border: 1px solid rgba(143, 106, 48, 0.18);
}

.filters-panel :deep(.q-field--outlined .q-field__control:hover:before) {
  border-color: rgba(143, 106, 48, 0.3);
}

.filters-panel :deep(.q-field--focused .q-field__control) {
  background: rgba(255, 250, 241, 0.98);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    0 12px 24px rgba(143, 106, 48, 0.12);
}

.filters-panel :deep(.q-field--focused .q-field__control:after) {
  border-width: 2px;
  border-color: rgba(143, 106, 48, 0.72);
}

.filters-panel :deep(.q-field__label) {
  color: rgba(90, 64, 24, 0.64);
  letter-spacing: 0.06em;
  font-size: 0.8rem;
}

.filters-panel :deep(.q-field__native),
.filters-panel :deep(.q-field__input),
.filters-panel :deep(.q-field__marginal),
.filters-panel :deep(.q-field__prepend),
.filters-panel :deep(.q-field__append) {
  color: #2f3b33;
}

.filters-panel :deep(.q-field__native),
.filters-panel :deep(.q-field__input) {
  font-size: 0.96rem;
}

.filters-panel :deep(.q-field--labeled .q-field__native),
.filters-panel :deep(.q-field--labeled .q-field__prefix),
.filters-panel :deep(.q-field--labeled .q-field__suffix) {
  padding-top: 26px;
  padding-bottom: 10px;
}

.filters-panel :deep(.q-field__label) {
  top: 18px;
}

.filter-search {
  position: relative;
  border-radius: 22px;
  background:
    linear-gradient(135deg, rgba(255, 248, 234, 0.96), rgba(255, 252, 246, 0.96));
  box-shadow:
    inset 0 0 0 1px rgba(143, 106, 48, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.6),
    0 10px 20px rgba(87, 67, 32, 0.05);
  transition:
    box-shadow 180ms ease,
    background 180ms ease;
}

.filter-search :deep(.q-field__control) {
  background: transparent;
  box-shadow: none;
}

.filter-search :deep(.q-field__control:before),
.filter-search :deep(.q-field__control:after) {
  display: none;
}

.filter-search.q-field--focused {
  background:
    linear-gradient(135deg, rgba(255, 249, 238, 0.98), rgba(255, 252, 246, 0.98));
  box-shadow:
    inset 0 0 0 2px rgba(143, 106, 48, 0.72),
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    0 12px 24px rgba(143, 106, 48, 0.12);
}

.filter-search :deep(.q-icon) {
  color: rgba(143, 106, 48, 0.78);
}

.filter-select :deep(.q-field__control) {
  background:
    linear-gradient(135deg, rgba(251, 246, 236, 0.96), rgba(255, 252, 246, 0.96));
}

.filter-select :deep(.q-field__append .q-icon) {
  color: rgba(90, 64, 24, 0.58);
}

.gallery-headline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.headline-title {
  font-size: 1.7rem;
  font-weight: 700;
  line-height: 1.05;
}

.headline-caption {
  margin-top: 4px;
  color: rgba(47, 59, 51, 0.72);
}

.loading-panel,
.empty-panel {
  min-height: 240px;
  display: grid;
  place-items: center;
  text-align: center;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.66);
  box-shadow: inset 0 0 0 1px rgba(73, 56, 27, 0.08);
}

.empty-title {
  font-size: 1.1rem;
  font-weight: 600;
}

.empty-caption {
  margin-top: 6px;
  color: rgba(47, 59, 51, 0.72);
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.image-card {
  position: relative;
  overflow: hidden;
  border-radius: 26px;
  background: rgba(255, 252, 246, 0.86);
  box-shadow: 0 16px 28px rgba(77, 59, 27, 0.1);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

.image-card:hover,
.image-card:focus-within {
  transform: translateY(-4px);
  box-shadow: 0 20px 34px rgba(77, 59, 27, 0.15);
}

.image-frame {
  background: rgba(228, 214, 187, 0.4);
}

.meta-row-inline {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
}

.inline-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.1;
}

.variant-chip-simplified {
  background: rgba(207, 106, 39, 0.14);
  color: #a24612;
}

.variant-chip-english {
  background: rgba(23, 117, 170, 0.15);
  color: #0f618e;
}

.variant-chip-child-friendly {
  background: rgba(62, 145, 80, 0.16);
  color: #226d38;
}

.variant-chip-modern {
  background: rgba(102, 76, 171, 0.14);
  color: #5733a7;
}

.variant-chip-cleaned {
  background: rgba(164, 107, 25, 0.14);
  color: #8c5b14;
}

.variant-chip-raw {
  background: rgba(112, 123, 139, 0.16);
  color: #4d5664;
}

.kind-chip {
  background: rgba(47, 59, 51, 0.12);
  color: rgba(47, 59, 51, 0.84);
  box-shadow: inset 0 0 0 1px rgba(47, 59, 51, 0.12);
}

.card-copy {
  display: grid;
  gap: 6px;
  padding: 14px 16px 16px;
}

.copy-overline {
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(90, 64, 24, 0.62);
}

.copy-title {
  font-size: 1.02rem;
  font-weight: 700;
  line-height: 1.15;
  color: #2f3b33;
}

.image-dialog-card {
  width: 100vw;
  height: 100vh;
  border-radius: 0;
  background:
    radial-gradient(circle at top left, rgba(246, 229, 192, 0.5), transparent 24%),
    linear-gradient(180deg, #f7f1e4 0%, #efe7d7 100%);
  overflow: auto;
}

.dialog-close-button {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 3;
  color: #2f3b33;
  background: rgba(255, 251, 242, 0.88);
  box-shadow: 0 10px 24px rgba(77, 59, 27, 0.14);
}

.dialog-grid {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(360px, 0.9fr);
  align-items: start;
}

.dialog-image-panel {
  position: sticky;
  top: 0;
  align-self: start;
  display: grid;
  place-items: center;
  min-height: 100vh;
  height: 100vh;
  padding: 36px;
  background: rgba(23, 27, 24, 0.9);
  overflow: hidden;
}

.dialog-image {
  max-width: 100%;
  max-height: calc(100vh - 96px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 24px;
  box-shadow: 0 26px 60px rgba(0, 0, 0, 0.35);
}

.dialog-nav-button {
  position: absolute;
  top: 50%;
  z-index: 2;
  transform: translateY(-50%);
  color: rgba(255, 248, 234, 0.92);
  background: rgba(18, 22, 20, 0.42);
  backdrop-filter: blur(8px);
  box-shadow: 0 14px 26px rgba(0, 0, 0, 0.18);
}

.dialog-nav-button-left {
  left: 18px;
}

.dialog-nav-button-right {
  right: 18px;
}

.dialog-nav-button.q-btn--disabled {
  opacity: 0.28 !important;
}

.dialog-copy-panel {
  display: grid;
  align-content: start;
  gap: 22px;
  padding: 40px 34px 34px;
}

.dialog-copy-top {
  display: grid;
  gap: 12px;
}

.dialog-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dialog-title {
  margin: 0;
  font-size: clamp(1.8rem, 2.6vw, 2.5rem);
  line-height: 0.98;
  color: #2f3b33;
}

.dialog-subtitle {
  margin: 0;
  font-size: 1rem;
  color: rgba(90, 64, 24, 0.76);
}

.dialog-description {
  margin: 0;
  font-size: 0.98rem;
  line-height: 1.65;
  color: rgba(47, 59, 51, 0.8);
}

.dialog-meta-list {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 24px;
  background: rgba(255, 251, 242, 0.78);
  box-shadow: inset 0 0 0 1px rgba(73, 56, 27, 0.08);
}

.meta-row {
  display: grid;
  gap: 4px;
}

.meta-label {
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(90, 64, 24, 0.56);
}

.meta-value {
  font-size: 0.88rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.meta-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace;
  font-size: 0.8rem;
}

@media (max-width: 920px) {
  .filters-panel {
    grid-template-columns: 1fr;
  }

  .dialog-grid {
    grid-template-columns: 1fr;
  }

  .dialog-image-panel {
    position: relative;
    top: auto;
    align-self: stretch;
    height: auto;
    min-height: 50vh;
    padding: 56px 20px 20px;
    overflow: visible;
  }

  .dialog-nav-button-left {
    left: 10px;
  }

  .dialog-nav-button-right {
    right: 10px;
  }

  .dialog-image {
    max-height: 50vh;
  }

  .dialog-copy-panel {
    padding: 22px 18px 24px;
  }
}

@media (max-width: 640px) {
  .image-library-page {
    padding: 20px 14px 40px;
  }

  .hero-panel {
    padding: 20px;
    border-radius: 28px;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }

  .image-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
}
</style>
