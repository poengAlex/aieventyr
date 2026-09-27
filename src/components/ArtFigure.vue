<template>
  <figure class="art-figure" :class="{ large }">
    <img :src="src" :alt="picture.alt" loading="lazy" class="art-image" @click="emit('open')" />
    <figcaption class="art-caption-row">
      <span class="art-caption">{{ picture.caption }}</span>
      <button
        type="button"
        class="prompt-toggle"
        :aria-expanded="showPrompt"
        @click="showPrompt = !showPrompt"
      >
        {{ showPrompt ? 'Hide prompt' : 'How this picture was made' }}
      </button>
    </figcaption>
    <div v-if="showPrompt" class="art-prompt">
      <p>{{ picture.prompt }}</p>
      <details v-if="picture.fullPrompt">
        <summary>Full prompt sent to the image model</summary>
        <pre>{{ picture.fullPrompt }}</pre>
      </details>
    </div>
  </figure>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  picture: { id: string; caption: string; alt: string; prompt: string; fullPrompt: string | null }
  src: string
  large?: boolean
}>()

const emit = defineEmits<{ open: [] }>()

const showPrompt = ref(false)
watch(
  () => props.picture.id,
  () => (showPrompt.value = false),
)
</script>

<style lang="scss" scoped>
.art-figure {
  margin: 0;
  display: grid;
  gap: 8px;
}

.art-image {
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  border-radius: 18px;
  box-shadow: 0 12px 28px rgba(73, 56, 27, 0.12);
  cursor: zoom-in;
  background: rgba(241, 234, 220, 0.6);
}

.art-caption-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
}

.art-caption {
  font-style: italic;
  color: rgba(43, 47, 39, 0.86);
  line-height: 1.45;
}

.large .art-caption {
  font-size: 1.05rem;
}

.prompt-toggle {
  border: 0;
  padding: 0;
  background: none;
  color: rgba(47, 59, 51, 0.6);
  font-size: 0.8rem;
  text-decoration: underline dotted;
  cursor: pointer;
}

.art-prompt {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(241, 234, 220, 0.7);
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(43, 47, 39, 0.86);
}

.art-prompt p {
  margin: 0 0 6px;
}

.art-prompt pre {
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
  font-size: 0.75rem;
}
</style>
