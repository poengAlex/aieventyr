<template>
  <q-dialog
    :model-value="modelValue"
    maximized
    transition-show="fade"
    transition-hide="fade"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="item" class="picture-viewer" :class="`edition-${item.set}`">
      <div class="stage" @click.self="close">
        <video
          v-if="item.kind === 'turns'"
          :key="item.src"
          :ref="start"
          :src="item.src"
          :aria-label="item.name"
          role="img"
          class="stage-media turn"
          muted
          loop
          playsinline
          disablepictureinpicture
        />
        <img v-else :key="item.src" v-fade-in :src="item.src" :alt="item.alt" class="stage-media" />
        <template v-if="items.length > 1">
          <button type="button" class="stage-nav prev" :aria-label="t.previous" @click="step(-1)">
            <q-icon name="chevron_left" />
          </button>
          <button type="button" class="stage-nav next" :aria-label="t.next" @click="step(1)">
            <q-icon name="chevron_right" />
          </button>
        </template>
      </div>

      <aside class="panel">
        <button type="button" class="caps-link close" @click="close">{{ t.close }}</button>
        <p class="caps kicker">{{ setName(item.set) }} · {{ t.kinds[item.kind] }}</p>
        <h2>{{ heading }}</h2>
        <router-link :to="`/story/${item.storyId}/`" class="tale-link" @click="emit('read', item)">
          <span class="numeral">{{ story?.numeral }}</span> {{ story?.title }}
        </router-link>
        <p v-if="item.caption" class="caption">{{ item.caption }}</p>
        <p v-if="item.description" class="description">{{ item.description }}</p>
        <template v-if="item.prompt">
          <div class="caps label">{{ t.howMade }}</div>
          <p class="prompt">{{ item.prompt }}</p>
        </template>
        <details v-if="item.fullPrompt">
          <summary>{{ t.fullPrompt }}</summary>
          <pre>{{ item.fullPrompt }}</pre>
        </details>
        <div class="panel-foot">
          <a :href="item.src" target="_blank" rel="noopener" class="caps-link">{{ t.openFile }}</a>
          <span class="caps count">{{ index + 1 }} / {{ items.length }}</span>
        </div>
      </aside>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useText } from 'src/logic/i18n'
import { vFadeIn } from 'src/logic/fadeIn'
import type { GalleryItem, GallerySet } from 'src/logic/gallery'

// One picture from the pictures page at full size, with what it shows and how it was made.
// The arrows, or the arrow keys, step through the pictures the page is showing.
const props = defineProps<{
  modelValue: boolean
  items: GalleryItem[]
  index: number
  stories: Record<string, { numeral: string; title: string }>
  setName: (set: GallerySet) => string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:index': [value: number]
  read: [item: GalleryItem]
}>()

const { t } = useText()
const item = computed(() => props.items[props.index] ?? null)
const story = computed(() => (item.value ? props.stories[item.value.storyId] : undefined))
const heading = computed(() => {
  const current = item.value
  if (!current) return ''
  if (current.kind === 'covers') return t.value.kinds.covers
  if (current.kind === 'scenes') return t.value.scene(current.number)
  return current.name
})

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function start(element: unknown) {
  if (!(element instanceof HTMLVideoElement) || reduceMotion) return
  element.muted = true
  element.play().catch(() => {})
}

function close() {
  emit('update:modelValue', false)
}

function step(direction: number) {
  const count = props.items.length
  if (count) emit('update:index', (props.index + direction + count) % count)
}

function onKey(event: KeyboardEvent) {
  if (!props.modelValue) return
  if (event.key === 'ArrowLeft') step(-1)
  else if (event.key === 'ArrowRight') step(1)
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style lang="scss" scoped>
// The picture on a dark stage, as in the full-screen view; what it shows on a page of
// paper beside it, or below it on narrow screens.
.picture-viewer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  width: 100vw;
  height: 100dvh;
  background: #12100e;
}

.stage {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 0;
  padding: max(20px, env(safe-area-inset-top)) 64px 20px;
}

.stage-media {
  max-width: 100%;
  max-height: calc(100dvh - 40px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 4px;
}

.stage-media.turn {
  width: min(100%, calc(100dvh - 40px), 720px);
  background: var(--sheet-paper, #f8ead0);
}

.stage-nav {
  position: absolute;
  top: 50%;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 28px;
  cursor: pointer;
  transform: translateY(-50%);
}

.stage-nav:hover {
  background: rgba(255, 255, 255, 0.24);
}

.prev {
  left: 12px;
}

.next {
  right: 12px;
}

.panel {
  position: relative;
  overflow-y: auto;
  padding: 56px 28px 22px;
  background-color: var(--paper);
  background-image: var(--grain);
  color: var(--ink);
  font-family: var(--serif);
}

.close {
  position: absolute;
  top: 16px;
  right: 24px;
}

.kicker {
  margin: 0 0 8px;
  color: var(--accent);
}

.panel h2 {
  margin: 0 0 10px;
  font-size: 1.8rem;
}

.tale-link {
  display: inline-block;
  margin-bottom: 18px;
  color: var(--ink-soft);
  text-decoration: underline;
  text-decoration-color: var(--rule);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.tale-link:hover {
  color: var(--accent);
}

.caption {
  margin: 0 0 10px;
  font-style: italic;
  font-size: 1.15rem;
}

.description {
  margin: 0 0 18px;
  color: var(--ink-soft);
  line-height: 1.5;
}

.label {
  padding-top: 14px;
  border-top: 1px solid var(--rule);
  color: var(--ink-muted);
}

.prompt {
  margin: 6px 0 12px;
  font-size: 0.95rem;
  color: var(--ink-soft);
}

details summary {
  cursor: pointer;
  font-style: italic;
  color: var(--ink-muted);
}

details pre {
  max-height: 320px;
  overflow: auto;
  white-space: pre-wrap;
  font-size: 0.75rem;
}

.panel-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid var(--rule);
}

.count {
  color: var(--ink-muted);
}

@media (max-width: 899px) {
  .picture-viewer {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .stage {
    padding: max(16px, env(safe-area-inset-top)) 12px 12px;
  }

  .stage-media {
    max-height: 100%;
  }

  .stage-media.turn {
    width: min(100%, 55dvh);
  }

  .stage-nav {
    top: auto;
    bottom: 16px;
    transform: none;
  }

  .panel {
    max-height: 42dvh;
    padding: 44px max(20px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom))
      max(20px, env(safe-area-inset-left));
  }

  .close {
    top: 12px;
    right: 20px;
  }
}
</style>
