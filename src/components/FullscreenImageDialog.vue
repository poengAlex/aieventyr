<template>
  <q-dialog
    :model-value="modelValue"
    maximized
    transition-show="fade"
    transition-hide="fade"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="image-dialog">
      <q-btn
        round
        flat
        icon="close"
        class="close-button"
        aria-label="Close image"
        @click="emit('update:modelValue', false)"
      />
      <img :src="src" :alt="alt || ''" class="dialog-image" />
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
  src: string
  alt?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style lang="scss" scoped>
.image-dialog {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: grid;
  place-items: center;
  padding: 28px;
  background: rgba(16, 18, 17, 0.92);
}

.close-button {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 2;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}

.dialog-image {
  max-width: min(1200px, calc(100vw - 56px));
  max-height: calc(100vh - 56px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}
</style>
