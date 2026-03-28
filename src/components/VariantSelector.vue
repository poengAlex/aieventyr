<template>
  <div :class="compact ? 'variant-selector compact' : 'variant-selector'">
    <q-btn-toggle
      v-model="settings.variant"
      no-caps
      unelevated
      toggle-color="primary"
      color="white"
      text-color="primary"
      :options="options"
      spread
    />
    <div v-if="!compact" class="variant-note">
      {{ VARIANT_EXPLANATION[settings.variant] }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore, VARIANTS, VARIANT_EXPLANATION, VARIANT_TEXT } from 'src/stores/settings'

defineProps<{
  compact?: boolean
}>()

const settings = useSettingsStore()

const options = computed(() =>
  VARIANTS.map((variant) => ({
    label: VARIANT_TEXT[variant],
    value: variant,
  })),
)
</script>

<style lang="scss" scoped>
.variant-selector {
  display: grid;
  gap: 10px;
}

.compact :deep(.q-btn-group) {
  border-radius: 999px;
  overflow: hidden;
}

.variant-note {
  color: rgba(47, 59, 51, 0.72);
  font-size: 0.95rem;
}
</style>
