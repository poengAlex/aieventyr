<template>
  <div class="rotate-hint" role="dialog" :aria-label="t.turnPhone">
    <div class="rotate-card">
      <svg class="rotate-art" viewBox="0 0 160 160" aria-hidden="true">
        <!-- The arrow runs from the top of the phone to its right side: turn it clockwise. -->
        <path class="turn-arrow" d="M 96 16 A 62 62 0 0 1 140 60" />
        <path class="turn-arrow-head" d="M 131 54 L 140 61 L 145 50" />
        <g class="phone">
          <rect class="phone-body" x="52" y="24" width="56" height="104" rx="10" />
          <rect class="phone-screen" x="57" y="34" width="46" height="84" rx="3" />
          <circle class="phone-button" cx="80" cy="123" r="2.5" />
          <!-- Upright: one narrow page. -->
          <g class="screen-page">
            <rect x="63" y="42" width="34" height="24" rx="2" class="screen-picture" />
            <rect x="63" y="72" width="34" height="3" rx="1.5" class="screen-line" />
            <rect x="63" y="79" width="30" height="3" rx="1.5" class="screen-line" />
            <rect x="63" y="86" width="33" height="3" rx="1.5" class="screen-line" />
            <rect x="63" y="93" width="24" height="3" rx="1.5" class="screen-line" />
          </g>
          <!-- Sideways: an open book with a picture on the left and text on the right. -->
          <g class="screen-book" transform="rotate(-90 80 76)">
            <rect x="42" y="61" width="36" height="30" rx="2" class="screen-sheet" />
            <rect x="82" y="61" width="36" height="30" rx="2" class="screen-sheet" />
            <rect x="46" y="65" width="28" height="22" rx="2" class="screen-picture" />
            <rect x="86" y="67" width="28" height="3" rx="1.5" class="screen-line" />
            <rect x="86" y="73" width="24" height="3" rx="1.5" class="screen-line" />
            <rect x="86" y="79" width="27" height="3" rx="1.5" class="screen-line" />
          </g>
        </g>
      </svg>
      <div class="rotate-title">{{ t.turnPhone }}</div>
      <div class="rotate-text">{{ t.turnPhoneText }}</div>
      <button type="button" class="caps-link rotate-skip" @click="emit('dismiss')">
        {{ t.readUpright }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useText } from 'src/logic/i18n'

const emit = defineEmits<{ dismiss: [] }>()
const { t } = useText()
</script>

<style lang="scss" scoped>
.rotate-hint {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(28, 25, 21, 0.72);
  backdrop-filter: blur(4px);
  animation: hint-in 0.3s ease-out;
}

.rotate-card {
  display: grid;
  justify-items: center;
  gap: 6px;
  max-width: 320px;
  padding: 24px 24px 18px;
  border-radius: 2px;
  background-color: var(--paper);
  background-image: var(--grain);
  text-align: center;
  box-shadow:
    0 0 0 1px var(--rule),
    0 24px 60px rgba(0, 0, 0, 0.35);
}

.rotate-art {
  width: 150px;
  height: 150px;
}

.phone {
  transform-box: view-box;
  transform-origin: 80px 76px;
  animation: turn-phone 3.2s ease-in-out infinite;
}

.phone-body {
  fill: #1c1915;
}

.phone-screen {
  fill: #f6f0e2;
}

.phone-button {
  fill: #6b7a70;
}

.screen-picture {
  fill: var(--accent);
}

.screen-line {
  fill: #a39a88;
}

.screen-sheet {
  fill: #fffaf0;
  stroke: #d8cdb6;
  stroke-width: 1;
}

.screen-page {
  animation: show-upright 3.2s ease-in-out infinite;
}

.screen-book {
  animation: show-sideways 3.2s ease-in-out infinite;
}

.turn-arrow,
.turn-arrow-head {
  fill: none;
  stroke: var(--accent);
  stroke-width: 5;
  stroke-linecap: round;
  stroke-linejoin: round;
  animation: arrow-pulse 3.2s ease-in-out infinite;
}

.rotate-title {
  margin-top: 4px;
  font-family: var(--serif);
  font-size: 1.45rem;
  font-weight: 500;
  line-height: 1.2;
  color: var(--ink);
}

.rotate-text {
  font-style: italic;
  font-size: 1.05rem;
  color: var(--ink-soft);
}

.rotate-skip {
  margin-top: 10px;
}

// Upright for a moment, turn a quarter clockwise, hold while the book opens on the
// screen, then turn back and start again.
@keyframes turn-phone {
  0%,
  18% {
    transform: rotate(0deg);
  }
  42%,
  78% {
    transform: rotate(90deg);
  }
  100% {
    transform: rotate(0deg);
  }
}

@keyframes show-upright {
  0%,
  30% {
    opacity: 1;
  }
  40%,
  88% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes show-sideways {
  0%,
  36% {
    opacity: 0;
  }
  46%,
  80% {
    opacity: 1;
  }
  90%,
  100% {
    opacity: 0;
  }
}

@keyframes arrow-pulse {
  0%,
  12% {
    opacity: 0.2;
  }
  22%,
  40% {
    opacity: 1;
  }
  52%,
  100% {
    opacity: 0.2;
  }
}

@keyframes hint-in {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .phone,
  .screen-page,
  .screen-book,
  .turn-arrow,
  .turn-arrow-head {
    animation: none;
  }

  .phone {
    transform: rotate(90deg);
  }

  .screen-page {
    opacity: 0;
  }
}
</style>
