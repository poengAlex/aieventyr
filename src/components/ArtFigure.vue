<template>
  <figure class="art-figure">
    <img
      :src="src"
      :srcset="srcset ?? ''"
      :sizes="sizes ?? ''"
      :alt="picture.alt"
      loading="lazy"
      decoding="async"
      class="art-image"
      @click="emit('open')"
    />
    <figcaption v-if="picture.caption || picture.prompt" class="art-caption-row">
      <span class="art-caption">{{ picture.caption }}</span>
      <button
        v-if="picture.prompt"
        type="button"
        class="prompt-toggle"
        :aria-expanded="showPrompt"
        :aria-label="t.howMade"
        :title="t.howMade"
        @click="showPrompt = !showPrompt"
      >
        <q-icon name="info_outline" />
      </button>
    </figcaption>
    <div v-if="showPrompt" class="art-prompt">
      <div class="eyebrow">{{ t.howMade }}</div>
      <p>{{ picture.prompt }}</p>
      <details v-if="picture.fullPrompt">
        <summary>{{ t.fullPrompt }}</summary>
        <pre>{{ picture.fullPrompt }}</pre>
      </details>
    </div>
  </figure>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useText } from 'src/logic/i18n'

const props = defineProps<{
  picture: { id: string; caption: string; alt: string; prompt: string; fullPrompt: string | null }
  src: string
  srcset?: string | undefined
  sizes?: string | undefined
}>()

const emit = defineEmits<{ open: [] }>()
const { t } = useText()

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
  gap: 10px;
}

.art-image {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  border-radius: 14px;
  background: var(--paper-deep);
  box-shadow: var(--shadow-soft);
  cursor: zoom-in;
}

.art-caption-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.art-caption {
  font-family: var(--serif);
  font-style: italic;
  font-size: 0.95rem;
  line-height: 1.45;
  color: var(--ink-soft);
}

.prompt-toggle {
  flex: none;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-muted);
  font-size: 18px;
  cursor: pointer;
}

.prompt-toggle:hover,
.prompt-toggle[aria-expanded='true'] {
  color: var(--ink);
  background: color-mix(in srgb, var(--ink) 7%, transparent);
}

.art-prompt {
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--ink) 5%, transparent);
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--ink-soft);
}

.art-prompt p {
  margin: 6px 0;
}

.art-prompt summary {
  cursor: pointer;
  color: var(--ink-muted);
}

.art-prompt pre {
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
  font-size: 0.75rem;
}
</style>
