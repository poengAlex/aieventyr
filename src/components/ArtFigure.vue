<template>
  <figure class="art-figure">
    <img
      :src="src"
      :srcset="srcset ?? ''"
      :sizes="sizes ?? ''"
      :alt="picture.alt"
      :style="{ aspectRatio: ratio ?? '3 / 2' }"
      loading="lazy"
      decoding="async"
      class="plate art-image"
      @click="emit('open')"
    />
    <figcaption v-if="picture.caption || picture.prompt" class="art-caption">
      {{ picture.caption }}
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
      <div class="caps">{{ t.howMade }}</div>
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
  ratio?: string | undefined
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
  text-align: center;
}

.art-image {
  width: 100%;
  object-fit: cover;
  cursor: zoom-in;
}

.art-caption {
  margin: 18px auto 0;
  max-width: 30em;
  font-style: italic;
  font-size: max(0.95rem, 0.8em);
  line-height: 1.4;
  color: var(--ink-soft);
}

.prompt-toggle {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin-left: 4px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-muted);
  font-size: 15px;
  font-style: normal;
  vertical-align: -3px;
  cursor: pointer;
}

.prompt-toggle:hover,
.prompt-toggle[aria-expanded='true'] {
  color: var(--accent);
}

.art-prompt {
  margin: 14px auto 0;
  max-width: 34em;
  padding-top: 12px;
  border-top: 1px solid var(--rule);
  text-align: left;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--ink-soft);
}

.art-prompt .caps {
  color: var(--ink-muted);
}

.art-prompt p {
  margin: 6px 0;
}

.art-prompt summary {
  cursor: pointer;
  font-style: italic;
  color: var(--ink-muted);
}

.art-prompt pre {
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
  font-size: 0.75rem;
}
</style>
