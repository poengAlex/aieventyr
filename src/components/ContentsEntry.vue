<template>
  <router-link :to="to" class="entry" :class="{ active }">
    <span class="numeral">{{ numeral }}</span>
    <span class="entry-title"
      ><span class="entry-text"
        >{{ title
        }}<q-icon v-if="read" name="check" class="read-mark" :aria-label="readLabel ?? ''" /></span
    ></span>
    <span class="entry-minutes">{{ minutes || '' }}</span>
  </router-link>
</template>

<script setup lang="ts">
// One line of a table of contents: number, title, dotted leader and reading time.
defineProps<{
  to: string
  numeral: string
  title: string
  minutes?: number
  read?: boolean
  readLabel?: string
  active?: boolean
}>()
</script>

<style lang="scss" scoped>
.entry {
  display: grid;
  grid-template-columns: 2.7em minmax(0, 1fr) 1.8em;
  column-gap: 0.6em;
  align-items: baseline;
  padding: 0.28em 0;
  font-size: 1.28rem;
  line-height: 1.3;
  color: var(--ink);
}

.numeral {
  justify-self: end;
  font-size: 0.6em;
}

// The dots run along the last line; the title's own background hides them under the words.
.entry-title {
  position: relative;
}

.entry-title::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0.42em;
  border-bottom: 2px dotted var(--rule);
}

.entry-text {
  position: relative;
  z-index: 1;
  padding-right: 0.45em;
  background-color: var(--paper);
  background-image: var(--grain);
  transition: color 0.2s;
}

.read-mark {
  margin-left: 0.35em;
  font-size: 0.7em;
  vertical-align: 0.05em;
  color: var(--accent);
}

.entry-minutes {
  align-self: last baseline;
  justify-self: end;
  color: var(--ink-soft);
}

.entry:hover .entry-text,
.entry:focus-visible .entry-text,
.entry.active .entry-text {
  color: var(--accent);
}

.entry:focus-visible {
  outline-offset: 2px;
}

@media (max-width: 600px) {
  .entry {
    font-size: 1.16rem;
    grid-template-columns: 2.5em minmax(0, 1fr) 1.6em;
    column-gap: 0.5em;
  }
}
</style>
