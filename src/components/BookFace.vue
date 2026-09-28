<template>
  <div class="book-face" :class="`part-${part}`">
    <div v-if="part !== 'text'" class="face-picture">
      <img :src="page.src" :alt="page.alt" draggable="false" />
    </div>
    <div v-if="part !== 'picture'" class="face-text">
      <template v-if="title">
        <h2 class="face-title">{{ title }}</h2>
        <p class="face-hint">Swipe, or tap the right side, to turn the page.</p>
      </template>
      <p v-for="(paragraph, index) in page.paragraphs" :key="index">{{ paragraph }}</p>
      <p v-if="page.caption && !page.paragraphs.length" class="face-caption">{{ page.caption }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BookPage } from 'src/logic/art'

defineProps<{
  page: BookPage
  // One page of an open book shows the picture or the text; a single page shows both.
  part: 'picture' | 'text' | 'full'
  title?: string | undefined
}>()
</script>

<style lang="scss" scoped>
.book-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #fbf6ea;
}

.face-picture {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  place-items: center;
  padding: clamp(10px, 3vh, 28px);
}

.part-full .face-picture {
  flex: 0 0 auto;
  max-height: 46%;
  padding-bottom: 0;
}

.face-picture img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(73, 56, 27, 0.16);
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
  line-height: 1.6;
  color: #2b2f27;
}

.part-text .face-text {
  display: flex;
  flex-direction: column;
  justify-content: safe center;
}

.face-text p {
  margin: 0 0 0.75em;
}

.face-title {
  margin: 0 0 0.4em;
  font-size: 1.7em;
  line-height: 1.12;
}

.face-hint {
  font-size: 0.7em;
  color: rgba(47, 59, 51, 0.6);
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
