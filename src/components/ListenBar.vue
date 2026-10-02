<template>
  <transition name="bar-rise">
    <aside
      v-if="track"
      class="listen-bar"
      :class="editionClass"
      :lang="lang === 'en' ? 'en' : 'nb'"
    >
      <div class="seek" :style="{ '--done': `${progress * 100}%` }">
        <input
          type="range"
          min="0"
          :max="player.seconds"
          step="0.1"
          :value="player.time"
          :aria-label="t.position"
          @input="player.seek(Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div class="bar-inner">
        <button
          type="button"
          class="play-button"
          :aria-label="player.playing ? t.pause : t.play"
          @click="upNext ? continueNow() : player.toggle()"
        >
          <q-spinner v-if="player.loading" size="20px" />
          <q-icon v-else :name="player.playing ? 'pause' : 'play_arrow'" />
        </button>

        <div class="now" aria-live="polite">
          <template v-if="upNext">
            <div class="now-meta caps">{{ t.upNext }} {{ t.inSeconds(countdown) }}</div>
            <div class="now-title">{{ upNext.title }}</div>
          </template>
          <template v-else>
            <router-link :to="`/story/${track.storyId}/`" class="now-title">
              {{ track.title }}
            </router-link>
            <div class="now-meta">
              {{ clock(player.time) }} / {{ clock(player.seconds) }} ·
              {{ t.readBy(track.narration.voice)
              }}<template v-if="sleepNote"> · {{ sleepNote }}</template
              ><template v-if="player.failed"> · {{ t.audioFailed }}</template>
            </div>
          </template>
        </div>

        <div class="bar-actions">
          <template v-if="upNext">
            <button type="button" class="caps-link accent" @click="continueNow">
              {{ t.playNow }}
            </button>
            <button type="button" class="caps-link" @click="cancelNext">{{ t.cancel }}</button>
          </template>
          <template v-else>
            <button
              type="button"
              class="icon-button"
              :aria-label="t.back10"
              @click="player.skip(-10)"
            >
              <q-icon name="replay_10" />
            </button>
            <button type="button" class="icon-button" :aria-label="t.listenSettings">
              <q-icon name="tune" />
              <q-menu
                anchor="top right"
                self="bottom right"
                :offset="[0, 10]"
                :class="['listen-menu', editionClass]"
              >
                <div class="listen-panel">
                  <div class="setting">
                    <div class="caps label">{{ t.speed }}</div>
                    <div class="choice-row">
                      <button
                        v-for="speed in player.speeds"
                        :key="speed"
                        type="button"
                        class="caps-link"
                        :class="{ active: settings.listenSpeed === speed }"
                        :aria-pressed="settings.listenSpeed === speed"
                        @click="player.setSpeed(speed)"
                      >
                        {{ speedLabel(speed) }}
                      </button>
                    </div>
                  </div>
                  <div class="setting">
                    <div class="caps label">{{ t.sleep }}</div>
                    <div class="choice-row">
                      <button
                        v-for="choice in sleepChoices"
                        :key="String(choice.value)"
                        type="button"
                        class="caps-link"
                        :class="{ active: choice.active }"
                        :aria-pressed="choice.active"
                        @click="player.setSleep(choice.value)"
                      >
                        {{ choice.label }}
                      </button>
                    </div>
                  </div>
                  <div class="setting">
                    <div class="caps label">{{ t.autoContinue }}</div>
                    <div class="choice-row">
                      <button
                        type="button"
                        class="caps-link"
                        :class="{ active: settings.autoContinue }"
                        :aria-pressed="settings.autoContinue"
                        @click="settings.autoContinue = true"
                      >
                        {{ t.on }}
                      </button>
                      <button
                        type="button"
                        class="caps-link"
                        :class="{ active: !settings.autoContinue }"
                        :aria-pressed="!settings.autoContinue"
                        @click="settings.autoContinue = false"
                      >
                        {{ t.off }}
                      </button>
                    </div>
                  </div>
                </div>
              </q-menu>
            </button>
            <button type="button" class="icon-button" :aria-label="t.closePlayer" @click="close">
              <q-icon name="close" />
            </button>
          </template>
        </div>
      </div>
    </aside>
  </transition>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { artSetFor } from 'src/logic/art'
import { useText } from 'src/logic/i18n'
import { loadTrack, nextNarratedTale } from 'src/logic/listen'
import { usePlayerStore } from 'src/stores/player'
import { useSettingsStore } from 'src/stores/settings'

// The narration's controls, along the bottom of every page while a tale is read aloud. When a
// tale ends it counts down to the next narrated tale in the same edition, and if the reader is
// on the finished tale's page, turns to the next one too.
const player = usePlayerStore()
const settings = useSettingsStore()
const route = useRoute()
const router = useRouter()
const { t, lang } = useText()

const COUNTDOWN = 8

const track = computed(() => player.track)
const progress = computed(() => (player.seconds ? player.time / player.seconds : 0))
const editionClass = computed(
  () => `edition-${(track.value && artSetFor(track.value.variant)) ?? 'classic'}`,
)

function clock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

const speedLabel = (speed: number) =>
  `${String(speed).replace('.', lang.value === 'en' ? '.' : ',')}×`

// ---- sleep

