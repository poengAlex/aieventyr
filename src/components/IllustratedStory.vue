<template>
  <section class="illustrated-story" :class="{ compact }">
    <div class="story-column" :style="{ fontSize: `${fontSize}px` }">
      <template v-for="(paragraph, index) in paragraphs" :key="index">
        <!-- One line, so no whitespace gets into the text around the name buttons. -->
        <!-- prettier-ignore -->
        <p :ref="(el) => setParagraph(el, index)" class="story-paragraph"><template v-for="(segment, s) in segments[index]" :key="s"><button v-if="segment.character" type="button" class="character-link" @click="emit('open-character', segment.character)">{{ segment.text }}</button><template v-else>{{ segment.text }}</template></template></p>
        <template v-if="compact">
          <art-figure
            v-for="picture in placed.get(index) ?? []"
            :key="picture.id"
            :picture="picture"
            :src="url(picture.file!)"
            :srcset="artSrcset(art.set, art.storyId, picture.sources)"
            sizes="(max-width: 700px) 92vw, 640px"
            class="inline-picture"
            @open="emit('open-image', url(picture.file!), picture.alt)"
          />
        </template>
      </template>
    </div>

    <aside v-if="!compact && current" class="picture-column">
      <div class="sticky-picture">
        <transition name="picture-fade" mode="out-in">
          <art-figure
            :key="current.id"
            :picture="current"
            :src="url(current.file!)"
            :srcset="artSrcset(art.set, art.storyId, current.sources)"
            sizes="(max-width: 1180px) 42vw, 500px"
            @open="emit('open-image', url(current.file!), current.alt)"
          />
        </transition>
        <div v-if="sequence.length" class="picture-progress">
          <span
            v-for="item in sequence"
            :key="item.picture.id"
            class="progress-dot"
            :class="{ active: item.picture.id === current.id }"
          />
        </div>
      </div>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import ArtFigure from 'src/components/ArtFigure.vue'
import { artSrcset, artUrl, linkCharacters, placePictures, splitParagraphs } from 'src/logic/art'
import type { ArtManifest, ArtPicture } from 'src/types/content'

const props = defineProps<{
  text: string
  art: ArtManifest
  fontSize: number
}>()

const emit = defineEmits<{
  'open-character': [slug: string]
  'open-image': [src: string, alt: string]
}>()

const $q = useQuasar()
// Below 1024px the pictures sit between the paragraphs; above it, one picture stays
// beside the text and changes as the reader reaches its paragraph.
const compact = computed(() => $q.screen.lt.md)

const paragraphs = computed(() => splitParagraphs(props.text))
const placed = computed(() => placePictures(paragraphs.value, props.art.illustrations))
const segments = computed(() =>
  paragraphs.value.map((paragraph) => linkCharacters(paragraph, props.art.characters)),
)
const sequence = computed(() =>
  [...placed.value.entries()]
    .sort((a, b) => a[0] - b[0])
    .flatMap(([index, pictures]) => pictures.map((picture) => ({ index, picture }))),
)
const cover = computed<ArtPicture | null>(() =>
  props.art.cover.file
    ? { ...props.art.cover, id: 'cover', paragraph: -1, anchor: '', places: [] }
    : null,
)

const readingParagraph = ref(-1)
const current = computed(() => {
  let chosen = cover.value ?? sequence.value[0]?.picture ?? null
  for (const item of sequence.value) {
    if (item.index > readingParagraph.value) break
    chosen = item.picture
  }
  return chosen
})

function url(file: string) {
  return artUrl(props.art.set, props.art.storyId, file)
}

const paragraphElements: HTMLElement[] = []
function setParagraph(element: unknown, index: number) {
  if (element instanceof HTMLElement) paragraphElements[index] = element
}

// The paragraph being read is the last one that starts above 40% of the window height.
let frame = 0
function measure() {
  frame = 0
  const line = window.innerHeight * 0.4
  let low = 0
  let high = paragraphs.value.length - 1
  let found = -1
  while (low <= high) {
    const middle = (low + high) >> 1
    const top = paragraphElements[middle]?.getBoundingClientRect().top ?? Infinity
    if (top <= line) {
      found = middle
      low = middle + 1
    } else {
      high = middle - 1
    }
  }
  readingParagraph.value = found
}

function onScroll() {
  if (!frame) frame = requestAnimationFrame(measure)
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  void nextTick(measure)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  if (frame) cancelAnimationFrame(frame)
})

watch(paragraphs, () => {
  paragraphElements.length = 0
  void nextTick(measure)
})
</script>

<style lang="scss" scoped>
.illustrated-story {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 0.8fr);
  gap: clamp(32px, 5vw, 64px);
  align-items: start;
}

.illustrated-story.compact {
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
}

.story-column {
  width: 100%;
  max-width: 34em;
  font-family: var(--serif);
  line-height: 1.75;
  color: var(--ink);
  font-optical-sizing: auto;
}

.story-paragraph {
  margin: 0 0 1em;
}

// A drop cap opens the tale, as in an old storybook.
.story-paragraph:first-child::first-letter {
  float: left;
  margin: 0.08em 0.1em 0 0;
  font-size: 3.4em;
  font-weight: 600;
  line-height: 0.82;
  color: var(--accent);
}

.character-link {
  font: inherit;
  color: inherit;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  text-decoration: underline dotted color-mix(in srgb, var(--ink) 40%, transparent);
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
}

.character-link:hover,
.character-link:focus-visible {
  color: var(--accent);
  text-decoration-color: currentColor;
}

.inline-picture {
  margin: 12px 0 36px;
  font-size: 1rem;
}

// The column spans the whole text, so the picture inside it can stay in view.
.picture-column {
  align-self: stretch;
}

.sticky-picture {
  position: sticky;
  top: 88px;
  display: grid;
  gap: 14px;
}

.picture-progress {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.progress-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--line);
  transition: background 0.3s;
}

.progress-dot.active {
  background: var(--accent);
}

.picture-fade-enter-active,
.picture-fade-leave-active {
  transition: opacity 0.4s ease;
}

.picture-fade-enter-from,
.picture-fade-leave-to {
  opacity: 0;
}
</style>
