<template>
  <div
    ref="root"
    class="plate cast-lineup"
    :class="`count-${size}`"
    role="group"
    :aria-label="label"
  >
    <button
      v-for="(character, index) in characters"
      :key="character.slug"
      type="button"
      class="cast-figure"
      :aria-label="character.name"
      :title="character.name"
      @click="emit('open', character.slug)"
      @mouseenter="play(index)"
    >
      <video
        :ref="(el) => (videos[index] = el as HTMLVideoElement | null)"
        :src="`${character.turn}#t=0.001`"
        aria-hidden="true"
        muted
        playsinline
        preload="auto"
        disablepictureinpicture
        @ended="rest(index)"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { CharacterCard } from 'src/types/content'

// The cast standing together on one plate under the title, like the character page at the
// front of a picture book. Each figure turns once, one after the other, when the plate
// comes into view, then rests facing the reader; hovering turns it again and a tap opens
// the character. Readers who ask for less motion see them standing still.
const props = defineProps<{ characters: CharacterCard[]; label: string }>()
const emit = defineEmits<{ open: [slug: string] }>()

const root = ref<HTMLElement | null>(null)
const videos: (HTMLVideoElement | null)[] = []
const size = computed(() =>
  props.characters.length <= 5 ? 'few' : props.characters.length <= 9 ? 'some' : 'many',
)
const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const timers: number[] = []
let observer: IntersectionObserver | null = null

function play(index: number) {
  const video = videos[index]
  if (reduceMotion || !video || !video.paused) return
  video.muted = true
  video.currentTime = 0
  video.play().catch(() => {})
}

// The last frame is nearly the front view; the first one is exactly it.
function rest(index: number) {
  const video = videos[index]
  if (video) video.currentTime = 0
}

onMounted(() => {
  if (reduceMotion || !root.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return
      observer?.disconnect()
      props.characters.forEach((_, index) =>
        timers.push(window.setTimeout(() => play(index), 400 + index * 300)),
      )
    },
    { threshold: 0.6 },
  )
  observer.observe(root.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  timers.forEach((timer) => window.clearTimeout(timer))
})
</script>

<style lang="scss" scoped>
// The plate is the paper of the model sheets the turns are cut from (--sheet-paper, per
// edition in app.scss), a little warmer than the page, so the figures' edges fade into it
// without a seam.
.cast-lineup {
  --figure: 132px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  width: min(100%, 560px);
  margin-top: 22px;
  padding: 8px calc(var(--figure) * 0.2);
  background: var(--sheet-paper, #f8ead0);
}

.count-some {
  --figure: 112px;
}

.count-many {
  --figure: 96px;
}

// The figure stands in the middle of a square frame of paper; neighbours overlap into
// each other's empty sides, so the cast stands close together like a group.
.cast-figure {
  width: var(--figure);
  height: var(--figure);
  margin: 0 calc(var(--figure) * -0.17);
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}

.cast-figure:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.cast-figure video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  mask-image: linear-gradient(to right, transparent, #000 20%, #000 80%, transparent);
  pointer-events: none;
}

@media (max-width: 600px) {
  .cast-lineup {
    --figure: 104px;
  }

  .count-some {
    --figure: 92px;
  }

  .count-many {
    --figure: 80px;
  }
}
</style>
