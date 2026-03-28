<template>
  <q-page class="library-page">
    <section class="hero-panel">
      <div class="hero-copy">
        <div class="eyebrow">Canonical Edition</div>
        <h1>Norske Folkeeventyr rebuilt for reading, listening, and browsing.</h1>
        <p>
          Choose a variant once, browse the library, and open a focused reader with the text, audio,
          cover art, and character gallery for that exact version of the story.
        </p>
      </div>
      <div class="hero-controls">
        <variant-selector />
        <div class="filters">
          <q-input
            v-model="settings.search"
            standout="bg-white text-primary"
            rounded
            dense
            clearable
            placeholder="Search stories"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
          <q-toggle v-model="settings.unreadOnly" label="Unread only" color="primary" />
        </div>
      </div>
    </section>

    <div class="library-headline">
      <div>
        <div class="headline-title">Library</div>
        <div class="headline-caption">{{ filteredStories.length }} stories in this view</div>
      </div>
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
      >
        <q-img :src="getCover(story.id)" :ratio="1" fit="cover" class="story-image" />
        <q-card-section class="story-body">
          <div class="story-topline">
            <q-badge color="secondary" text-color="dark">#{{ story.index }}</q-badge>
            <q-badge v-if="settings.isRead(story.id)" color="positive">Read</q-badge>
          </div>
          <div class="story-title">{{ story.canonicalTitle }}</div>
          <div class="story-summary">{{ story.summary }}</div>
          <div class="story-foot">
            <q-btn
              color="primary"
              unelevated
              no-caps
              :to="`/story/${story.id}`"
              label="Open story"
            />
            <div class="story-variant">{{ variantLabel }}</div>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import VariantSelector from 'src/components/VariantSelector.vue'
import { loadManifest } from 'src/logic/content'
import { createNotify } from 'src/logic/utils'
import { useSettingsStore, VARIANT_TEXT } from 'src/stores/settings'
import type { StoryListItem } from 'src/types/content'

const settings = useSettingsStore()
const loading = ref(true)
const stories = ref<StoryListItem[]>([])

const filteredStories = computed(() => {
  const query = settings.search.trim().toLowerCase()
  return stories.value.filter((story) => {
    if (settings.unreadOnly && settings.isRead(story.id)) return false
    if (!query) return true
    return [story.canonicalTitle, story.originalTitle, story.summary]
      .join(' ')
      .toLowerCase()
      .includes(query)
  })
})

const variantLabel = computed(() => VARIANT_TEXT[settings.variant])

function getCover(storyId: string) {
  return `/content/stories/${storyId}/${settings.variant}/main.webp`
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
  grid-template-columns: 1.25fr 1fr;
  gap: 18px;
  padding: 24px;
  background: linear-gradient(135deg, rgba(232, 215, 183, 0.84), rgba(249, 243, 231, 0.94));
  border-radius: 28px;
  box-shadow: 0 18px 40px rgba(87, 67, 32, 0.08);
  margin-bottom: 28px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.78rem;
  color: #7a5d30;
  margin-bottom: 10px;
}

.hero-copy h1 {
  font-size: clamp(2rem, 4vw, 3.2rem);
  line-height: 1;
  margin: 0 0 14px;
}

.hero-copy p {
  margin: 0;
  font-size: 1rem;
  color: rgba(54, 45, 28, 0.78);
  max-width: 58ch;
}

.hero-controls {
  display: grid;
  align-content: start;
  gap: 14px;
}

.filters {
  display: grid;
  gap: 12px;
  background: rgba(255, 255, 255, 0.62);
  padding: 16px;
  border-radius: 20px;
}

.library-headline {
  display: flex;
  justify-content: space-between;
  align-items: end;
  margin-bottom: 16px;
}

.headline-title {
  font-size: 1.5rem;
  font-weight: 700;
}

.headline-caption {
  color: rgba(47, 59, 51, 0.72);
}

.loading-panel {
  min-height: 220px;
  display: grid;
  place-items: center;
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
}

.story-card {
  border-radius: 24px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 14px 24px rgba(77, 59, 27, 0.08);
}

.story-card.read {
  opacity: 0.82;
}

.story-body {
  display: grid;
  gap: 12px;
}

.story-topline,
.story-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.story-title {
  font-size: 1.18rem;
  font-weight: 700;
  line-height: 1.2;
}

.story-summary {
  color: rgba(47, 59, 51, 0.78);
  min-height: 3.3em;
}

.story-variant {
  font-size: 0.9rem;
  color: rgba(47, 59, 51, 0.68);
}

@media (max-width: 840px) {
  .hero-panel {
    grid-template-columns: 1fr;
  }
}
</style>