const now = ref(Date.now())
const clockTimer = window.setInterval(() => (now.value = Date.now()), 15_000)
const sleepChoices = computed(() => [
  { value: null, label: t.value.sleepOff, active: !player.sleepAt && !player.sleepAfterTale },
  { value: 'tale' as const, label: t.value.sleepTale, active: player.sleepAfterTale },
  ...[15, 30, 45].map((minutes) => ({
    value: minutes,
    label: t.value.sleepMinutes(minutes),
    active: false,
  })),
])
const sleepNote = computed(() => {
  if (player.sleepAfterTale) return t.value.sleepAfter
  if (!player.sleepAt) return ''
  return t.value.sleepIn(Math.max(1, Math.ceil((player.sleepAt - now.value) / 60_000)))
})

// ---- the next tale

const upNext = ref<{ id: string; title: string } | null>(null)
const countdown = ref(COUNTDOWN)
let countdownTimer = 0

function cancelNext() {
  window.clearInterval(countdownTimer)
  upNext.value = null
}

async function continueNow() {
  const next = upNext.value
  const finished = track.value
  cancelNext()
  if (!next || !finished) return
  const nextTrack = await loadTrack(next.id, finished.variant)
  if (!nextTrack) return
  await player.load(nextTrack, { autoplay: true, at: 0 })
  if (route.path.startsWith(`/story/${finished.storyId}`)) {
    await router.push(`/story/${next.id}/`)
  }
}

async function offerNext() {
  const finished = track.value
  if (!finished) return
  const next = await nextNarratedTale(finished.storyId, finished.variant)
  if (!next || player.track !== finished) return
  upNext.value = next
  countdown.value = COUNTDOWN
  window.clearInterval(countdownTimer)
  countdownTimer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) void continueNow()
  }, 1000)
}

watch(
  () => player.ended,
  (ended) => {
    if (!ended) return cancelNext()
    // "Stop after this tale" ends the evening here.
    if (player.sleepAfterTale) return player.setSleep(null)
    if (settings.autoContinue) void offerNext()
  },
)

// The lock screen's "next" button skips the countdown, or the rest of the tale.
watch(
  () => player.nextRequests,
  async () => {
    if (!upNext.value) {
      const finished = track.value
      const next = finished && (await nextNarratedTale(finished.storyId, finished.variant))
      if (!next) return
      upNext.value = next
    }
    await continueNow()
  },
)

watch(
  () => track.value?.src,
  () => cancelNext(),
)

function close() {
  cancelNext()
  player.close()
}

// The pages leave room at the bottom for the bar.
watch(
  () => Boolean(track.value),
  (open) => document.body.classList.toggle('has-listen-bar', open),
  { immediate: true },
)

onBeforeUnmount(() => {
  window.clearInterval(countdownTimer)
  window.clearInterval(clockTimer)
})
</script>

<style lang="scss" scoped>
.listen-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  border-top: 1px solid var(--rule);
  background-color: var(--paper);
  background-image: var(--grain);
  box-shadow: 0 -10px 30px rgba(40, 28, 10, 0.08);
  padding-bottom: env(safe-area-inset-bottom);
}

// A thin line along the top edge shows how far the tale has come; it can be dragged.
.seek {
  position: absolute;
  left: 0;
  right: 0;
  top: -1px;
  height: 2px;
  background: linear-gradient(to right, var(--accent) var(--done), transparent var(--done));
}

.seek input {
  position: absolute;
  left: 0;
  right: 0;
  top: -7px;
  width: 100%;
  height: 16px;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.bar-inner {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  max-width: 980px;
  margin: 0 auto;
  padding: 10px max(16px, env(safe-area-inset-right)) 10px max(16px, env(safe-area-inset-left));
}

.play-button {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--accent);
  border-radius: 50%;
  background: none;
  color: var(--accent);
  font-size: 26px;
  cursor: pointer;
}

.play-button:hover,
.play-button:focus-visible {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.now {
  min-width: 0;
}

.now-title {
  display: block;
  overflow: hidden;
  font-style: italic;
  font-size: 1.05rem;
  line-height: 1.25;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--ink);
}

.now-meta {
  overflow: hidden;
  font-size: 0.85rem;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums lining-nums;
}

.now-meta.caps {
  font-size: 0.7rem;
  color: var(--accent);
}

.bar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bar-actions .caps-link {
  margin-left: 10px;
}

.icon-button {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--ink-soft);
  font-size: 21px;
  cursor: pointer;
}

.icon-button:hover,
.icon-button:focus-visible {
  color: var(--accent);
}

.listen-panel {
  display: grid;
  gap: 16px;
  padding: 18px 20px;
  font-family: var(--serif);
  color: var(--ink);
}

.label {
  margin-bottom: 6px;
  color: var(--ink-muted);
}

.choice-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
}

.choice-row .caps-link.active {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.35em;
}

.bar-rise-enter-active,
.bar-rise-leave-active {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.bar-rise-enter-from,
.bar-rise-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

@media (max-width: 480px) {
  .bar-inner {
    gap: 10px;
  }

  .now-title {
    font-size: 0.98rem;
  }
}
</style>

<style lang="scss">
// The menu is teleported to the body, so its frame is styled without scoping.
.listen-menu {
  border-radius: 2px !important;
  background-color: var(--paper) !important;
  background-image: var(--grain) !important;
  box-shadow:
    0 0 0 1px var(--rule),
    0 14px 40px rgba(40, 28, 10, 0.18) !important;
}

// Room for the bar under the last lines of a page.
body.has-listen-bar .q-page {
  padding-bottom: calc(72px + env(safe-area-inset-bottom));
}
</style>
