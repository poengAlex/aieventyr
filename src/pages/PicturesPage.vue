<template>
  <q-page class="pictures" :class="editionClass">
    <header class="running-head">
      <router-link to="/" class="caps-link">‹ {{ t.contents }}</router-link>
    </header>

    <div class="title-page">
      <div class="ornament" aria-hidden="true"><i /></div>
      <h1>{{ t.pictures }}</h1>
      <p class="byline">{{ loading ? '' : t.pictureCount(shown.length) }}</p>
    </div>

    <nav class="filters">
      <div class="filter-row" role="radiogroup" :aria-label="t.edition">
        <button
          v-for="option in setOptions"
          :key="option.value"
          type="button"
          role="radio"
          class="caps-link"
          :class="{ active: option.value === set }"
          :aria-checked="option.value === set"
          @click="setQuery({ set: option.value })"
        >
          {{ option.label }} <span class="count">{{ option.count }}</span>
        </button>
      </div>
      <div class="filter-row" role="radiogroup" :aria-label="t.kindOfPicture">
        <button
          v-for="option in kindOptions"
          :key="option.value"
          type="button"
          role="radio"
          class="caps-link"
          :class="{ active: option.value === kind }"
          :aria-checked="option.value === kind"
          @click="setQuery({ kind: option.value })"
        >
          {{ option.label }} <span class="count">{{ option.count }}</span>
        </button>
      </div>
      <select
        class="tale-select"
        :value="storyId"
        :aria-label="t.tale"
        @change="setQuery({ story: ($event.target as HTMLSelectElement).value })"
      >
        <option value="">{{ t.allTales }}</option>
        <option v-for="story in stories" :key="story.id" :value="story.id">
          {{ titles[story.id]?.numeral }}. {{ titles[story.id]?.title }}
        </option>
      </select>
    </nav>

    <p v-if="!loading && !groups.length" class="empty">{{ t.noPictures }}</p>

    <section v-for="group in groups" :key="group.storyId" class="tale">
      <h2 class="tale-head">
        <span class="numeral">{{ titles[group.storyId]?.numeral }}</span>
        <router-link :to="`/story/${group.storyId}/`">{{
          titles[group.storyId]?.title
        }}</router-link>
      </h2>
      <div v-for="row in group.rows" :key="row.kind" class="kind-row">
        <h3 v-if="kind === 'all'" class="caps kind-head">{{ t.kinds[row.kind] }}</h3>
        <ul class="tiles" :class="`tiles-${row.kind}`">
          <li v-for="item in row.items" :key="item.key">
            <button
              type="button"
              class="tile"
              :class="`edition-${item.set}`"
              :aria-label="tileLabel(item)"
              :title="item.caption || item.name"
              @click="open(item)"
            >
              <lazy-loop
                v-if="item.kind === 'turns'"
                :src="item.src"
                :label="item.name"
                class="tile-image"
              />
              <plate-image
                v-else
                :src="item.thumb"
                :alt="item.alt"
                loading="lazy"
                decoding="async"
                class="tile-image"
              />
              <span v-if="item.name || set === 'all'" class="tile-label">
                <span v-if="item.name" class="tile-name">{{ item.name }}</span>
                <span v-if="set === 'all'" class="caps tile-set">{{ setName(item.set) }}</span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </section>

    <picture-viewer
      v-model="viewerOpen"
      v-model:index="viewerIndex"
      :items="shown"
      :stories="titles"
      :set-name="setName"
      @read="readTale"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LazyLoop from 'src/components/LazyLoop.vue'
import PictureViewer from 'src/components/PictureViewer.vue'
import PlateImage from 'src/components/PlateImage.vue'
import { artSetFor } from 'src/logic/art'
import {
  GALLERY_KINDS,
  GALLERY_SETS,
  gallerySetVariant,
  loadGallery,
  type GalleryItem,
  type GalleryKind,
  type GallerySet,
} from 'src/logic/gallery'
import { roman, useText } from 'src/logic/i18n'
import { createNotify } from 'src/logic/utils'
import { useSettingsStore } from 'src/stores/settings'
import type { StoryListItem } from 'src/types/content'

// Every picture in the book in one place, by tale: covers and scenes, and each character's
// portrait, model sheet and turn. The filters live in the address (?set=modern&kind=scenes
// &story=askesv), so a view can be shared.
const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()
const { t, lang, editionName } = useText()

