<template>
  <span class="plate plate-image">
    <video
      ref="video"
      class="fade-image"
      :class="{ 'is-loaded': loaded }"
      :src="src"
      :aria-label="label"
      role="img"
      autoplay
      muted
      loop
      playsinline
      disablepictureinpicture
      @loadeddata="loaded = true"
      @error="loaded = true"
    />
  </span>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

// A short silent loop in its plate frame, like PlateImage: the frame pulses until the first
// frame is ready, then the video fades in. Size it with a class or style.
defineProps<{ src: string; label: string }>()

const video = ref<HTMLVideoElement | null>(null)
const loaded = ref(false)

// Browsers only autoplay muted video, and some look at the property rather than the
// attribute, so set it and start playing by hand as well.
onMounted(() => {
  const element = video.value
  if (!element) return
  element.muted = true
  element.play().catch(() => {})
})
</script>
