<template>
  <div :class="compact ? 'variant-selector compact' : 'variant-selector'">
    <div v-if="isMobile" class="variant-select-wrap">
      <div class="variant-select-label">Story version</div>
      <q-select
        v-model="settings.variant"
        :options="options"
        :display-value="selectedLabel"
        emit-value
        map-options
        outlined
        rounded
        options-dense
        dropdown-icon="expand_more"
        behavior="menu"
        class="variant-select"
      />
    </div>
    <q-btn-toggle
      v-else
      v-model="settings.variant"
      no-caps
      unelevated
      toggle-color="primary"
      color="white"
      text-color="primary"
      :options="options"
    />
    <div v-if="!compact" class="variant-note">
      {{ VARIANT_EXPLANATION[settings.variant] }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import type { VariantType } from 'src/types/content'
import { useSettingsStore, VARIANTS, VARIANT_EXPLANATION, VARIANT_TEXT } from 'src/stores/settings'

const props = defineProps<{
  compact?: boolean
  allowedVariants?: VariantType[]
}>()

const settings = useSettingsStore()
const $q = useQuasar()
const isMobile = computed(() => $q.screen.lt.md)

const options = computed(() =>
  VARIANTS.filter((variant) => !props.allowedVariants || props.allowedVariants.includes(variant)).map(
    (variant) => ({
      label: VARIANT_TEXT[variant],
      value: variant,
    }),
  ),
)

const selectedLabel = computed(() => VARIANT_TEXT[settings.variant])
</script>

<style lang="scss" scoped>
.variant-selector {
  display: grid;
  gap: 10px;
}

.variant-select-wrap {
  display: grid;
  gap: 6px;
}

.variant-select-label {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(47, 59, 51, 0.68);
}

.variant-select {
  min-width: 0;
  width: 100%;
}

.variant-select :deep(.q-field__control) {
  min-height: 50px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.84);
}

.variant-select :deep(.q-field__native),
.variant-select :deep(.q-field__marginal) {
  color: #2f3b33;
}

.variant-select :deep(.q-field__native) {
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.2;
}

.variant-select :deep(.q-field__input) {
  padding-top: 0;
}

.variant-select :deep(.q-icon) {
  font-size: 1.1rem;
}

.variant-selector :deep(.q-btn-group) {
  display: flex;
  flex-wrap: wrap;
  padding: 4px;
  border-radius: 999px;
  gap: 4px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 0 1px rgba(73, 56, 27, 0.08);
}

.variant-selector :deep(.q-btn) {
  border-radius: 999px;
  min-height: 38px;
  font-weight: 600;
  padding: 0 14px;
  flex: 0 1 auto;
}

.variant-selector :deep(.q-btn .block) {
  white-space: nowrap;
}

.variant-selector :deep(.q-btn__content) {
  font-size: clamp(0.76rem, 1.8vw, 0.92rem);
  line-height: 1.1;
}

.compact :deep(.q-btn-group) {
  border-radius: 999px;
}

.compact :deep(.q-btn) {
  min-height: 34px;
  padding: 0 12px;
}

.compact :deep(.q-btn__content) {
  font-size: clamp(0.72rem, 2.8vw, 0.84rem);
}

.variant-note {
  color: rgba(47, 59, 51, 0.72);
  font-size: 0.95rem;
}

@media (max-width: 640px) {
  .variant-note {
    font-size: 0.88rem;
  }
}
</style>
