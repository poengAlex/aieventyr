<template>
  <section class="illustrated-story" :class="compact ? 'compact' : 'spread'">
    <aside v-if="!compact" class="left-page">
      <div class="sticky-plate">
        <transition name="plate-fade" mode="out-in">
          <art-figure
            v-if="current"
            :key="current.id"
            :picture="current"
            :src="url(current.file!)"
            :srcset="artSrcset(art.set, art.storyId, current.sources)"
            sizes="(max-width: 1400px) 40vw, 600px"
            ratio="auto"
            class="left-figure"
            @open="emit('open-image', url(current.file!), current.alt)"
          />
        </transition>
        <div v-if="position" class="plate-count caps">{{ position }} / {{ sequence.length }}</div>
      </div>
    </aside>

    <div class="right-page">
      <div class="page-column">
        <slot name="head" />
        <div
          ref="textElement"
          class="story-text"
          :lang="art.variant === 'english' ? 'en' : 'nb'"
          :style="{ fontSize: `${fontSize}px` }"
        >
          <template v-for="(paragraph, index) in paragraphs" :key="index">
            <!-- One line, so no whitespace gets into the text around the name buttons. -->
            <!-- prettier-ignore -->
            <p :ref="(el) => setParagraph(el, index)" class="story-paragraph"><template v-for="(piece, p) in pieces[index]" :key="p"><span v-if="piece.versal" class="versal">{{ piece.text }}</span><button v-else-if="piece.character" type="button" class="character-link" :class="{ 'lead-in': piece.lead }" @click="emit('open-character', piece.character)">{{ piece.text }}</button><span v-else-if="piece.lead" class="lead-in">{{ piece.text }}</span><template v-else>{{ piece.text }}</template></template></p>
            <template v-if="compact">
              <art-figure
                v-for="picture in placed.get(index) ?? []"
                :key="picture.id"
                :picture="picture"
                :src="url(picture.file!)"
                :srcset="artSrcset(art.set, art.storyId, picture.sources)"
                sizes="(max-width: 700px) 92vw, 640px"
                :ratio="sceneRatio"
                class="inline-plate"
                @open="emit('open-image', url(picture.file!), picture.alt)"
              />
            </template>
          </template>
        </div>
        <slot name="end" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import ArtFigure from 'src/components/ArtFigure.vue'
import {
  artSrcset,
  artUrl,
  linkCharacters,
  openingPieces,
  placePictures,
  splitParagraphs,
} from 'src/logic/art'
import type { TextPiece } from 'src/logic/art'
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
// From 1024px the tale is an open book: the picture for the passage being read stays on
// the left page while the text runs on the right. Below that the pictures sit between
// the paragraphs.
const compact = computed(() => $q.screen.lt.md)

const paragraphs = computed(() => splitParagraphs(props.text))
const placed = computed(() => placePictures(paragraphs.value, props.art.illustrations))
const pieces = computed<TextPiece[][]>(() =>
  paragraphs.value.map((paragraph, index) => {
    const segments = linkCharacters(paragraph, props.art.characters)
    return index === 0 ? openingPieces(segments) : segments
  }),
)
const sequence = computed(() =>
  [...placed.value.entries()]
    .sort((a, b) => a[0] - b[0])
    .flatMap(([index, pictures]) => pictures.map((picture) => ({ index, picture }))),
)
// The new scenes are 3:2; the older section pictures are square.
const sceneRatio = computed(() => (props.art.set ? '3 / 2' : '1 / 1'))
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
const position = computed(
  () => sequence.value.findIndex((item) => item.picture.id === current.value?.id) + 1,
)

function url(file: string) {
  return artUrl(props.art.set, props.art.storyId, file)
}

const textElement = ref<HTMLElement | null>(null)
defineExpose({ textElement })

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
.spread {
  min-height: calc(100vh - var(--bar-height));
}

.left-page {
  position: relative;
}

.sticky-plate {
  position: sticky;
  top: var(--bar-height);
  height: calc(100vh - var(--bar-height));
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 18px;
  padding: 32px clamp(28px, 4vw, 64px);
}

.left-figure {
  width: 100%;
  max-width: 620px;
}

.left-figure :deep(.art-image) {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: calc(100vh - var(--bar-height) - 200px);
  margin: 0 auto;
}

.plate-count {
  color: var(--ink-muted);
}

.page-column {
  max-width: 720px;
  margin: 0 auto;
  padding: 40px clamp(32px, 5vw, 80px) 96px;
}

.compact .page-column {
  max-width: 680px;
  padding: 0 max(22px, env(safe-area-inset-right)) 72px max(22px, env(safe-area-inset-left));
}

.story-text {
  line-height: 1.55;
  color: var(--ink);
  hyphens: auto;
  overflow-wrap: break-word;
}

.story-paragraph {
  margin: 0;
}

// Paragraphs are indented, as in a book; the first one after a picture is not.
.story-paragraph + .story-paragraph {
  text-indent: 1.4em;
}

.versal {
  float: left;
  margin: 0.06em 0.08em -0.06em 0;
  font-size: 3.75em;
  font-weight: 500;
  line-height: 0.8;
  color: var(--accent);
}

.lead-in {
  font-variant-caps: all-small-caps;
  font-size: 1.08em;
  letter-spacing: 0.06em;
}

.character-link {
  display: inline;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  letter-spacing: inherit;
  word-spacing: inherit;
  text-transform: inherit;
  text-indent: 0;
  color: inherit;
  cursor: pointer;
  text-decoration: underline dotted var(--rule);
  text-decoration-thickness: 1.5px;
  text-underline-offset: 0.22em;
}

.character-link:hover,
.character-link:focus-visible {
  color: var(--accent);
  text-decoration-color: currentColor;
}

.inline-plate {
  margin: 1.7em 0 1.9em;
}

.inline-plate + .story-paragraph {
  text-indent: 0;
}

.plate-fade-enter-active,
.plate-fade-leave-active {
  transition: opacity 0.35s ease;
}

.plate-fade-enter-from,
.plate-fade-leave-to {
  opacity: 0;
}
</style>
