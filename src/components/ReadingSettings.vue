<template>
  <button type="button" class="settings-button" :aria-label="t.readingSettings">
    Aa
    <q-menu anchor="bottom right" self="top right" :offset="[0, 10]" class="settings-menu">
      <div class="settings-panel">
        <div class="setting">
          <div class="caps label">{{ t.textSize }}</div>
          <div class="size-row">
            <button
              type="button"
              class="size-button small-a"
              :aria-label="t.smaller"
              @click="settings.setFontSize(settings.fontSize - 1)"
            >
              A
            </button>
            <span class="size-value">{{ settings.fontSize }}</span>
            <button
              type="button"
              class="size-button large-a"
              :aria-label="t.larger"
              @click="settings.setFontSize(settings.fontSize + 1)"
            >
              A
            </button>
          </div>
        </div>
        <div class="setting theme-row">
          <button
            type="button"
            class="caps-link"
            :class="{ active: !settings.night }"
            :aria-pressed="!settings.night"
            @click="settings.night = false"
          >
            {{ t.day }}
          </button>
          <button
            type="button"
            class="caps-link"
            :class="{ active: settings.night }"
            :aria-pressed="settings.night"
            @click="settings.night = true"
          >
            {{ t.night }}
          </button>
        </div>
        <div class="setting">
          <div class="caps label">{{ t.typeface }}</div>
          <div class="theme-row typeface-row">
            <button
              v-for="face in typefaces"
              :key="face"
              type="button"
              class="caps-link"
              :class="[`${face}-sample`, { active: settings.typeface === face }]"
              :aria-pressed="settings.typeface === face"
              @click="settings.typeface = face"
            >
              {{ typefaceNames[face] }}
            </button>
          </div>
        </div>
        <div v-if="available" class="setting">
          <div class="caps label">{{ t.edition }}</div>
          <edition-switch v-model="settings.variant" :available="available" stacked />
        </div>
      </div>
    </q-menu>
  </button>
</template>

<script setup lang="ts">
import EditionSwitch from 'src/components/EditionSwitch.vue'
import { computed } from 'vue'
import { useText } from 'src/logic/i18n'
import { useSettingsStore, type Typeface } from 'src/stores/settings'
import type { VariantType } from 'src/types/content'

defineProps<{ available?: VariantType[] | undefined }>()

const settings = useSettingsStore()
const { t } = useText()

// From the most storybook-like to the easiest to read.
const typefaces: Typeface[] = ['fairytale', 'classic', 'plain']
const typefaceNames = computed<Record<Typeface, string>>(() => ({
  fairytale: t.value.fairytaleType,
  classic: t.value.classicType,
  plain: t.value.plainType,
}))
</script>

<style lang="scss" scoped>
.settings-button {
  padding: 6px 2px 6px 10px;
  border: 0;
  background: none;
  color: var(--ink);
  font-family: var(--serif);
  font-size: 1.3rem;
  font-weight: 500;
  cursor: pointer;
}

.settings-button:hover {
  color: var(--accent);
}

.settings-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  width: min(280px, 86vw);
  padding: 6px 20px;
  color: var(--ink);
  font-family: var(--serif);
}

.setting {
  padding: 14px 0;
}

.setting + .setting {
  border-top: 1px solid var(--rule);
}

.label {
  margin-bottom: 8px;
  color: var(--ink-muted);
}

.size-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.size-button {
  width: 48px;
  height: 40px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink);
  font-family: var(--serif);
  cursor: pointer;
}

.size-button:hover {
  color: var(--accent);
}

.small-a {
  font-size: 1rem;
}

.large-a {
  font-size: 1.6rem;
}

.size-value {
  color: var(--ink-soft);
  font-variant-numeric: lining-nums tabular-nums;
}

.theme-row {
  display: flex;
  justify-content: center;
  gap: 32px;
}

.theme-row .caps-link {
  border-bottom: 1px solid transparent;
}

// Three choices spread across the panel, and wrap on the narrowest phones.
.typeface-row {
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
}

// Each typeface choice is shown in its own face.
.theme-row .fairytale-sample {
  font-family: var(--face-fairytale);
}

.theme-row .classic-sample {
  font-family: var(--face-classic);
}

.theme-row .plain-sample {
  font-family: var(--face-plain);
}

.theme-row .caps-link.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
</style>

<style lang="scss">
// The menu is teleported to the body, so it is styled without scoping.
.settings-menu {
  border-radius: 2px !important;
  background-color: var(--paper) !important;
  background-image: var(--grain) !important;
  box-shadow:
    0 0 0 1px var(--rule),
    0 14px 40px rgba(40, 28, 10, 0.18) !important;
}
</style>
