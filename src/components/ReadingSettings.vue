<template>
  <button type="button" class="icon-button settings-button" :aria-label="t.readingSettings">
    <span class="aa">Aa</span>
    <q-menu anchor="bottom right" self="top right" :offset="[0, 8]" class="settings-menu">
      <div class="settings-panel">
        <div class="setting">
          <div class="eyebrow">{{ t.textSize }}</div>
          <div class="size-row">
            <button
              type="button"
              class="size-button"
              :aria-label="t.smaller"
              @click="settings.setFontSize(settings.fontSize - 1)"
            >
              <span class="small-a">A</span>
            </button>
            <span class="size-value">{{ settings.fontSize }}</span>
            <button
              type="button"
              class="size-button"
              :aria-label="t.larger"
              @click="settings.setFontSize(settings.fontSize + 1)"
            >
              <span class="large-a">A</span>
            </button>
          </div>
        </div>
        <div class="setting">
          <div class="theme-row">
            <button
              type="button"
              class="theme-button"
              :class="{ active: !settings.night }"
              @click="settings.night = false"
            >
              <q-icon name="light_mode" /> {{ t.day }}
            </button>
            <button
              type="button"
              class="theme-button"
              :class="{ active: settings.night }"
              @click="settings.night = true"
            >
              <q-icon name="dark_mode" /> {{ t.night }}
            </button>
          </div>
        </div>
        <div v-if="available" class="setting">
          <div class="eyebrow">{{ t.edition }}</div>
          <edition-switch v-model="settings.variant" :available="available" small stacked />
        </div>
      </div>
    </q-menu>
  </button>
</template>

<script setup lang="ts">
import EditionSwitch from 'src/components/EditionSwitch.vue'
import { useText } from 'src/logic/i18n'
import { useSettingsStore } from 'src/stores/settings'
import type { VariantType } from 'src/types/content'

defineProps<{ available?: VariantType[] | undefined }>()

const settings = useSettingsStore()
const { t } = useText()
</script>

<style lang="scss" scoped>
.aa {
  font-family: var(--serif);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ink);
}

.settings-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
  width: min(300px, 86vw);
  padding: 18px;
  background: var(--card);
  color: var(--ink);
}

.setting {
  display: grid;
  gap: 8px;
}

.size-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
}

.size-button {
  width: 44px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font-family: var(--serif);
  cursor: pointer;
}

.size-button:hover {
  background: var(--raised);
}

.small-a {
  font-size: 0.85rem;
}

.large-a {
  font-size: 1.3rem;
}

.size-value {
  font-variant-numeric: tabular-nums;
  color: var(--ink-soft);
}

.theme-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.theme-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: transparent;
  color: var(--ink-soft);
  font: 500 0.88rem var(--sans);
  cursor: pointer;
}

.theme-button.active {
  border-color: var(--accent);
  color: var(--ink);
}
</style>

<style lang="scss">
// The menu is teleported to the body, so it is styled without scoping.
.settings-menu {
  border-radius: 18px !important;
  background: var(--card) !important;
  box-shadow: var(--shadow) !important;
}
</style>
