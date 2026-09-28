<template>
  <router-link :to="`/story/${storyId}`" class="story-card">
    <div class="cover-frame">
      <img
        :src="cover.src"
        :srcset="cover.srcset ?? ''"
        sizes="(max-width: 600px) 46vw, (max-width: 1100px) 30vw, 270px"
        alt=""
        loading="lazy"
        decoding="async"
      />
      <span v-if="read" class="read-mark" :title="readLabel ?? ''"><q-icon name="check" /></span>
    </div>
    <div class="card-title">{{ title }}</div>
    <div v-if="meta" class="card-meta">{{ meta }}</div>
  </router-link>
</template>

<script setup lang="ts">
defineProps<{
  storyId: string
  title: string
  cover: { src: string; srcset?: string | undefined }
  meta?: string
  read?: boolean
  readLabel?: string
}>()
</script>

<style lang="scss" scoped>
.story-card {
  display: grid;
  gap: 10px;
  align-content: start;
  color: var(--ink);
}

.cover-frame {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--paper-deep);
  box-shadow: var(--shadow-soft);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.cover-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.story-card:hover .cover-frame,
.story-card:focus-visible .cover-frame {
  transform: translateY(-3px);
  box-shadow: var(--shadow);
}

.read-mark {
  position: absolute;
  top: 10px;
  right: 10px;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--card);
  color: var(--accent);
  font-size: 18px;
  box-shadow: var(--shadow-soft);
}

.card-title {
  font-family: var(--serif);
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.25;
}

.card-meta {
  margin-top: -6px;
  font-size: 0.82rem;
  color: var(--ink-muted);
}
</style>
