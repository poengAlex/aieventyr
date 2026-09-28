<template>
  <router-link :to="to" class="frontispiece">
    <transition name="plate-fade" mode="out-in">
      <img
        :key="src"
        class="plate"
        :src="src"
        :srcset="srcset ?? ''"
        :sizes="sizes"
        alt=""
        decoding="async"
      />
    </transition>
    <span class="caption">
      <span class="numeral">{{ numeral }}</span>
      <span class="caption-title">{{ title }}</span>
      <span v-if="note" class="caps-link accent">{{ note }} ›</span>
    </span>
  </router-link>
</template>

<script setup lang="ts">
// A tale's cover, framed like the plate facing the title page of a book.
defineProps<{
  to: string
  src: string
  srcset?: string | undefined
  sizes: string
  numeral: string
  title: string
  note?: string | undefined
}>()
</script>

<style lang="scss" scoped>
.frontispiece {
  display: grid;
  justify-items: center;
  gap: 26px;
  text-align: center;
  color: var(--ink);
}

.plate {
  width: min(100%, 460px);
  aspect-ratio: 1;
  object-fit: cover;
}

.caption {
  display: grid;
  justify-items: center;
  gap: 2px;
}

.caption-title {
  font-style: italic;
  font-size: 1.25rem;
  line-height: 1.25;
  color: var(--ink-soft);
}

.caption .caps-link {
  margin-top: 6px;
}

.plate-fade-enter-active,
.plate-fade-leave-active {
  transition: opacity 0.25s ease;
}

.plate-fade-enter-from,
.plate-fade-leave-to {
  opacity: 0;
}
</style>