const loading = ref(true)
const stories = ref<StoryListItem[]>([])
const items = ref<GalleryItem[]>([])

const queryValue = (key: string) => {
  const value = route.query[key]
  return typeof value === 'string' ? value : ''
}
const isSet = (value: string): value is GallerySet =>
  (GALLERY_SETS as readonly string[]).includes(value)
const isKind = (value: string): value is GalleryKind =>
  (GALLERY_KINDS as readonly string[]).includes(value)

// The page opens on the pictures of the edition the reader has chosen.
const set = computed<GallerySet | 'all'>(() => {
  const value = queryValue('set')
  if (value === 'all' || isSet(value)) return value
  return (artSetFor(settings.variant) as GallerySet | null) ?? 'classic'
})
const kind = computed<GalleryKind | 'all'>(() => {
  const value = queryValue('kind')
  return isKind(value) ? value : 'all'
})
const storyId = computed(() => {
  const value = queryValue('story')
  return stories.value.some((story) => story.id === value) ? value : ''
})

const editionClass = computed(
  () => `edition-${set.value === 'all' ? (artSetFor(settings.variant) ?? 'classic') : set.value}`,
)

function setQuery(change: { set?: string; kind?: string; story?: string }) {
  const query = { ...route.query, ...change }
  if (query.kind === 'all') delete query.kind
  if (query.story === '') delete query.story
  void router.replace({ query })
}

const setName = (value: GallerySet) => editionName(value === 'classic' ? 'simplified' : value)

const titles = computed(() =>
  Object.fromEntries(
    stories.value.map((story) => [
      story.id,
      {
        numeral: roman(story.index),
        title: story.titles?.[settings.variant] ?? story.canonicalTitle,
      },
    ]),
  ),
)

const matches = (item: GalleryItem, skip?: 'set' | 'kind') =>
  (skip === 'set' || set.value === 'all' || item.set === set.value) &&
  (skip === 'kind' || kind.value === 'all' || item.kind === kind.value) &&
  (!storyId.value || item.storyId === storyId.value)

const shown = computed(() => items.value.filter((item) => matches(item)))

// Each filter shows how many pictures it would leave, given the other filters.
const setOptions = computed(() => {
  const pool = items.value.filter((item) => matches(item, 'set'))
  return [
    { value: 'all', label: t.value.all, count: pool.length },
    ...GALLERY_SETS.map((value) => ({
      value,
      label: setName(value),
      count: pool.filter((item) => item.set === value).length,
    })),
  ]
})

const kindOptions = computed(() => {
  const pool = items.value.filter((item) => matches(item, 'kind'))
  return [
    { value: 'all', label: t.value.everything, count: pool.length },
    ...GALLERY_KINDS.map((value) => ({
      value,
      label: t.value.kinds[value],
      count: pool.filter((item) => item.kind === value).length,
    })),
  ]
})

// The shown pictures by tale, and within a tale by kind. They come in that order already.
const groups = computed(() => {
  const result: { storyId: string; rows: { kind: GalleryKind; items: GalleryItem[] }[] }[] = []
  for (const item of shown.value) {
    let group = result[result.length - 1]
    if (group?.storyId !== item.storyId) {
      group = { storyId: item.storyId, rows: [] }
      result.push(group)
    }
    let row = group.rows[group.rows.length - 1]
    if (row?.kind !== item.kind) {
      row = { kind: item.kind, items: [] }
      group.rows.push(row)
    }
    row.items.push(item)
  }
  return result
})

const tileLabel = (item: GalleryItem) => {
  const what =
    item.kind === 'scenes'
      ? t.value.scene(item.number)
      : item.kind === 'covers'
        ? t.value.kinds.covers
        : `${item.name}, ${t.value.kinds[item.kind].toLowerCase()}`
  return set.value === 'all' ? `${what} (${setName(item.set)})` : what
}

const viewerOpen = ref(false)
const viewerIndex = ref(0)

function open(item: GalleryItem) {
  viewerIndex.value = shown.value.indexOf(item)
  viewerOpen.value = true
}

// The tale opens in the edition the picture belongs to, so its pictures are the ones seen.
function readTale(item: GalleryItem) {
  settings.setVariant(gallerySetVariant(item.set, lang.value))
}

