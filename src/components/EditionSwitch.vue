<template>
  <div class="edition-switch" :class="{ small, stacked }" role="radiogroup" :aria-label="t.edition">
    <button
      v-for="edition in editions"
      :key="edition"
      type="button"
      role="radio"
      :aria-checked="edition === modelValue"
      :class="{ active: edition === modelValue }"
      @click="emit('update:modelValue', edition)"
    >
      {{ editionName(edition) }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { EDITION_ORDER, useText } from 'src/logic/i18n'
import type { VariantType } from 'src/types/content'

const props = defineProps<{
  modelValue: VariantType
  available?: VariantType[] | undefined
  small?: boolean
  // Two by two, for narrow places like the settings menu.
  stacked?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: VariantType] }>()
const { t, editionName } = useText()

const editions = computed(() =>
  EDITION_ORDER.filter((edition) => !props.available || props.available.includes(edition)),
)
</script>

<style lang="scss" scoped>
.edition-switch {
  display: inline-flex;
  gap: 2px;
  max-width: 100%;
  padding: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
}

button {
  flex: 1 1 auto;
  padding: 8px 16px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-soft);
  font: 500 0.95rem var(--sans);
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 0.2s,
    color 0.2s,
    box-shadow 0.2s;
}

button:hover {
  color: var(--ink);
}

button.active {
  background: var(--card);
  color: var(--ink);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.small button {
  padding: 6px 12px;
  font-size: 0.85rem;
}

// One row across the screen on phones; two by two on the narrowest.
@media (max-width: 600px) {
  .edition-switch:not(.small) {
    display: flex;
  }

  button,
  .small button {
    padding: 8px 8px;
    font-size: 0.9rem;
  }
}

@media (max-width: 359px) {
  .edition-switch,
  .edition-switch:not(.small) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-radius: 20px;
  }
}

.edition-switch.stacked {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-radius: 20px;
}

.stacked button {
  border-radius: 16px;
}
</style>
