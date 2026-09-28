<template>
  <q-dialog
    :model-value="modelValue"
    transition-show="fade"
    transition-hide="fade"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="character" class="character-dialog">
      <div class="frame">
        <img
          :src="showSheet && character.sheet ? character.sheet : character.image"
          :alt="character.name"
          class="character-image"
          :class="{ sheet: showSheet && character.sheet }"
        />
        <button
          type="button"
          class="icon-button close"
          :aria-label="t.close"
          @click="emit('update:modelValue', false)"
        >
          <q-icon name="close" />
        </button>
      </div>
      <div class="character-copy">
        <h2>{{ character.name }}</h2>
        <p>{{ character.description }}</p>
        <button
          v-if="character.sheet && character.sheet !== character.image"
          type="button"
          class="text-button"
          @click="showSheet = !showSheet"
        >
          <q-icon :name="showSheet ? 'person' : '360'" />
          {{ showSheet ? t.showPortrait : t.showSheet }}
        </button>
      </div>
      <div v-if="characters.length > 1" class="character-nav">
        <button type="button" class="icon-button" :aria-label="t.back" @click="step(-1)">
          <q-icon name="chevron_left" />
        </button>
        <span>{{ index + 1 }} / {{ characters.length }}</span>
        <button type="button" class="icon-button" :aria-label="t.nextPage" @click="step(1)">
          <q-icon name="chevron_right" />
        </button>
      </div>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

function step(direction: number) {
  const count = props.characters.length
  emit('update:index', (props.index + direction + count) % count)
}

watch(
  () => [props.index, props.modelValue],
  () => (showSheet.value = false),
)
</script>

<style lang="scss" scoped>
.character-dialog {
  position: relative;
  display: grid;
  gap: 18px;
  width: min(560px, 92vw);
  max-height: 92vh;
  overflow: auto;
  padding: 22px;
  border-radius: 24px;
  background: var(--card);
  color: var(--ink);
  box-shadow: var(--shadow);
}

.frame {
  position: relative;
}

.close {
  position: absolute;
  top: 10px;
  right: 10px;
  color: #fff;
  background: rgba(20, 16, 12, 0.5);
}

.close:hover {
  background: rgba(20, 16, 12, 0.7);
}

.character-image {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 18px;
  background: var(--paper-deep);
}

.character-image.sheet {
  aspect-ratio: 3 / 2;
  object-fit: contain;
}

.character-copy h2 {
  margin: 0 0 6px;
  font-size: 1.6rem;
}

.character-copy p {
  margin: 0 0 8px;
  font-family: var(--serif);
  line-height: 1.6;
  color: var(--ink-soft);
}

.character-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--ink-muted);
  font-size: 0.9rem;
}
</style>
