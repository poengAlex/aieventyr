<template>
  <q-layout view="lHh Lpr lFf" class="app-shell">
    <q-header class="shell-header">
      <q-toolbar class="shell-toolbar">
        <q-toolbar-title class="brand" @click="$router.push('/')">
          <div class="brand-kicker">AI Folktale Library</div>
          <div class="brand-title">Aieventyr</div>
        </q-toolbar-title>
        <div class="toolbar-actions desktop-actions">
          <q-btn flat no-caps to="/" label="Library" />
          <q-btn flat no-caps to="/settings" label="Settings" />
          <q-btn flat no-caps to="/about" label="About" />
        </div>
        <div class="toolbar-actions mobile-actions">
          <q-btn flat round icon="home" to="/" aria-label="Library" />
          <q-btn flat round icon="tune" to="/settings" aria-label="Settings" />
          <q-btn flat round icon="info" to="/about" aria-label="About" />
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts"></script>

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
  max-width: 1260px;
  margin: 0 auto;
  width: 100%;
  padding: 12px 16px;
  gap: 10px;
}

.brand {
  display: grid;
  gap: 2px;
  cursor: pointer;
  color: #2f3b33;
  min-width: 0;
  min-width: 220px;
}

.brand-kicker {
  font-size: 0.68rem;
  line-height: 1;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(73, 56, 27, 0.56);
}

.brand-title {
  font-size: 1.18rem;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: 0.01em;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.toolbar-actions :deep(.q-btn) {
  color: #2f3b33;
  border-radius: 999px;
}

.toolbar-actions :deep(.q-btn:hover) {
  background: rgba(73, 56, 27, 0.08);
}

.mobile-actions {
  display: none;
}

@media (max-width: 640px) {
  .shell-toolbar {
    padding: 10px 12px;
  }

  .brand {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .brand-kicker {
    font-size: 0.62rem;
  }

  .brand-title {
    font-size: 1rem;
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
