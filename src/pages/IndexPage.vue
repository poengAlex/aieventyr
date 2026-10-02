<template>
  <q-page class="library" :class="editionClass">
    <div class="spread">
      <aside v-if="wide" class="left-page">
        <cover-plate
          v-if="featured"
          :to="featured.to"
          :src="featured.src"
          :srcset="featured.srcset"
          sizes="(max-width: 1400px) 36vw, 460px"
          :numeral="featured.numeral"
          :title="featured.title"
          :note="featured.note"
        />
      </aside>

      <div class="right-page">
        <header class="running-head">
          <span class="caps">Eventyr</span>
          <span class="running-actions">
            <router-link to="/about" class="caps-link">{{ t.about }}</router-link>
            <button
              type="button"
              class="caps-link"
              :aria-label="settings.night ? t.dayMode : t.nightMode"
              @click="settings.toggleNight()"
            >
              {{ settings.night ? t.day : t.night }}
            </button>
          </span>
        </header>

        <div class="title-page">
          <div class="ornament" aria-hidden="true"><i /></div>
          <h1>
            {{ t.heading[0] }}<br />
            {{ t.heading[1] }}
          </h1>
          <p class="byline">{{ t.byline }}</p>
          <edition-switch v-model="settings.variant" />
        </div>

        <cover-plate
          v-if="!wide && featured"
          class="inline-frontispiece"
          :to="featured.to"
          :src="featured.src"
          :srcset="featured.srcset"
          sizes="70vw"
          :numeral="featured.numeral"
          :title="featured.title"
          :note="featured.note"
        />

        <section class="contents">
          <h2 class="contents-head caps">
            <span>{{ t.contents }}</span>
            <span>{{ t.minShort }}</span>
          </h2>
          <ol v-if="!loading">
            <li v-for="item in items" :key="item.id">
              <contents-entry
                :to="`/story/${item.id}`"
                :numeral="roman(item.index)"
                :title="item.title"
                :minutes="item.minutes"
                :read="item.read"
                :read-label="t.read"
                :active="wide && item.id === featured?.id"
                @mouseenter="hovered = item.id"
                @focus="hovered = item.id"
              />
            </li>
          </ol>
        </section>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import ContentsEntry from 'src/components/ContentsEntry.vue'
import EditionSwitch from 'src/components/EditionSwitch.vue'
import CoverPlate from 'src/components/CoverPlate.vue'
import { artSetFor, loadArtCover } from 'src/logic/art'
import { loadManifest, resolveStoryVariant } from 'src/logic/content'
import { readingMinutes, roman, useText } from 'src/logic/i18n'
import { createNotify } from 'src/logic/utils'
import { useSettingsStore } from 'src/stores/settings'
import type { StoryListItem, VariantType } from 'src/types/content'

const $q = useQuasar()
const settings = useSettingsStore()
const { t } = useText()
const loading = ref(true)
const stories = ref<StoryListItem[]>([])
const artCovers = ref<Record<string, { src: string; srcset: string }>>({})
const hovered = ref<string | null>(null)

// Wide screens show the library as an open book, with the cover of the tale under the
// pointer on the left page.
const wide = computed(() => $q.screen.gt.sm)
const editionClass = computed(() => `edition-${artSetFor(settings.variant) ?? 'classic'}`)

const variantFor = (story: StoryListItem): VariantType =>
  resolveStoryVariant(story.availableVariants, settings.variant)

// Null until loadArtCovers has found the tale's cover, so the plate never fetches the
// older picture only to swap it for the new one.
function coverFor(story: StoryListItem, variant: VariantType) {
  return artCovers.value[`${story.id}:${variant}`] ?? null
}

const items = computed(() =>
  stories.value.map((story) => {
    const variant = variantFor(story)
    return {
      id: story.id,
      index: story.index,
      title: story.titles?.[variant] ?? story.canonicalTitle,
      cover: coverFor(story, variant),
      minutes: readingMinutes(story.words?.[variant], variant),
      read: settings.isRead(story.id, variant),
    }
  }),
)

// The tale the reader stopped in the middle of, if any.
const unfinished = computed(() => {
  const last = settings.lastRead
  if (!last || last.progress < 0.03 || last.progress > 0.97) return null
  return items.value.some((item) => item.id === last.storyId) ? last.storyId : null
})

// The plate shows the tale under the pointer, else the unfinished one, else the first.
const featured = computed(() => {
  const id = hovered.value ?? unfinished.value ?? items.value[0]?.id
  const item = items.value.find((entry) => entry.id === id)
  if (!item?.cover) return null
  const resume = item.id === unfinished.value
  return {
    to: resume ? `/story/${item.id}?resume=1` : `/story/${item.id}`,
    id: item.id,
    src: item.cover.src,
    srcset: item.cover.srcset,
    numeral: roman(item.index),
    title: item.title,
    note: resume ? t.value.continueHere : undefined,
  }
})

// New covers from the illustration sets, or the older picture where a tale has none.
async function loadArtCovers() {
  const covers: Record<string, { src: string; srcset: string }> = {}
  await Promise.all(
    stories.value.map(async (story) => {
      const variant = variantFor(story)
      covers[`${story.id}:${variant}`] = (await loadArtCover(story.id, variant)) ?? {
        src: `/content/stories/${story.id}/${variant}/main.webp`,
        srcset: '',
      }
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
.library .spread {
  min-height: 100vh;
}

.left-page {
  position: sticky;
  top: 0;
  align-self: start;
  height: 100vh;
  display: grid;
  place-items: center;
  // The extra room at the foot is for the caption, which hangs below the plate.
  padding: 56px clamp(32px, 5vw, 72px) calc(56px + 4.5rem);
}

// Only the plate is centred, so a title of one line or two leaves it where it is.
.left-page :deep(.frontispiece) {
  position: relative;
}

.left-page :deep(.caption) {
  position: absolute;
  top: calc(100% + 26px);
  left: 0;
  right: 0;
}

.right-page {
  padding: 28px clamp(40px, 6vw, 88px) 96px;
}

.running-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  color: var(--ink-muted);
}

.running-actions {
  display: flex;
  gap: 18px;
}

.title-page {
  display: grid;
  justify-items: center;
  gap: 14px;
  padding: 44px 0 40px;
  text-align: center;
}

.title-page h1 {
  margin-top: 6px;
  font-size: clamp(2.2rem, 4.2vw, 3rem);
  line-height: 1.12;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.byline {
  margin: 0 0 10px;
  font-style: italic;
  font-size: 1.3rem;
  color: var(--ink-soft);
}

.contents-head {
  display: flex;
  justify-content: space-between;
  margin: 0 0 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--ink);
  color: var(--ink);
}

.contents ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

.inline-frontispiece {
  margin: 8px auto 44px;
}

.inline-frontispiece :deep(.plate) {
  width: min(70vw, 360px);
}

@media (max-width: 1023px) {
  .right-page {
    max-width: 640px;
    margin: 0 auto;
    padding: max(18px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) 72px
      max(20px, env(safe-area-inset-left));
    box-shadow: none;
  }

  .title-page {
    padding: 36px 0 30px;
  }
}
</style>
