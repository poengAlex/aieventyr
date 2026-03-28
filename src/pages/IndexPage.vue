<template>
  <q-page class="library-page">
    <section class="hero-panel">
      <div class="hero-intro">
        <div class="hero-copy">
          <div class="eyebrow">A New Reading Edition</div>
          <h1>Norske folkeeventyr, rebuilt for reading, listening, and browsing.</h1>
          <p class="hero-lead">
            This library turns scanned Norwegian folktales into a clean AI reading edition with modern
            variants, artwork, characters, and audio.
          </p>
          <div class="hero-meta-row">
            <div class="hero-meta-card">
              <span class="hero-meta-label">Collection</span>
              <strong>{{ stories.length }}</strong>
              <span>Tales in the library</span>
            </div>
            <div class="hero-meta-card">
              <span class="hero-meta-label">Format</span>
              <strong>Text + Audio</strong>
              <span>Each story has its own reading version</span>
            </div>
          </div>
        </div>
      </div>

      <div class="hero-selector-panel">
        <div class="hero-controls-title">Choose a reading version</div>
        <variant-selector />
        <p class="hero-controls-note">
          Pick one version once, then browse the whole collection in that reading style.
        </p>
      </div>
    </section>

    <div class="library-headline">
      <div>
        <div class="headline-title">Browse the tales</div>
        <div class="headline-caption">{{ filteredStories.length }} stories in this view</div>
      </div>
      <q-toggle v-model="settings.showRead" label="Include read stories" color="primary" class="read-toggle" />
    </div>

    <div v-if="loading" class="loading-panel">
      <q-spinner color="primary" size="40px" />
    </div>

    <div v-else class="story-grid">
      <q-card
        v-for="story in filteredStories"
        :key="story.id"
        class="story-card"
        :class="{ read: settings.isRead(story.id) }"
        flat
        tabindex="0"
        role="link"
        @click="openStory(story.id)"
        @keyup.enter="openStory(story.id)"
      >
        <div v-if="settings.isRead(story.id)" class="read-badge">Read</div>
        <q-img :src="getCover(story)" :ratio="1" fit="cover" class="story-image">
          <div class="story-overlay">
            <div class="story-title">{{ story.canonicalTitle }}</div>
          </div>
        </q-img>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import VariantSelector from 'src/components/VariantSelector.vue'
import { loadManifest, resolveStoryVariant } from 'src/logic/content'
import { createNotify } from 'src/logic/utils'
import { useSettingsStore } from 'src/stores/settings'
import type { StoryListItem, VariantType } from 'src/types/content'

const settings = useSettingsStore()
const router = useRouter()
const loading = ref(true)
const stories = ref<StoryListItem[]>([])

const filteredStories = computed(() => {
  return stories.value.filter((story) => {
    if (!settings.showRead && settings.isRead(story.id)) return false
    return true
  })
})

function getResolvedVariant(story: StoryListItem): VariantType {
  return resolveStoryVariant(story.availableVariants, settings.variant)
}

function getCover(story: StoryListItem) {
  return `/content/stories/${story.id}/${getResolvedVariant(story)}/main.webp`
}

function openStory(storyId: string) {
  void router.push(`/story/${storyId}`)
}

onMounted(async () => {
  try {
    const manifest = await loadManifest()
    stories.value = [...manifest.stories].sort((left, right) => left.index - right.index)
  } catch (error: unknown) {
    createNotify((error as Error).message, 'Failed to load library')
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.library-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px 20px 48px;
}

.hero-panel {
  display: grid;
  gap: 18px;
  padding: 26px;
  background:
    radial-gradient(circle at top right, rgba(255, 248, 232, 0.7), transparent 30%),
    linear-gradient(135deg, rgba(226, 204, 162, 0.88), rgba(248, 242, 229, 0.94));
  border-radius: 32px;
  box-shadow: 0 22px 44px rgba(87, 67, 32, 0.1);
  margin-bottom: 28px;
}

.hero-intro {
  display: grid;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.78rem;
  color: rgba(90, 64, 24, 0.72);
  margin-bottom: 12px;
}

.hero-copy h1 {
  font-size: clamp(2.1rem, 4vw, 3.5rem);
  line-height: 0.96;
  margin: 0 0 16px;
  max-width: 15ch;
}

.hero-lead {
  margin: 0;
  font-size: 1.02rem;
  line-height: 1.6;
  color: rgba(54, 45, 28, 0.8);
  max-width: 64ch;
}

.hero-meta-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.hero-meta-card {
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255, 250, 241, 0.64);
  box-shadow: inset 0 0 0 1px rgba(90, 64, 24, 0.08);
  color: rgba(54, 45, 28, 0.78);
}

.hero-meta-card strong {
  font-size: 1.1rem;
  color: #2f3b33;
}

.hero-meta-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(90, 64, 24, 0.56);
}

.hero-selector-panel {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 24px;
  background: rgba(255, 252, 246, 0.74);
  box-shadow: inset 0 0 0 1px rgba(73, 56, 27, 0.08);
}

.hero-controls-title {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(73, 56, 27, 0.62);
}

.hero-controls-note {
  margin: 0;
  font-size: 0.94rem;
  line-height: 1.5;
  color: rgba(47, 59, 51, 0.72);
}

.library-headline {
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
  color: rgba(47, 59, 51, 0.72);
  margin-top: 4px;
}

.read-toggle {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
}

.loading-panel {
  min-height: 220px;
  display: grid;
  place-items: center;
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px;
  align-items: stretch;
}

.story-card {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 14px 24px rgba(77, 59, 27, 0.08);
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}

.story-card:hover,
.story-card:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 18px 32px rgba(77, 59, 27, 0.12);
  outline: none;
}

.story-card.read {
  background: rgba(241, 241, 237, 0.82);
}

.story-card.read .story-image {
  filter: saturate(0.82) brightness(0.95);
}

.read-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(42, 52, 45, 0.82);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.story-image {
  min-height: 168px;
}

.story-overlay {
  position: absolute;
  inset: auto 0 0 0;
  padding: 12px;
  background: linear-gradient(180deg, rgba(20, 20, 18, 0) 0%, rgba(20, 20, 18, 0.82) 100%);
}

.story-title {
  display: inline-flex;
  max-width: 100%;
  padding: 8px 10px;
  border-radius: 14px;
  background: rgba(255, 248, 239, 0.38);
  backdrop-filter: blur(4px);
  color: #2c2113;
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.25;
  box-shadow: 0 8px 18px rgba(18, 14, 8, 0.14);
}

@media (min-width: 1240px) {
  .story-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 840px) {
  .hero-copy h1 {
    max-width: none;
  }

  .hero-meta-row {
    grid-template-columns: 1fr;
  }

  .library-headline {
    align-items: start;
    flex-direction: column;
  }
}
</style>
