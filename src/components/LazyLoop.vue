<template>
  <span ref="root" class="plate plate-image">
    <video
      v-if="near"
      :ref="start"
      class="fade-image"
      :class="{ 'is-loaded': loaded }"
      :src="reduceMotion ? `${src}#t=0.001` : src"
      :aria-label="label"
      role="img"
      muted
      loop
      playsinline
      disablepictureinpicture
      preload="auto"
      @loadeddata="loaded = true"
      @error="loaded = true"
    />
  </span>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// A short silent loop in its plate frame, like PlateVideo, for pages with hundreds of them:
// the video is only there while the frame is on or near the screen, so the rest neither
// download nor play. Readers who ask for less motion see the first frame, standing still.
defineProps<{ src: string; label: string }>()

const root = ref<HTMLElement | null>(null)
const near = ref(false)
const loaded = ref(false)
const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
let observer: IntersectionObserver | null = null

// Browsers only autoplay muted video, and some look at the property rather than the
// attribute, so it is set and started by hand.
function start(element: unknown) {
  if (!(element instanceof HTMLVideoElement) || reduceMotion) return
  element.muted = true
  element.play().catch(() => {})
}

onMounted(() => {
  if (!root.value || typeof IntersectionObserver === 'undefined') {
    near.value = true
    return
  }
  observer = new IntersectionObserver(
    ([entry]) => {
      near.value = Boolean(entry?.isIntersecting)
      if (!near.value) loaded.value = false
    },
    { rootMargin: '200px 0px' },
  )
  observer.observe(root.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>
