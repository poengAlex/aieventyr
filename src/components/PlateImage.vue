<template>
  <span class="plate plate-image" :class="[frame.class, `fit-${fit}`]" :style="frame.style">
    <img v-fade-in v-bind="imageAttrs" />
  </span>
</template>

<script setup lang="ts">
import { computed, useAttrs, type StyleValue } from 'vue'
import { vFadeIn } from 'src/logic/fadeIn'

// A picture in its plate frame. The frame and a quietly pulsing paper stand in for the
// picture while it loads, and the picture fades in over them, so nothing blinks.
// Size it with a class or style: those go on the frame, everything else on the <img>.
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{ fit?: 'cover' | 'contain' }>(), { fit: 'cover' })

const attrs = useAttrs()
const frame = computed(() => ({ class: attrs.class, style: attrs.style as StyleValue }))
const imageAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})
</script>
