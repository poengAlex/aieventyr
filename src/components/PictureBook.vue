<template>
  <q-dialog
    :model-value="modelValue"
    maximized
    transition-show="fade"
    transition-hide="fade"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="picture-book" @pointerdown="onPointerDown" @pointerup="onPointerUp">
      <q-btn
        round
        flat
        icon="close"
        class="book-close"
        aria-label="Close picture book"
        @click="emit('update:modelValue', false)"
      />
      <transition :name="direction" mode="out-in">
        <div v-if="page" :key="pageIndex" class="book-page" @click="onPageClick">
          <img :src="page.src" :alt="page.alt" class="book-image" />
          <div class="book-text" :style="{ fontSize: `${fontSize}px` }">
            <h2 v-if="pageIndex === 0" class="book-title">{{ title }}</h2>
            <p v-for="(paragraph, index) in page.paragraphs" :key="index">{{ paragraph }}</p>
            <p v-if="page.caption && !page.paragraphs.length" class="book-caption">
              {{ page.caption }}
            </p>
          </div>
        </div>
      </transition>
      <div class="book-controls">
        <q-btn
          round
          unelevated
          color="white"
          text-color="dark"
          icon="chevron_left"
          :disable="pageIndex === 0"
          aria-label="Previous page"
          @click="previous"
        />
        <span class="book-counter">{{ pageIndex + 1 }} / {{ pages.length }}</span>
        <q-btn
          round
          unelevated
          color="white"
          text-color="dark"
          icon="chevron_right"
          :disable="pageIndex >= pages.length - 1"
          aria-label="Next page"
          @click="next"
        />
      </div>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { artUrl, placePictures, splitParagraphs } from 'src/logic/art'
import type { ArtManifest } from 'src/types/content'

const props = defineProps<{
  modelValue: boolean
  text: string
  art: ArtManifest
  title: string
  fontSize: number
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

interface BookPage {
  src: string
  alt: string
  caption: string
  paragraphs: string[]
}

// Page one is the cover with the title. Every picture then gets a page with the text
// that leads up to it. Text after the last picture joins the last page.
const pages = computed<BookPage[]>(() => {
  const paragraphs = splitParagraphs(props.text)
  const url = (file: string) => artUrl(props.art.set, props.art.storyId, file)
  const placed = [...placePictures(paragraphs, props.art.illustrations).entries()].sort(
    (a, b) => a[0] - b[0],
  )
  const list: BookPage[] = []
  if (props.art.cover.file) {
    list.push({
      src: url(props.art.cover.file),
      alt: props.art.cover.alt,
      caption: '',
      paragraphs: [],
    })
  }
  let start = 0
  for (const [index, pictures] of placed) {
    pictures.forEach((picture, n) => {
      list.push({
        src: url(picture.file!),
        alt: picture.alt,
        caption: picture.caption,
        paragraphs: n === 0 ? paragraphs.slice(start, index + 1) : [],
      })
    })
    start = index + 1
  }
  const rest = paragraphs.slice(start)
  if (rest.length) {
    const last = list[list.length - 1]
    if (last && list.length > 1) last.paragraphs = [...last.paragraphs, ...rest]
    else list.push({ src: list[0]?.src ?? '', alt: '', caption: '', paragraphs: rest })
  }
  return list
})

const pageIndex = ref(0)
const direction = ref('turn-forward')
const page = computed(() => pages.value[pageIndex.value])

function next() {
  if (pageIndex.value >= pages.value.length - 1) return
  direction.value = 'turn-forward'
  pageIndex.value++
}

function previous() {
  if (pageIndex.value === 0) return
  direction.value = 'turn-back'
  pageIndex.value--
}

// Tap the right half to turn forward and the left half to go back, or swipe.
let swipeStart: number | null = null
let swiped = false
function onPointerDown(event: PointerEvent) {
  swipeStart = event.clientX
  swiped = false
}
function onPointerUp(event: PointerEvent) {
  if (swipeStart === null) return
  const distance = event.clientX - swipeStart
  swipeStart = null
  if (Math.abs(distance) < 60) return
  swiped = true
  if (distance < 0) next()
  else previous()
}
function onPageClick(event: MouseEvent) {
  if (swiped || window.getSelection()?.toString()) return
  const target = event.currentTarget as HTMLElement
  const { left, width } = target.getBoundingClientRect()
  if (event.clientX - left > width / 2) next()
  else previous()
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'ArrowRight' || event.key === ' ') next()
  if (event.key === 'ArrowLeft') previous()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      pageIndex.value = 0
      window.addEventListener('keydown', onKey)
    } else {
      window.removeEventListener('keydown', onKey)
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style lang="scss" scoped>
.picture-book {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  background: #f6f0e2;
  user-select: none;
}

.book-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  background: rgba(255, 255, 255, 0.8);
}

.book-page {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(300px, 1fr);
  gap: 32px;
  align-items: center;
  padding: 40px 48px 16px;
  min-height: 0;
  cursor: pointer;
}

.book-image {
  width: 100%;
  max-height: calc(100vh - 150px);
  object-fit: contain;
  border-radius: 18px;
  box-shadow: 0 18px 40px rgba(73, 56, 27, 0.18);
}

.book-text {
  max-height: calc(100vh - 150px);
  overflow: auto;
  line-height: 1.6;
  color: #2b2f27;
}

.book-text p {
  margin: 0 0 0.8em;
}

.book-title {
  margin: 0 0 0.6em;
  font-size: 1.6em;
  line-height: 1.15;
}

.book-caption {
  font-style: italic;
}

.book-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 10px 0 18px;
}

.book-counter {
  min-width: 64px;
  text-align: center;
  font-weight: 600;
  color: rgba(47, 59, 51, 0.7);
}

.turn-forward-enter-active,
.turn-forward-leave-active,
.turn-back-enter-active,
.turn-back-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.turn-forward-enter-from,
.turn-back-leave-to {
  opacity: 0;
  transform: translateX(40px);
}

.turn-forward-leave-to,
.turn-back-enter-from {
  opacity: 0;
  transform: translateX(-40px);
}

@media (max-width: 860px), (orientation: portrait) {
  .book-page {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
    align-items: start;
    gap: 16px;
    padding: 56px 18px 8px;
  }

  .book-image {
    max-height: 46vh;
  }

  .book-text {
    max-height: none;
    min-height: 0;
  }
}
</style>
