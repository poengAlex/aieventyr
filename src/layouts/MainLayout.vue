<template>
  <q-layout view="lHh Lpr lFf" class="app-shell">
    <q-header class="shell-header">
      <q-toolbar class="shell-toolbar">
        <q-toolbar-title class="brand" @click="$router.push('/')">
          Norske Folkeeventyr
        </q-toolbar-title>
        <div class="toolbar-actions">
          <q-btn flat no-caps to="/" label="Library" />
          <q-btn flat no-caps to="/about" label="About" />
          <q-btn flat round icon="restart_alt" @click="resetProgress" />
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { useSettingsStore } from 'src/stores/settings'

const settings = useSettingsStore()

function resetProgress() {
  settings.resetProgress()
}
</script>

<style lang="scss" scoped>
.app-shell {
  background:
    radial-gradient(circle at top left, rgba(244, 225, 177, 0.55), transparent 30%),
    linear-gradient(180deg, #f7f1e4 0%, #f1ecdf 100%);
}

.shell-header {
  background: rgba(250, 245, 235, 0.86);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(51, 65, 52, 0.08);
}

.shell-toolbar {
  max-width: 1180px;
  margin: 0 auto;
  width: 100%;
  padding: 10px 16px;
}

.brand {
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