watch(
  lang,
  async (value) => {
    loading.value = true
    try {
      const gallery = await loadGallery(value)
      stories.value = gallery.stories
      items.value = gallery.items
    } catch (error: unknown) {
      createNotify((error as Error).message)
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

// The router sets the plain title after every navigation, a change of filter too.
watchEffect(() => {
  void route.fullPath
  document.title = `${t.value.pictures} · Eventyr`
})
</script>

<style lang="scss" scoped>
.pictures {
  max-width: 1240px;
  margin: 0 auto;
  padding: max(18px, env(safe-area-inset-top)) max(28px, env(safe-area-inset-right)) 96px
    max(28px, env(safe-area-inset-left));
}

.title-page {
  display: grid;
  justify-items: center;
  gap: 14px;
  padding: 44px 0 28px;
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
  min-height: 1.5em;
  margin: 0;
  font-style: italic;
  font-size: 1.3rem;
  color: var(--ink-soft);
}

// One column as wide as the page: a select is as wide as its longest option, and would
// otherwise widen the column past the edge of a phone.
.filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  gap: 12px;
  margin-bottom: 48px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 22px;
}

.filter-row .caps-link {
  border-bottom: 1px solid transparent;
}

.filter-row .caps-link.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.count {
  margin-left: 2px;
  color: var(--ink-muted);
  letter-spacing: 0.04em;
  font-variant-numeric: lining-nums;
}

.tale-select {
  width: min(100%, 420px);
  margin-top: 6px;
  padding: 6px 4px;
  border: 0;
  border-bottom: 1px solid var(--rule);
  background: transparent;
  color: var(--ink);
  font-family: var(--serif);
  font-size: 1.05rem;
  cursor: pointer;
}

.tale-select option {
  background: var(--paper);
  color: var(--ink);
}

.empty {
  text-align: center;
  font-style: italic;
  color: var(--ink-muted);
}

// Tales far off the screen are not laid out until they come near it.
.tale {
  content-visibility: auto;
  contain-intrinsic-size: auto 900px;
  margin-bottom: 56px;
}

.tale-head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 22px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--ink);
  font-size: clamp(1.4rem, 2.6vw, 1.8rem);
}

.tale-head a:hover {
  color: var(--accent);
}

.kind-row + .kind-row {
  margin-top: 30px;
}

.kind-head {
  margin-bottom: 16px;
  color: var(--ink-muted);
}

// Room around each tile for its plate frame, which is drawn outside it.
.tiles {
  --tile: 150px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(var(--tile), 100%), 1fr));
  gap: 28px 24px;
  margin: 0;
  padding: 7px;
  list-style: none;
}

.tiles-covers {
  --tile: 180px;
}

.tiles-scenes,
.tiles-sheets {
  --tile: 240px;
}

.tile {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: center;
  cursor: zoom-in;
}

.tile-image {
  width: 100%;
  aspect-ratio: 1;
  transition: opacity 0.2s;
}

.tiles-scenes .tile-image,
.tiles-sheets .tile-image {
  aspect-ratio: 3 / 2;
}

// Model sheets and turns are painted on their edition's own paper.
.tiles-sheets .tile-image,
.tiles-turns .tile-image {
  background: var(--sheet-paper, #f8ead0);
}

.tile:hover .tile-image {
  opacity: 0.88;
}

.tile:focus-visible {
  outline: none;
}

.tile:focus-visible .tile-image {
  outline: 2px solid var(--accent);
  outline-offset: 9px;
}

.tile-label {
  display: grid;
  gap: 2px;
  margin-top: 14px;
  line-height: 1.25;
}

.tile-name {
  font-size: 1rem;
  color: var(--ink-soft);
}

.tile-set {
  font-size: 0.68rem;
  color: var(--accent);
}

@media (max-width: 600px) {
  .pictures {
    padding-left: max(16px, env(safe-area-inset-left));
    padding-right: max(16px, env(safe-area-inset-right));
  }

  .filter-row {
    gap: 6px 16px;
  }

  .tiles {
    --tile: 120px;
    gap: 24px 20px;
  }

  .tiles-covers,
  .tiles-scenes,
  .tiles-sheets {
    --tile: 140px;
  }
}
</style>
