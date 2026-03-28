<template>
  <q-layout view="lHh Lpr lFf" class="app-shell">
    <q-header class="shell-header">
      <q-toolbar class="shell-toolbar">
        <q-toolbar-title class="brand" @click="$router.push('/')">
          Norske Folkeeventyr
        </q-toolbar-title>
        <div class="toolbar-actions desktop-actions">
          <q-btn flat no-caps to="/" label="Library" />
          <q-btn flat no-caps to="/about" label="About" />
          <q-btn flat round icon="restart_alt" @click="resetProgress" />
        </div>
        <div class="toolbar-actions mobile-actions">
          <q-btn flat round icon="home" to="/" aria-label="Library" />
          <q-btn flat round icon="info" to="/about" aria-label="About" />
          <q-btn flat round icon="restart_alt" aria-label="Reset progress" @click="resetProgress" />
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
  gap: 10px;
}

.brand {
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  color: #2f3b33;
  min-width: 0;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.toolbar-actions :deep(.q-btn) {
  color: #2f3b33;
}

.toolbar-actions :deep(.q-btn:hover) {
  background: rgba(73, 56, 27, 0.08);
}

.mobile-actions {
  display: none;
}

@media (max-width: 640px) {
  .shell-toolbar {
    padding: 8px 12px;
  }

  .brand {
    font-size: 0.98rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .desktop-actions {
    display: none;
  }

  .mobile-actions {
    display: flex;
    gap: 2px;
  }
}
</style>
