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
            <variant-selector compact />
            <div class="font-control">
              <span>Text size</span>
              <q-slider v-model="settings.fontSize" :min="16" :max="28" :step="1" color="primary" />
            </div>
          </div>
        </div>
        <q-img :src="mainImagePath" class="hero-image" fit="cover" />
      </section>

      <section class="reader-content">
        <div class="audio-panel" v-if="audioPath">
          <div class="panel-title">Listen</div>
          <audio controls :src="audioPath" class="full-width" />
        </div>

        <div class="story-panel">
          <div class="panel-title">Read</div>
          <div class="story-sections">
            <article v-for="section in bundle.sections" :key="section.id" class="story-section">
              <div class="story-section-copy">
                <div class="story-section-title">{{ section.title }}</div>
                <div class="story-text" :style="{ fontSize: `${settings.fontSize}px` }">
                  {{ section.text }}
                </div>
              </div>
              <q-img :src="getInlineScenePath(section.imagePath)" fit="cover" class="section-image" />
            </article>
          </div>
        </div>

        <div class="character-panel">
          <div class="panel-title">Characters in this variant</div>
          <div class="character-grid">
            <q-card v-for="character in bundle.characters" :key="character.slug" flat class="character-card">
              <q-img :src="getCharacterPath(character.imagePath)" :ratio="1" fit="cover" />
              <q-card-section>
                <div class="character-name">{{ character.name }}</div>
                <div class="character-description">{{ character.description }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </section>

      <section class="reader-nav">
        <q-btn v-if="previousStory" flat no-caps :to="`/story/${previousStory.id}`" label="Previous story" />
        <q-space />
        <q-btn v-if="nextStory" flat no-caps :to="`/story/${nextStory.id}`" label="Next story" />
      </section>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import VariantSelector from 'src/components/VariantSelector.vue'
import { loadManifest, loadStory, loadVariantBundle } from 'src/logic/content'
import { createNotify } from 'src/logic/utils'
import { useSettingsStore } from 'src/stores/settings'
import type { StoryListItem, StoryMeta, VariantBundle } from 'src/types/content'

const route = useRoute()
const settings = useSettingsStore()

const loading = ref(true)
const story = ref<StoryMeta | null>(null)
const bundle = ref<VariantBundle | null>(null)
const manifestStories = ref<StoryListItem[]>([])

const storyId = computed(() => String(route.params.id))
const currentIndex = computed(() => manifestStories.value.findIndex((item) => item.id === storyId.value))
const previousStory = computed(() => (currentIndex.value > 0 ? manifestStories.value[currentIndex.value - 1] : null))
const nextStory = computed(() =>
  currentIndex.value >= 0 && currentIndex.value < manifestStories.value.length - 1
    ? manifestStories.value[currentIndex.value + 1]
    : null,
)

const baseVariantPath = computed(() => `/content/stories/${storyId.value}/${settings.variant}`)
const mainImagePath = computed(() => `${baseVariantPath.value}/main.webp`)
const audioPath = computed(() => (bundle.value?.variant.hasAudio ? `${baseVariantPath.value}/audio.mp3` : ''))

function getCharacterPath(relativePath: string) {
  return `${baseVariantPath.value}/${relativePath}`
}

function getInlineScenePath(relativePath: string) {
  return `${baseVariantPath.value}/${relativePath}`
}

async function loadPage() {
  loading.value = true
  try {
    const manifest = await loadManifest()
    manifestStories.value = [...manifest.stories].sort((left, right) => left.index - right.index)
    story.value = await loadStory(storyId.value)
    bundle.value = await loadVariantBundle(storyId.value, settings.variant)
    settings.markAsRead(storyId.value, true)
  } catch (error: unknown) {
    createNotify((error as Error).message, 'Failed to load story')
  } finally {
    loading.value = false
  }
}

onMounted(loadPage)

watch([storyId, () => settings.variant], loadPage)
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
  min-height: 380px;
  border-radius: 24px;
  overflow: hidden;
}

.reader-content {
  display: grid;
  gap: 18px;
}

.audio-panel,
.story-panel,
.character-panel {
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
  grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.75fr);
  gap: 18px;
  align-items: start;
}

.story-section:nth-child(even) {
  grid-template-columns: minmax(260px, 0.75fr) minmax(0, 1.25fr);
}

.story-section:nth-child(even) .story-section-copy {
  order: 2;
}

.story-section:nth-child(even) .section-image {
  order: 1;
}

.story-section-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 10px;
  color: rgba(47, 59, 51, 0.76);
}

.section-image {
  min-height: 220px;
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 12px 28px rgba(73, 56, 27, 0.08);
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

.reader-nav {
  display: flex;
  align-items: center;
  margin-top: 18px;
  padding: 14px 18px;
}

@media (max-width: 860px) {
  .reader-hero {
    grid-template-columns: 1fr;
  }

  .story-section,
  .story-section:nth-child(even) {
    grid-template-columns: 1fr;
  }

  .story-section:nth-child(even) .story-section-copy,
  .story-section:nth-child(even) .section-image {
    order: initial;
  }
}
</style>
