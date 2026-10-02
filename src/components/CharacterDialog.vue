<template>
  <q-dialog
    :model-value="modelValue"
    transition-show="fade"
    transition-hide="fade"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="character" class="character-dialog">
      <button
        type="button"
        class="caps-link close"
        :aria-label="t.close"
        @click="emit('update:modelValue', false)"
      >
        {{ t.close }}
      </button>
      <plate-video
        v-if="showTurn && character.turn"
        :key="character.turn"
        :src="character.turn"
        :label="character.name"
        class="character-image"
      />
      <plate-image
        v-else
        :src="showSheet && character.sheet ? character.sheet : character.image"
        :alt="character.name"
        class="character-image"
        :class="{ sheet: showSheet && character.sheet }"
        :fit="showSheet && character.sheet ? 'contain' : 'cover'"
      />
      <div class="character-copy">
        <h2>{{ character.name }}</h2>
        <p>{{ character.description }}</p>
        <button
          v-if="character.sheet && character.sheet !== character.image"
          type="button"
          class="caps-link accent"
          @click="showSheet = !showSheet"
        >
          {{ showSheet ? t.showPortrait : t.showSheet }}
        </button>
      </div>
      <div v-if="characters.length > 1" class="character-nav">
        <button type="button" class="caps-link" :aria-label="t.previous" @click="step(-1)">
          ‹ {{ t.previous }}
        </button>
        <span class="caps count">{{ index + 1 }} / {{ characters.length }}</span>
        <button type="button" class="caps-link" :aria-label="t.next" @click="step(1)">
          {{ t.next }} ›
        </button>
      </div>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PlateImage from 'src/components/PlateImage.vue'
import PlateVideo from 'src/components/PlateVideo.vue'
import { useText } from 'src/logic/i18n'
import type { CharacterCard } from 'src/types/content'

const props = defineProps<{
  modelValue: boolean
  characters: CharacterCard[]
  index: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:index': [value: number]
}>()

const { t } = useText()
const showSheet = ref(false)
const character = computed(() => props.characters[props.index] ?? null)

// "From all sides" plays the character turning when there is a turn video, except for
// readers who have asked for less motion: they get the still model sheet.
const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const showTurn = computed(() => showSheet.value && !reduceMotion)

function step(direction: number) {
  const count = props.characters.length
  emit('update:index', (props.index + direction + count) % count)
}

// A character with a turn opens turning, so it is seen without hunting for the link; the
// others open on the portrait.
watch(
  () => [props.index, props.modelValue],
  () => (showSheet.value = Boolean(character.value?.turn) && !reduceMotion),
)
</script>

<style lang="scss" scoped>
.character-dialog {
  position: relative;
  display: grid;
  // Rows keep their height (the picture's frame would otherwise let its row shrink and the
  // text slide under the picture); on a very short screen the dialog scrolls instead.
  grid-auto-rows: max-content;
  gap: 22px;
  width: min(520px, 92vw);
  max-height: 92vh;
  overflow: auto;
  padding: 52px 30px 22px;
  border-radius: 2px;
  background-color: var(--paper);
  background-image: var(--grain);
  color: var(--ink);
  font-family: var(--serif);
  box-shadow:
    0 0 0 1px var(--rule),
    0 24px 60px rgba(0, 0, 0, 0.3);
}

.close {
  position: absolute;
  top: 14px;
  right: 20px;
}

// The picture gives way on short screens, so the name, description and buttons (about
// 320px with the padding) still fit in the dialog.
.character-image {
  justify-self: center;
  width: min(100%, max(240px, calc(92vh - 320px)));
  aspect-ratio: 1;
}

.character-image.sheet {
  aspect-ratio: 3 / 2;
}

.character-copy {
  text-align: center;
}

.character-copy h2 {
  margin: 6px 0 8px;
  font-size: 1.8rem;
}

.character-copy p {
  margin: 0 auto 10px;
  max-width: 30em;
  font-style: italic;
  font-size: 1.1rem;
  line-height: 1.5;
  color: var(--ink-soft);
}

.character-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--rule);
}

.count {
  color: var(--ink-muted);
}
</style>
