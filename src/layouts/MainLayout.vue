<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <router-view />
    </q-page-container>
    <listen-bar />
  </q-layout>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useQuasar } from 'quasar'
import ListenBar from 'src/components/ListenBar.vue'
import { useSettingsStore } from 'src/stores/settings'

// Pages draw their own top bars, so the story page can keep its bar out of the way.
const $q = useQuasar()
const settings = useSettingsStore()

watch(
  () => settings.night,
  (night) => {
    $q.dark.set(night)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', night ? '#1a1713' : '#f3ede1')
  },
  { immediate: true },
)

watch(
  () => settings.typeface,
  (typeface) => {
    document.body.classList.toggle('classic-type', typeface === 'classic')
    document.body.classList.toggle('plain-type', typeface === 'plain')
  },
  { immediate: true },
)
</script>
