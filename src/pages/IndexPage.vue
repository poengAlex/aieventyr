<template>
  <q-page class="library">
    <header class="site-bar">
      <router-link to="/" class="wordmark">Eventyr</router-link>
      <nav class="bar-actions">
        <button
          type="button"
          class="icon-button"
          :aria-label="settings.night ? t.day : t.night"
          @click="settings.toggleNight()"
        >
          <q-icon :name="settings.night ? 'light_mode' : 'dark_mode'" />
        </button>
        <router-link to="/about" class="text-button">{{ t.about }}</router-link>
      </nav>
    </header>

    <section class="intro">
      <h1>{{ t.heading }}</h1>
      <p v-if="stories.length">{{ t.subheading(stories.length) }}</p>
      <edition-switch v-model="settings.variant" />
    </section>

    <router-link
      v-if="continueItem"
      :to="`/story/${continueItem.id}?resume=1`"
      class="continue-card"
    >
      <img :src="continueItem.cover.src" :srcset="continueItem.cover.srcset" sizes="96px" alt="" />
      <div class="continue-copy">
        <div class="eyebrow">{{ t.continueReading }}</div>
        <div class="continue-title">{{ continueItem.title }}</div>
        <div class="continue-progress">
          <span :style="{ width: `${continueItem.progress}%` }" />
        </div>
      </div>
      <q-icon name="arrow_forward" class="continue-arrow" />
    </router-link>

    <div v-if="loading" class="shelf">
      <div v-for="n in 8" :key="n" class="placeholder" />
    </div>
    <section v-else class="shelf">
      <story-card
        v-for="item in items"
        :key="item.id"
        :story-id="item.id"
        :title="item.title"
        :cover="item.cover"
        :meta="item.meta"
        :read="item.read"
        :read-label="t.read"
      />
    </section>

    <footer class="site-footer">
      <router-link to="/about">{{ t.about }}</router-link>
    </footer>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import EditionSwitch from 'src/components/EditionSwitch.vue'
import StoryCard from 'src/components/StoryCard.vue'
import { loadArtCover } from 'src/logic/art'
import { loadManifest, resolveStoryVariant } from 'src/logic/content'
import { readingMinutes, useText } from 'src/logic/i18n'
import { createNotify } from 'src/logic/utils'
import { useSettingsStore } from 'src/stores/settings'
import type { StoryListItem, VariantType } from 'src/types/content'

const settings = useSettingsStore()
const { t, editionName } = useText()
const loading = ref(true)
const stories = ref<StoryListItem[]>([])
const artCovers = ref<Record<string, { src: string; srcset: string }>>({})

const variantFor = (story: StoryListItem): VariantType =>
  resolveStoryVariant(story.availableVariants, settings.variant)

function coverFor(story: StoryListItem, variant: VariantType) {
  return (
    artCovers.value[`${story.id}:${variant}`] ?? {
      src: `/content/stories/${story.id}/${variant}/main.webp`,
      srcset: '',
    }
  )
}

const items = computed(() =>
  stories.value.map((story) => {
    const variant = variantFor(story)
    const minutes = readingMinutes(story.words?.[variant], variant)
    return {
      id: story.id,
      title: story.titles?.[variant] ?? story.canonicalTitle,
      cover: coverFor(story, variant),
      meta: minutes ? t.value.minutes(minutes) : '',
      read: settings.isRead(story.id, variant),
    }
  }),
)

// The story the reader stopped in the middle of, if any.
const continueItem = computed(() => {
  const last = settings.lastRead
  if (!last || last.progress < 0.03 || last.progress > 0.97) return null
  const story = stories.value.find((item) => item.id === last.storyId)
  if (!story || !story.availableVariants.includes(last.variant)) return null
  return {
    id: story.id,
    title: story.titles?.[last.variant] ?? story.canonicalTitle,
    cover: coverFor(story, last.variant),
    progress: Math.round(last.progress * 100),
    edition: editionName(last.variant),
  }
})

// New covers from the illustration sets replace the older ones where they exist.
async function loadArtCovers() {
  const covers: Record<string, { src: string; srcset: string }> = {}
  const wanted = stories.value.map((story) => [story.id, variantFor(story)] as const)
  if (settings.lastRead) wanted.push([settings.lastRead.storyId, settings.lastRead.variant])
  await Promise.all(
    wanted.map(async ([id, variant]) => {
      const cover = await loadArtCover(id, variant)
      if (cover) covers[`${id}:${variant}`] = cover
    }),
  )
  artCovers.value = covers
}

watch(() => settings.variant, loadArtCovers)

onMounted(async () => {
  try {
    const manifest = await loadManifest()
    stories.value = [...manifest.stories].sort((left, right) => left.index - right.index)
    await loadArtCovers()
  } catch (error: unknown) {
    createNotify((error as Error).message)
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.library {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 max(20px, env(safe-area-inset-left)) 48px;
}

.site-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 0;
}

.wordmark {
  font-family: var(--serif);
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.bar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.intro {
  display: grid;
  justify-items: start;
  gap: 10px;
  padding: clamp(24px, 6vw, 64px) 0 clamp(20px, 4vw, 36px);
}

.intro h1 {
  margin: 0;
  font-size: clamp(2.2rem, 6vw, 3.8rem);
  line-height: 1.02;
  font-weight: 600;
}

.intro p {
  margin: 0 0 12px;
  max-width: 34em;
  font-family: var(--serif);
  font-size: clamp(1.02rem, 2.2vw, 1.2rem);
  color: var(--ink-soft);
}

.continue-card {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  max-width: 560px;
  margin-bottom: 36px;
  padding: 12px 18px 12px 12px;
  border-radius: 20px;
  background: var(--card);
  box-shadow: var(--shadow-soft);
  transition: box-shadow 0.2s;
}

.continue-card:hover {
  box-shadow: var(--shadow);
}

.continue-card img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 12px;
}

.continue-title {
  font-family: var(--serif);
  font-size: 1.08rem;
  font-weight: 600;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.continue-progress {
  height: 4px;
  margin-top: 8px;
  border-radius: 2px;
  background: var(--line);
  overflow: hidden;
}

.continue-progress span {
  display: block;
  height: 100%;
  background: var(--accent);
}

.continue-arrow {
  font-size: 22px;
  color: var(--ink-muted);
}

.shelf {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(230px, 42vw), 1fr));
  gap: clamp(18px, 3vw, 34px) clamp(14px, 2.4vw, 28px);
}

.placeholder {
  aspect-ratio: 1;
  border-radius: var(--radius);
  background: var(--paper-deep);
  animation: pulse 1.4s ease-in-out infinite;
}

.site-footer {
  margin-top: 72px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
  font-size: 0.9rem;
  color: var(--ink-muted);
}

@keyframes pulse {
  50% {
    opacity: 0.55;
  }
}
</style>
