<template>
  <q-page class="settings-page">
    <div class="settings-card">
      <div class="eyebrow">Settings</div>
      <h1>Reading preferences</h1>
      <p class="intro">
        These settings apply across the app and are saved on this device.
      </p>

      <div class="settings-grid">
        <section class="settings-panel">
          <div class="panel-label">Text Size</div>
          <div class="panel-value">{{ settings.fontSize }} px</div>
          <p class="panel-copy">Adjust the story text size used in the reader.</p>
          <q-slider v-model="settings.fontSize" :min="16" :max="28" :step="1" color="primary" />
          <div class="text-preview" :style="{ fontSize: `${settings.fontSize}px` }">
            Askeladden walked farther into the forest, reading the signs as he went.
          </div>
        </section>

        <section class="settings-panel">
          <div class="panel-label">Reading Progress</div>
          <div class="panel-value">{{ readCount }}</div>
          <p class="panel-copy">
            {{ readCount === 1 ? 'variant is marked as read.' : 'variants are marked as read.' }}
          </p>
          <q-btn
            unelevated
            no-caps
            color="primary"
            label="Reset read progress"
            :disable="readCount === 0"
            @click="settings.resetProgress()"
          />
        </section>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from 'src/stores/settings'

const settings = useSettingsStore()
const readCount = computed(() => settings.readStoryIds.length)
</script>

<style lang="scss" scoped>
.settings-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.settings-card {
  background: rgba(255, 252, 244, 0.82);
  border-radius: 30px;
  padding: 28px;
  box-shadow: 0 18px 34px rgba(72, 55, 26, 0.08);
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.78rem;
  color: #7a5d30;
}

h1 {
  margin: 12px 0 12px;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1;
}

.intro {
  margin: 0 0 22px;
  color: rgba(47, 59, 51, 0.78);
  line-height: 1.6;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.settings-panel {
  display: grid;
  gap: 12px;
  padding: 20px;
  border-radius: 22px;
  background: rgba(245, 238, 223, 0.88);
  box-shadow: inset 0 0 0 1px rgba(70, 62, 42, 0.08);
}

.panel-label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(70, 62, 42, 0.62);
}

.panel-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.05;
}

.panel-copy {
  margin: 0;
  color: rgba(47, 59, 51, 0.76);
  line-height: 1.5;
}

.text-preview {
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 252, 246, 0.78);
  color: rgba(47, 59, 51, 0.84);
  line-height: 1.7;
}

@media (max-width: 820px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
