<template>
  <figure class="art-figure" :class="{ fill }">
    <plate-image
      :src="src"
      :srcset="srcset ?? ''"
      :sizes="sizes ?? ''"
      :alt="picture.alt"
      :style="{ aspectRatio: ratio ?? 1.5, '--ratio': ratio ?? 1.5 }"
      loading="lazy"
      decoding="async"
      class="art-image"
      @click="emit('open')"
    />
    <!-- No caption under the picture: what it shows and how it was made wait behind the button. -->
    <div v-if="picture.caption || picture.prompt" class="art-info">
      <button
        type="button"
        class="prompt-toggle"
        :aria-expanded="showPrompt"
        :aria-label="t.howMade"
        :title="t.howMade"
        @click="showPrompt = !showPrompt"
      >
        <q-icon name="info_outline" />
      </button>
    </div>
    <div v-if="showPrompt" class="art-prompt">
      <p v-if="picture.caption" class="art-caption">{{ picture.caption }}</p>
      <template v-if="picture.prompt">
        <div class="caps">{{ t.howMade }}</div>
        <p>{{ picture.prompt }}</p>
      </template>
      <details v-if="picture.fullPrompt">
        <summary>{{ t.fullPrompt }}</summary>
        <pre>{{ picture.fullPrompt }}</pre>
      </details>
    </div>
  </figure>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import PlateImage from 'src/components/PlateImage.vue'
import { useText } from 'src/logic/i18n'

const props = defineProps<{
  picture: { id: string; caption: string; alt: string; prompt: string; fullPrompt: string | null }
  src: string
  srcset?: string | undefined
  sizes?: string | undefined
  // Width over height.
  ratio?: number | undefined
  // Fills the height it is given: the picture grows as large as fits, and gives up room to
  // its text when the info is open.
  fill?: boolean
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
  cursor: zoom-in;
}

.fill {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

// As wide as the figure (less the frame) unless that is too tall; the width then follows
// the height through the aspect ratio.
.fill .art-image {
  flex: 0 1 calc((100cqw - 14px) / var(--ratio));
  width: auto;
  min-height: 0;
}

.fill .art-info {
  flex: none;
}

.fill .art-prompt {
  flex: none;
  width: 100%;
  max-height: 50%;
  overflow-y: auto;
}

.art-info {
  margin-top: 8px;
  line-height: 0;
}

.prompt-toggle {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-muted);
  font-size: 15px;
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

.art-prompt .art-caption {
  margin: 0 0 10px;
  font-style: italic;
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
