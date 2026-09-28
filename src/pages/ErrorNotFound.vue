<template>
  <q-page class="not-found">
    <div class="ornament" aria-hidden="true"><i /></div>
    <h1>{{ t.notFound }}</h1>
    <p>{{ t.notFoundText }}</p>
    <router-link to="/" class="caps-link accent">‹ {{ t.contents }}</router-link>
  </q-page>
</template>

<script setup lang="ts">
import { useText } from 'src/logic/i18n'

const { t } = useText()
</script>

<style lang="scss" scoped>
.not-found {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 16px;
  min-height: 100vh;
  padding: 24px;
  text-align: center;
}

.not-found h1 {
  font-size: clamp(2rem, 6vw, 3rem);
}

.not-found p {
  margin: 0 0 8px;
  font-style: italic;
  font-size: 1.2rem;
  color: var(--ink-soft);
}
</style>
