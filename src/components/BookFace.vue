<template>
  <div class="book-face" :class="`part-${part}`">
    <div v-if="part !== 'text'" class="face-picture">
      <img
        v-fade-in
        class="plate"
        :src="page.src"
        :srcset="page.srcset ?? ''"
        :sizes="sizes ?? (part === 'full' ? '94vw' : '50vw')"
        :alt="page.alt"
        draggable="false"
      />
    </div>
    <div v-if="part !== 'picture'" class="face-text">
      <template v-if="title">
        <h2 class="face-title">{{ title }}</h2>
        <div class="ornament" aria-hidden="true"><i /></div>
        <p class="face-hint">{{ t.swipeHint }}</p>
      </template>
      <p v-for="(paragraph, index) in page.paragraphs" :key="index">{{ paragraph }}</p>
      <p v-if="page.caption && !page.paragraphs.length" class="face-caption">{{ page.caption }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BookPage } from 'src/logic/art'
import { vFadeIn } from 'src/logic/fadeIn'
import { useText } from 'src/logic/i18n'

const { t } = useText()

defineProps<{
  page: BookPage
  // One page of an open book shows the picture or the text; a single page shows both.
  part: 'picture' | 'text' | 'full'
  // How wide the picture is drawn, when the page is not the usual half or whole of the screen.
  sizes?: string | undefined
  title?: string | undefined
}>()
</script>

<style lang="scss" scoped>
.book-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--paper);
  background-image: var(--grain);
}

.face-picture {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  place-items: center;
  padding: clamp(16px, 4vh, 36px);
}

// A page of picture alone fits the picture whole, whatever its shape: the square cover
// as well as the wide scenes. The cell takes the page's height, so the picture's
// max-height has something to measure against.
.part-picture .face-picture {
  grid-template: minmax(0, 1fr) / minmax(0, 1fr);
}

.part-full .face-picture {
  flex: 0 0 auto;
  max-height: 46%;
  padding-bottom: 0;
}

.face-picture img {
  max-width: calc(100% - 14px);
  max-height: calc(100% - 14px);
  object-fit: contain;
  -webkit-user-drag: none;
}

.part-full .face-picture img {
  max-height: 40vh;
}

.face-text {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: clamp(14px, 4vh, 40px) clamp(16px, 3.4vw, 44px);
  font-size: var(--book-font, 20px);
  line-height: 1.55;
  color: var(--ink);
  font-family: var(--serif);
}

.part-text .face-text {
  display: flex;
  flex-direction: column;
  justify-content: safe center;
}

.face-text p {
  margin: 0;
}

.face-text p + p {
  text-indent: 1.4em;
}

.face-title {
  margin: 0 0 0.6em;
  font-size: 1.8em;
  line-height: 1.1;
  text-align: center;
}

.face-hint {
  margin-top: 1.2em;
  text-align: center;
  font-style: italic;
  font-size: 0.75em;
  color: var(--ink-muted);
}

.face-caption {
  font-style: italic;
}

@media (max-height: 520px) {
  .face-text {
    font-size: min(var(--book-font, 20px), 16px);
    line-height: 1.5;
  }
}
</style>
