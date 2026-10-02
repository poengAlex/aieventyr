<template>
  <router-link to="/" class="site-logo" aria-label="aieventyr.no">
    <svg class="mark" viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" />
      <path :d="LETTER" />
    </svg>
    <span class="name" aria-hidden="true">aieventyr<span class="domain">.no</span></span>
  </router-link>
</template>

<script setup lang="ts">
// The site's mark beside its address. The mark is a printer's initial, an E cut out in
// paper from a block of the edition's colour; the favicons and link preview cards draw the
// same one (pipeline/lib/logo.mjs, MARK.small, which this path is copied from).
const LETTER =
  'M30.5 79.0Q29.3 79.0 28.6 78.7Q27.9 78.5 27.9 78.0Q27.9 76.9 30.8 76.4Q34.2 75.8 35.7 74.4Q37.3 73.0 37.3 69.8L37.3 30.2Q37.3 27.0 36.1 25.7Q34.8 24.4 31.4 23.8Q29.9 23.5 29.2 23.1Q28.5 22.6 28.5 22.0Q28.5 21.5 29.2 21.3Q29.9 21.0 31.1 21.0Q34.4 21.0 36.8 21.1Q39.1 21.2 41.3 21.3Q43.6 21.3 46.7 21.3Q49.6 21.3 52.8 21.3Q56.0 21.2 58.7 21.2Q61.7 21.1 63.8 21.1Q65.8 21.0 66.2 21.0Q66.6 21.0 67.2 21.2Q67.7 21.4 67.8 21.8Q68.2 24.3 68.7 26.7Q69.1 29.1 69.1 30.9Q69.1 31.7 68.7 32.0Q68.3 32.2 67.9 32.2Q67.4 32.2 67.2 32.0Q67.1 31.8 66.9 31.3Q66.5 29.8 66.0 28.5Q65.6 27.1 65.0 26.5Q63.7 25.1 62.2 24.6Q60.7 24.1 59.1 24.1L47.5 24.1Q46.8 24.1 45.6 24.9Q44.4 25.7 44.4 26.9L44.4 45.6Q44.4 46.4 44.9 47.0Q45.3 47.5 46.0 47.5L54.7 47.5Q57.2 47.5 58.2 46.6Q59.2 45.7 59.8 43.2Q60.3 41.3 61.4 41.3Q61.7 41.3 62.1 41.6Q62.5 42.0 62.5 42.7Q62.5 43.0 62.5 44.3Q62.4 45.5 62.3 46.8Q62.2 48.2 62.2 48.9Q62.2 49.7 62.3 51.2Q62.3 52.6 62.4 54.0Q62.4 55.3 62.4 55.6Q62.4 56.2 62.3 56.7Q62.1 57.1 61.6 57.1Q60.3 57.1 59.6 54.3Q59.1 52.3 58.2 51.3Q57.3 50.4 55.5 50.4L47.4 50.4Q45.9 50.4 45.1 50.7Q44.4 51.1 44.4 52.6L44.4 69.5Q44.4 72.9 45.8 74.2Q47.2 75.4 50.2 75.4L56.7 75.4Q59.5 75.4 61.4 75.1Q63.3 74.8 64.7 73.9Q66.1 73.0 67.2 71.4Q68.3 69.8 69.7 67.2Q70.0 66.6 70.3 66.3Q70.7 65.9 71.1 66.0Q71.6 66.1 71.8 66.4Q72.1 66.7 72.1 67.2Q72.1 68.0 71.6 70.0Q71.2 72 70.5 74.1Q69.9 76.2 69.4 77.5Q69.1 78.1 68.9 78.5Q68.7 79.0 68.1 79.0Q63.9 79.0 60.3 78.9Q56.7 78.8 53.4 78.7Q50.2 78.6 47.1 78.5Q43.9 78.4 40.6 78.4Q38.6 78.4 37.2 78.6Q35.8 78.7 34.3 78.8Q32.8 79.0 30.5 79.0Z'
</script>

<style lang="scss" scoped>
.site-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
}

.mark {
  flex: none;
  width: 28px;
  height: 28px;
}

.mark rect {
  fill: var(--accent);
  transition: fill 0.2s;
}

.mark path {
  fill: var(--paper);
  stroke: var(--paper);
  stroke-width: 3.2;
  stroke-linejoin: round;
}

// The address keeps the book face whatever face the reader has chosen, as a logo does.
.name {
  font-family: 'EB Garamond Variable', Garamond, serif;
  font-size: 1.4rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.005em;
  font-variant-numeric: normal;
}

.domain {
  color: var(--ink-muted);
  transition: color 0.2s;
}

.site-logo:hover .domain,
.site-logo:focus-visible .domain {
  color: var(--accent);
}

// Phones: small enough to share a line with the page's links.
@media (max-width: 419px) {
  .site-logo {
    gap: 7px;
  }

  .mark {
    width: 24px;
    height: 24px;
  }

  .name {
    font-size: 1.1rem;
  }
}
</style>
