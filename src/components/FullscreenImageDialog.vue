<template>
  <q-dialog
    :model-value="modelValue"
    maximized
    transition-show="fade"
    transition-hide="fade"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="image-dialog" @click.self="emit('update:modelValue', false)">
      <button
        type="button"
        class="close-button"
        :aria-label="t.close"
        @click="emit('update:modelValue', false)"
      >
        <q-icon name="close" />
      </button>
      <img v-fade-in :src="src" :alt="alt || ''" class="dialog-image" />
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { useText } from 'src/logic/i18n'
import { vFadeIn } from 'src/logic/fadeIn'

defineProps<{
  modelValue: boolean
  src: string
  alt?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { t } = useText()
</script>

<style lang="scss" scoped>
.image-dialog {
  position: relative;
  width: 100vw;
  height: 100dvh;
  display: grid;
  place-items: center;
  padding: max(16px, env(safe-area-inset-top)) 16px 16px;
  background: rgba(18, 16, 14, 0.94);
}

.close-button {
  position: absolute;
  top: max(14px, env(safe-area-inset-top));
  right: 14px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 24px;
  cursor: pointer;
}

.dialog-image {
  max-width: min(1400px, 100%);
  max-height: calc(100dvh - 32px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 12px;
}
</style>
