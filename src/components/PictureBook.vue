<template>
  <q-dialog
    :model-value="modelValue"
    maximized
    transition-show="fade"
    transition-hide="fade"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div
      ref="stage"
      class="picture-book"
      :class="`layout-${layout}`"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <q-btn
        round
        flat
        icon="close"
        class="book-close"
        :aria-label="t.close"
        @click="emit('update:modelValue', false)"
      />

      <div ref="bookElement" class="book" :style="bookStyle">
        <template v-if="layout === 'spread'">
          <div class="sheet sheet-left">
            <book-face v-if="base.left" :page="base.left" part="picture" />
          </div>
          <div class="sheet sheet-right">
            <book-face
              v-if="base.right"
              :page="base.right"
              part="text"
              :title="titleOf(base.right)"
            />
          </div>
        </template>
        <div v-else class="sheet sheet-single">
          <book-face
            v-if="base.single"
            :page="base.single"
            part="full"
            :title="titleOf(base.single)"
          />
        </div>

        <!-- The page being turned: its front is the page lifting away, its back the page that lands. -->
        <div
          v-if="leaf"
          class="leaf"
          :class="leaf.className"
          :style="{ transform: `rotateY(${leaf.angle}deg)` }"
        >
          <div class="leaf-face leaf-front">
            <book-face
              :page="leaf.front.page"
              :part="leaf.front.part"
              :title="titleOf(leaf.front.page)"
            />
          </div>
          <div class="leaf-face leaf-back">
            <book-face
              v-if="leaf.back"
              :page="leaf.back.page"
              :part="leaf.back.part"
              :title="titleOf(leaf.back.page)"
            />
          </div>
        </div>
      </div>

      <div class="book-controls">
        <q-btn
          round
          unelevated
          color="white"
          text-color="dark"
          icon="chevron_left"
          :disable="!canTurn(-1)"
          :aria-label="t.previousPage"
          @click="turnPage(-1)"
        />
        <span class="book-counter">{{ pageIndex + 1 }} / {{ pages.length }}</span>
        <q-btn
          round
          unelevated
          color="white"
          text-color="dark"
          icon="chevron_right"
          :disable="!canTurn(1)"
          :aria-label="t.nextPage"
          @click="turnPage(1)"
        />
      </div>

      <rotate-hint v-if="showRotateHint" @dismiss="dismissRotateHint" />
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import BookFace from 'src/components/BookFace.vue'
import RotateHint from 'src/components/RotateHint.vue'
import { bookPages, type BookPage } from 'src/logic/art'
import { useText } from 'src/logic/i18n'
import type { ArtManifest } from 'src/types/content'

const props = defineProps<{
  modelValue: boolean
  text: string
  art: ArtManifest
  title: string
  fontSize: number
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const { t } = useText()

const stage = ref<HTMLElement | null>(null)
const bookElement = ref<HTMLElement | null>(null)
const pages = computed(() => bookPages(props.text, props.art))
const pageIndex = ref(0)

function titleOf(page: BookPage) {
  return page === pages.value[0] ? props.title : undefined
}

// A wide screen shows an open book: the picture on the left page and the text on the
// right. A narrow or upright screen shows one page with the picture above the text.
const layout = ref<'spread' | 'single'>('single')
function measureLayout() {
  layout.value =
    window.innerWidth >= 600 && window.innerWidth >= window.innerHeight * 1.1 ? 'spread' : 'single'
}

// ---- turning pages

interface Turn {
  dir: 1 | -1
  progress: number
  animating: boolean
}

const turn = ref<Turn | null>(null)
const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function canTurn(dir: 1 | -1) {
  const target = pageIndex.value + dir
  return target >= 0 && target < pages.value.length
}

// What lies on the book while a page turns. Turning forward in the open book, the
// right page lifts off the spine and lands on the left: its front is the current text,
// its back the next picture, and the next text shows underneath. Turning back mirrors
// that. A single page swings away to the left like a page in a flip book.
const base = computed(() => {
  const at = (n: number) => pages.value[n]
  const index = pageIndex.value
  const current = turn.value
  if (layout.value === 'spread') {
    if (!current) return { left: at(index), right: at(index) }
    return current.dir > 0
      ? { left: at(index), right: at(index + 1) }
      : { left: at(index - 1), right: at(index) }
  }
  return { single: current && current.dir > 0 ? at(index + 1) : at(index) }
})

const leaf = computed(() => {
  const current = turn.value
  const at = (n: number) => pages.value[n]!
  if (!current) return null
  const index = pageIndex.value
  const progress = current.progress
  if (layout.value === 'spread') {
    return current.dir > 0
      ? {
          className: 'leaf-right',
          angle: -180 * progress,
          front: { page: at(index), part: 'text' as const },
          back: { page: at(index + 1), part: 'picture' as const },
        }
      : {
          className: 'leaf-left',
          angle: 180 * progress,
          front: { page: at(index), part: 'picture' as const },
          back: { page: at(index - 1), part: 'text' as const },
        }
  }
  return current.dir > 0
    ? {
        className: 'leaf-single',
        angle: -180 * progress,
        front: { page: at(index), part: 'full' as const },
        back: null,
      }
    : {
        className: 'leaf-single',
        angle: -180 * (1 - progress),
        front: { page: at(index - 1), part: 'full' as const },
        back: null,
      }
})

// The shadow on the turning page and on the page below is darkest halfway through.
const bookStyle = computed(() => ({
  '--book-font': `${props.fontSize}px`,
  '--shade': turn.value ? Math.sin(Math.PI * turn.value.progress).toFixed(3) : '0',
}))

let frame = 0
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)

