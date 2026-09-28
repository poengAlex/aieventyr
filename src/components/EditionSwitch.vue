<template>
  <div class="edition-switch" :class="{ stacked }" role="radiogroup" :aria-label="t.edition">
    <button
      v-for="edition in editions"
      :key="edition"
      type="button"
      role="radio"
      class="caps-link"
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
  // A list, for narrow places like the settings menu.
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
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 22px;
}

.caps-link {
  border-bottom: 1px solid transparent;
}

.caps-link.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.stacked {
  display: grid;
  grid-template-columns: 1fr 1fr;
  justify-items: start;
  gap: 4px 18px;
}

@media (max-width: 600px) {
  .edition-switch:not(.stacked) {
    gap: 6px 16px;
  }

  .caps-link {
    letter-spacing: 0.12em;
  }
}
</style>