// Runs the turn to the end (1) or back to where it started (0).
function settle(target: 0 | 1) {
  const current = turn.value
  if (!current) return
  current.animating = true
  const from = current.progress
  const duration = reduceMotion ? 1 : 80 + 720 * Math.abs(target - from)
  const start = performance.now()
  cancelAnimationFrame(frame)
  const step = (now: number) => {
    const k = Math.min(1, (now - start) / duration)
    current.progress = from + (target - from) * easeInOut(k)
    if (k < 1) {
      frame = requestAnimationFrame(step)
      return
    }
    if (target === 1) pageIndex.value += current.dir
    turn.value = null
  }
  frame = requestAnimationFrame(step)
}

function turnPage(dir: 1 | -1) {
  if (turn.value || !canTurn(dir)) return
  turn.value = { dir, progress: 0, animating: false }
  settle(1)
}

// ---- swiping and tapping

// A horizontal drag turns the page under the finger; letting go past a third of the way,
// or with a flick, finishes the turn. A tap on the right half turns forward, on the left
// half back. Vertical drags are left to the browser, so long text can scroll.
interface Gesture {
  id: number
  x: number
  y: number
  lastX: number
  lastTime: number
  velocity: number
  dragging: boolean
}
let gesture: Gesture | null = null

const isControl = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest('button, a, .rotate-hint'))

function onPointerDown(event: PointerEvent) {
  if (
    turn.value ||
    isControl(event.target) ||
    (event.pointerType === 'mouse' && event.button !== 0)
  )
    return
  const now = performance.now()
  gesture = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    lastX: event.clientX,
    lastTime: now,
    velocity: 0,
    dragging: false,
  }
}

function onPointerMove(event: PointerEvent) {
  if (!gesture || event.pointerId !== gesture.id) return
  const dx = event.clientX - gesture.x
  const dy = event.clientY - gesture.y
  const now = performance.now()
  gesture.velocity = (event.clientX - gesture.lastX) / Math.max(1, now - gesture.lastTime)
  gesture.lastX = event.clientX
  gesture.lastTime = now
  if (!gesture.dragging) {
    if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return
    const dir = dx < 0 ? 1 : -1
    if (!canTurn(dir) || turn.value) {
      gesture = null
      return
    }
    gesture.dragging = true
    turn.value = { dir, progress: 0, animating: false }
    stage.value?.setPointerCapture(event.pointerId)
  }
  const current = turn.value
  if (!current || current.animating) return
  const width = bookElement.value?.getBoundingClientRect().width || window.innerWidth
  const travel = current.dir > 0 ? -dx : dx
  current.progress = Math.min(1, Math.max(0, travel / (width * 0.85)))
}

function onPointerUp(event: PointerEvent) {
  if (!gesture || event.pointerId !== gesture.id) return
  const done = gesture
  gesture = null
  const current = turn.value
  if (done.dragging && current && !current.animating) {
    const flick = (current.dir > 0 ? -done.velocity : done.velocity) > 0.5
    settle(current.progress > 0.33 || flick ? 1 : 0)
    return
  }
  const moved = Math.hypot(event.clientX - done.x, event.clientY - done.y)
  if (moved > 10 || window.getSelection()?.toString()) return
  const rect = stage.value?.getBoundingClientRect()
  if (!rect) return
  turnPage(event.clientX - rect.left > rect.width / 2 ? 1 : -1)
}

function onPointerCancel() {
  gesture = null
  if (turn.value && !turn.value.animating) settle(0)
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'ArrowRight' || event.key === ' ') {
    event.preventDefault()
    turnPage(1)
  }
  if (event.key === 'ArrowLeft') turnPage(-1)
}

// ---- turning the phone sideways

// On a phone held upright, the book first suggests turning it sideways. The hint goes
// away by itself once the phone is turned, and "read upright" hides it for the visit.
const HINT_KEY = 'picture-book-rotate-hint-dismissed'
const showRotateHint = ref(false)
const touchScreen = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const portrait = typeof window !== 'undefined' ? window.matchMedia('(orientation: portrait)') : null

function hintDismissed() {
  try {
    return sessionStorage.getItem(HINT_KEY) === '1'
  } catch {
    return false
  }
}

function dismissRotateHint() {
  showRotateHint.value = false
  try {
    sessionStorage.setItem(HINT_KEY, '1')
  } catch {
    // storage may be unavailable; the hint then just shows again next time
  }
}

function onViewportChange() {
  measureLayout()
  if (showRotateHint.value && portrait && !portrait.matches) showRotateHint.value = false
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      pageIndex.value = 0
      turn.value = null
      measureLayout()
      showRotateHint.value = touchScreen && Boolean(portrait?.matches) && !hintDismissed()
      window.addEventListener('keydown', onKey)
      window.addEventListener('resize', onViewportChange)
      portrait?.addEventListener('change', onViewportChange)
    } else {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onViewportChange)
      portrait?.removeEventListener('change', onViewportChange)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onViewportChange)
  portrait?.removeEventListener('change', onViewportChange)
})
</script>

<style lang="scss" scoped>
.picture-book {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  justify-items: center;
  align-items: center;
  padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) 0
    max(12px, env(safe-area-inset-left));
  background: radial-gradient(ellipse at center, #4a3f33 0%, #2a241e 70%, #1f1a15 100%);
  user-select: none;
  touch-action: pan-y;
  overflow: hidden;
}

.book-close {
  position: absolute;
  top: max(10px, env(safe-area-inset-top));
  right: max(10px, env(safe-area-inset-right));
  z-index: 4;
  color: #fff;
  background: rgba(20, 16, 12, 0.55);
}

.book {
  position: relative;
  perspective: 2400px;
  border-radius: 14px;
  box-shadow:
    0 30px 60px rgba(0, 0, 0, 0.45),
    0 2px 0 rgba(255, 255, 255, 0.05);
}

.layout-spread .book {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: min(calc(100% - 112px), 1400px, calc((100dvh - 96px) * 1.9));
  height: min(calc(100dvh - 96px), 860px);
}

.picture-book.layout-single {
  padding-top: max(60px, calc(env(safe-area-inset-top) + 50px));
}

.layout-single .book {
  width: min(100%, 620px);
  height: calc(100dvh - 152px);
}

.sheet {
  position: relative;
  overflow: hidden;
  background: var(--card);
}

.sheet-single {
  height: 100%;
  border-radius: 14px;
}

.sheet-left {
  border-radius: 14px 0 0 14px;
}

.sheet-right {
  border-radius: 0 14px 14px 0;
}

// The fold in the middle of the open book.
.sheet-left::after,
.sheet-right::after,
.leaf-face::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.sheet-left::after {
  background: linear-gradient(to left, rgba(60, 45, 25, 0.22), rgba(60, 45, 25, 0) 9%);
}

.sheet-right::after {
  background: linear-gradient(to right, rgba(60, 45, 25, 0.22), rgba(60, 45, 25, 0) 9%);
}

.leaf {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 2;
  transform-style: preserve-3d;
  will-change: transform;
}

.leaf-right {
  left: 50%;
  width: 50%;
  transform-origin: left center;
}

.leaf-left {
  left: 0;
  width: 50%;
  transform-origin: right center;
}

.leaf-single {
  left: 0;
  width: 100%;
  transform-origin: left center;
}

.leaf-face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--card);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.leaf-back {
  transform: rotateY(180deg);
}

.leaf-right .leaf-face,
.leaf-single .leaf-front {
  border-radius: 0 14px 14px 0;
}

.leaf-left .leaf-face,
.leaf-single .leaf-back {
  border-radius: 14px 0 0 14px;
}

.leaf-single .leaf-front {
  border-radius: 14px;
}

.leaf-single .leaf-back {
  background: var(--paper-deep);
}

// The turning page darkens towards the fold as it lifts.
.leaf-right .leaf-front::after,
.leaf-left .leaf-back::after,
.leaf-single .leaf-front::after {
  background: linear-gradient(to right, rgba(40, 30, 15, 0.45), rgba(40, 30, 15, 0) 55%);
  opacity: var(--shade);
}

.leaf-left .leaf-front::after,
.leaf-right .leaf-back::after {
  background: linear-gradient(to left, rgba(40, 30, 15, 0.45), rgba(40, 30, 15, 0) 55%);
  opacity: var(--shade);
}

.leaf-single .leaf-back::after {
  background: linear-gradient(to left, rgba(40, 30, 15, 0.3), rgba(40, 30, 15, 0) 60%);
}

.book-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 10px 0 max(14px, env(safe-area-inset-bottom));
}

.book-counter {
  min-width: 64px;
  text-align: center;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

@media (max-height: 520px) {
  .picture-book {
    padding-top: 8px;
  }

  .layout-spread .book {
    height: calc(100dvh - 62px);
    width: min(calc(100% - 96px), calc((100dvh - 62px) * 2.1));
  }

  .book-controls {
    gap: 12px;
    padding: 6px 0 max(6px, env(safe-area-inset-bottom));
  }

  .book-controls :deep(.q-btn) {
    font-size: 11px;
  }

  .book-close {
    top: 4px;
    right: 4px;
  }
}
</style>
